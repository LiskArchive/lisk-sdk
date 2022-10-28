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
import { ChainAccount, ChainAccountStore } from './stores/chain_account';
import { CCMsg } from './types';
import { StoreGetter, ImmutableStoreGetter } from '../base_store';
import { BaseInteroperabilityStore } from './base_interoperability_store';
import {
	EMPTY_BYTES,
	CHAIN_ID_MAINCHAIN,
	CHAIN_ACTIVE,
	CCM_SENT_FAILED_CODE,
	MAINCHAIN_ID_BUFFER,
} from './constants';
import { CcmSendFailEvent } from './events/ccm_send_fail';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { ccmSchema } from './schemas';
import { validateFormat } from './utils';
import { TokenMethod } from '../token';
import { OwnChainAccountStore } from './stores/own_chain_account';

export abstract class BaseInteroperabilityMethod<
	T extends BaseInteroperabilityStore
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
	protected abstract getInteroperabilityStore: (context: StoreGetter | ImmutableStoreGetter) => T;

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
		return this.getInteroperabilityStore(context).getChainAccount(chainID);
	}

	public async getChannel(context: ImmutableMethodContext, chainID: Buffer) {
		return this.getInteroperabilityStore(context).getChannel(chainID);
	}

	public async getOwnChainAccount(context: ImmutableMethodContext) {
		return this.getInteroperabilityStore(context).getOwnChainAccount();
	}

	public async getTerminatedStateAccount(context: ImmutableMethodContext, chainID: Buffer) {
		return this.getInteroperabilityStore(context).getTerminatedStateAccount(chainID);
	}

	public async getTerminatedOutboxAccount(context: ImmutableMethodContext, chainID: Buffer) {
		return this.getInteroperabilityStore(context).getTerminatedOutboxAccount(chainID);
	}

	public async getMessageFeeTokenID(
		context: ImmutableMethodContext,
		chainID: Buffer,
	): Promise<Buffer> {
		const updatedChainID = !(await this.getInteroperabilityStore(context).hasChainAccount(chainID))
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
			this.events.get(CcmSendFailEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCM_SENT_FAILED_CODE.INVALID_RECEIVING_CHAIN,
				},
				true,
			);
			throw new Error('Sending chain cannot be the receiving chain.');
		}

		// Validate ccm size.
		try {
			validateFormat(ccm);
		} catch (error) {
			this.events.get(CcmSendFailEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCM_SENT_FAILED_CODE.INVALID_FORMAT,
				},
				true,
			);

			throw new Error('Invalid CCM format.');
		}
		// From now on, we can assume that the ccm is valid.

		// receivingChainID must correspond to a live chain.
		const interoperabilityStore = this.getInteroperabilityStore(context);
		const isReceivingChainLive = await interoperabilityStore.isLive(
			receivingChainID,
			timestamp ?? Date.now(),
		);
		if (!isReceivingChainLive) {
			this.events.get(CcmSendFailEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCM_SENT_FAILED_CODE.CHANNEL_UNAVAILABLE,
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
		if (receivingChainAccount && receivingChainAccount.status !== CHAIN_ACTIVE) {
			this.events.get(CcmSendFailEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCM_SENT_FAILED_CODE.CHANNEL_UNAVAILABLE,
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
				this.events.get(CcmSendFailEvent).log(
					context,
					{
						ccm: { ...ccm, params: EMPTY_BYTES },
						code: CCM_SENT_FAILED_CODE.MESSAGE_FEE_EXCEPTION,
					},
					true,
				);

				throw new Error('Failed to pay message fee.');
			}
		}

		const ccmID = utils.hash(codec.encode(ccmSchema, ccm));
		await interoperabilityStore.addToOutbox(partnerChainID, ccm);
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

	// eslint-disable-next-line @typescript-eslint/require-await
	public async terminateChain(_methodContext: MethodContext, _chainID: Buffer): Promise<void> {
		throw new Error('Need to be implemented');
	}
}
