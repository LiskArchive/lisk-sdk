/*
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { BaseMethod } from '../base_method';
import { BaseInteroperableMethod } from './base_interoperable_method';
import { NamedRegistry } from '../named_registry';
import { ImmutableMethodContext, MethodContext, NotFoundError } from '../../state_machine';
import { ChainAccount, ChainAccountStore, ChainStatus } from './stores/chain_account';
import { CCMsg, TerminateChainContext } from './types';
import { StoreGetter, ImmutableStoreGetter } from '../base_store';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import {
	EMPTY_BYTES,
	CHAIN_ID_MAINCHAIN,
	MAINCHAIN_ID_BUFFER,
	EMPTY_FEE_ADDRESS,
	MODULE_NAME_INTEROPERABILITY,
	CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED,
	CCMStatusCode,
} from './constants';
import { CCMSentFailedCode, CcmSentFailedEvent } from './events/ccm_send_fail';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { ccmSchema } from './schemas';
import { validateFormat } from './utils';
import { TokenMethod } from '../token';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { ChannelDataStore } from './stores/channel_data';
import { TerminatedStateStore } from './stores/terminated_state';
import { TerminatedOutboxStore } from './stores/terminated_outbox';

export abstract class BaseInteroperabilityMethod<
	T extends BaseInteroperabilityInternalMethod
> extends BaseMethod {
	protected readonly interoperableCCMethods = new Map<string, BaseInteroperableMethod>();
	protected _tokenMethod!: TokenMethod & {
		payMessageFee: (
			context: MethodContext,
			payFromAddress: Buffer,
			fee: bigint,
			receivingChainID: Buffer,
		) => Promise<void>;
	};
	protected abstract getInteroperabilityInternalMethod: (
		context: StoreGetter | ImmutableStoreGetter,
	) => T;

	public constructor(
		stores: NamedRegistry,
		events: NamedRegistry,
		interoperableCCMethods: Map<string, BaseInteroperableMethod>,
	) {
		super(stores, events);
		this.interoperableCCMethods = interoperableCCMethods;
	}

	public addDependencies(
		tokenMethod: TokenMethod & {
			// TODO: Remove this after token module update
			payMessageFee: (
				context: MethodContext,
				payFromAddress: Buffer,
				fee: bigint,
				receivingChainID: Buffer,
			) => Promise<void>;
		},
	) {
		this._tokenMethod = tokenMethod;
	}

	public async getChainAccount(
		context: ImmutableMethodContext,
		chainID: Buffer,
	): Promise<ChainAccount> {
		return this.stores.get(ChainAccountStore).get(context, chainID);
	}

	public async getChannel(context: ImmutableMethodContext, chainID: Buffer) {
		return this.stores.get(ChannelDataStore).get(context, chainID);
	}

	public async getOwnChainAccount(context: ImmutableMethodContext) {
		return this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
	}

	public async getTerminatedStateAccount(context: ImmutableMethodContext, chainID: Buffer) {
		return this.stores.get(TerminatedStateStore).get(context, chainID);
	}

	public async getTerminatedOutboxAccount(context: ImmutableMethodContext, chainID: Buffer) {
		return this.stores.get(TerminatedOutboxStore).get(context, chainID);
	}

	public async getMessageFeeTokenID(
		context: ImmutableMethodContext,
		chainID: Buffer,
	): Promise<Buffer> {
		const updatedChainID = !(await this.stores.get(ChainAccountStore).has(context, chainID))
			? MAINCHAIN_ID_BUFFER
			: chainID;
		return (await this.getChannel(context, updatedChainID)).messageFeeTokenID;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async send(
		context: MethodContext,
		sendingAddress: Buffer,
		module: string,
		crossChainCommand: string,
		receivingChainID: Buffer,
		fee: bigint,
		status: number,
		params: Buffer,
		timestamp?: number,
	): Promise<void> {
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		const ccm = {
			module,
			crossChainCommand,
			fee,
			nonce: ownChainAccount.nonce,
			params,
			receivingChainID,
			sendingChainID: ownChainAccount.chainID,
			status,
		};
		// Not possible to send messages to the own chain.
		if (receivingChainID.equals(ownChainAccount.chainID)) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.INVALID_RECEIVING_CHAIN,
				},
				true,
			);
			throw new Error('Sending chain cannot be the receiving chain.');
		}

		// Validate ccm size.
		try {
			validateFormat(ccm);
		} catch (error) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.INVALID_FORMAT,
				},
				true,
			);

			throw new Error('Invalid CCM format.');
		}
		// From now on, we can assume that the ccm is valid.

		// receivingChainID must correspond to a live chain.
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		const isReceivingChainLive = await interoperabilityInternalMethod.isLive(
			receivingChainID,
			timestamp ?? Date.now(),
		);
		if (!isReceivingChainLive) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.CHANNEL_UNAVAILABLE,
				},
				true,
			);

			throw new Error('Receiving chain is not live.');
		}

		let receivingChainAccount: ChainAccount | undefined;
		try {
			receivingChainAccount = await this.stores
				.get(ChainAccountStore)
				.get(context, receivingChainID);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		let partnerChainID: Buffer;
		// Processing on the mainchain.
		if (ownChainAccount.chainID.equals(CHAIN_ID_MAINCHAIN)) {
			partnerChainID = receivingChainID;
		} else {
			// Processing on a sidechain.
			// eslint-disable-next-line no-lonely-if
			if (!receivingChainAccount) {
				partnerChainID = CHAIN_ID_MAINCHAIN;
			} else {
				partnerChainID = receivingChainID;
			}
		}

		// partnerChainID must correspond to an active chain (in this case, not registered).
		if (receivingChainAccount && receivingChainAccount.status !== ChainStatus.ACTIVE) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.CHANNEL_UNAVAILABLE,
				},
				true,
			);

			throw new Error('Receiving chain is not active.');
		}

		// Pay message fee.
		if (fee > 0) {
			try {
				// eslint-disable-next-line no-lonely-if
				await this._tokenMethod.payMessageFee(context, sendingAddress, fee, partnerChainID);
			} catch (error) {
				this.events.get(CcmSentFailedEvent).log(
					context,
					{
						ccm: { ...ccm, params: EMPTY_BYTES },
						code: CCMSentFailedCode.MESSAGE_FEE_EXCEPTION,
					},
					true,
				);

				throw new Error('Failed to pay message fee.');
			}
		}

		const ccmID = utils.hash(codec.encode(ccmSchema, ccm));
		await interoperabilityInternalMethod.addToOutbox(partnerChainID, ccm);
		ownChainAccount.nonce += BigInt(1);
		await this.stores.get(OwnChainAccountStore).set(context, EMPTY_BYTES, ownChainAccount);

		// Emit CCM Processed Event.
		this.events
			.get(CcmSendSuccessEvent)
			.log(context, ccm.sendingChainID, ccm.receivingChainID, ccmID, { ccmID });
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async error(_methodContext: MethodContext, _ccm: CCMsg, _code: number): Promise<void> {
		throw new Error('Need to be implemented');
	}

	public async terminateChain(context: TerminateChainContext, chainID: Buffer): Promise<void> {
		if (await this.getTerminatedStateAccount(context, chainID)) {
			return;
		}

		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		await interoperabilityInternalMethod.sendInternal({
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED,
			receivingChainID: chainID,
			fee: BigInt(0),
			status: CCMStatusCode.OK,
			params: EMPTY_BYTES,
			eventQueue: context.eventQueue,
			feeAddress: EMPTY_FEE_ADDRESS,
			getMethodContext: context.getMethodContext,
			getStore: context.getStore,
			logger: context.logger,
			chainID: context.chainID,
		});

		await interoperabilityInternalMethod.createTerminatedStateAccount(context, chainID);
	}
}
