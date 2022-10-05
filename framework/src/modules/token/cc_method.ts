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
import { BaseInteroperableMethod } from '../interoperability/base_interoperable_method';
import {
	BeforeApplyCCMsgMethodContext,
	BeforeRecoverCCMsgMethodContext,
	BeforeSendCCMsgMethodContext,
	RecoverCCMsgMethodContext,
} from '../interoperability/types';
import { NamedRegistry } from '../named_registry';
import { TokenMethod } from './method';
import {
	ADDRESS_LENGTH,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	TokenEventResult,
	TOKEN_ID_LENGTH,
} from './constants';

import {
	CCForwardMessageParams,
	crossChainForwardMessageParams,
	UserStoreData,
	userStoreSchema,
} from './schemas';
import { EscrowStore } from './stores/escrow';
import { UserStore } from './stores/user';
import { InteroperabilityMethod } from './types';
import { BeforeCCCExecutionEvent } from './events/before_ccc_execution';
import { RecoverEvent } from './events/recover';
import { EMPTY_BYTES } from '../interoperability/constants';
import { BeforeCCMForwardingEvent } from './events/before_ccm_forwarding';
import { MODULE_NAME_TOKEN } from '../interoperability/cc_methods';

const CHAIN_ID_ALIAS_NATIVE = Buffer.alloc(0); // To be removed

export class TokenInteroperableMethod extends BaseInteroperableMethod {
	private readonly _tokenMethod: TokenMethod;

	private _interopMethod!: InteroperabilityMethod;

	public constructor(stores: NamedRegistry, events: NamedRegistry, tokenMethod: TokenMethod) {
		super(stores, events);
		this._tokenMethod = tokenMethod;
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod) {
		this._interopMethod = interoperabilityMethod;
	}

	public async beforeCrossChainCommandExecution(ctx: BeforeApplyCCMsgMethodContext): Promise<void> {
		const { trsSender, ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const relayerAddress = trsSender;
		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		const { messageFeeTokenID } = await this._interopMethod.getChannel(
			methodContext,
			ccm.sendingChainID,
		);
		const { chainID: feeTokenChainID, localID: feeTokenLocalID } = messageFeeTokenID;
		const userStore = this.stores.get(UserStore);

		if (feeTokenChainID.equals(ownChainID)) {
			const escrowedAmount = await this._tokenMethod.getEscrowedAmount(
				methodContext,
				ccm.sendingChainID,
				feeTokenLocalID,
			);
			if (escrowedAmount < ccm.fee) {
				this.events.get(BeforeCCCExecutionEvent).error(
					methodContext,
					{
						sendingChainID: ccm.sendingChainID,
						receivingChainID: ccm.receivingChainID,
						messageFeeTokenID: feeTokenLocalID,
						messageFee: ccm.fee,
						relayerAddress,
					},
					TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
				);

				throw new Error('Insufficient balance in the sending chain for the message fee.');
			}

			const escrowStore = this.stores.get(EscrowStore);
			await escrowStore.deductEscrowAmountWithTerminate(
				methodContext,
				this._interopMethod,
				ccm.sendingChainID,
				feeTokenLocalID,
				ccm.fee,
			);
		}

		await userStore.addAvailableBalanceWithCreate(
			methodContext,
			ctx.trsSender,
			feeTokenLocalID,
			ccm.fee,
		);

		this.events.get(BeforeCCCExecutionEvent).log(methodContext, {
			sendingChainID: ccm.sendingChainID,
			receivingChainID: ccm.receivingChainID,
			messageFeeTokenID: feeTokenLocalID,
			messageFee: ccm.fee,
			relayerAddress,
		});
	}

	public async beforeCrossChainMessageForwarding(
		ctx: BeforeRecoverCCMsgMethodContext,
	): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		const { messageFeeTokenID } = await this._interopMethod.getChannel(
			methodContext,
			ccm.sendingChainID,
		);
		const { chainID: feeTokenChainID, localID: feeTokenLocalID } = messageFeeTokenID;

		const escrowedAmount = await this._tokenMethod.getEscrowedAmount(
			methodContext,
			ccm.sendingChainID,
			feeTokenLocalID,
		);
		if (escrowedAmount < ccm.fee) {
			this.events.get(BeforeCCMForwardingEvent).error(
				methodContext,
				{
					sendingChainID: ccm.sendingChainID,
					receivingChainID: ccm.receivingChainID,
					messageFeeTokenID: feeTokenLocalID,
					messageFee: ccm.fee,
				},
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);

			throw new Error('Insufficient balance in the sending chain for the message fee.');
		}

		const escrowStore = this.stores.get(EscrowStore);
		await escrowStore.deductEscrowAmountWithTerminate(
			methodContext,
			this._interopMethod,
			ccm.sendingChainID,
			feeTokenLocalID,
			ccm.fee,
		);
		await escrowStore.addAmount(methodContext, ccm.receivingChainID, feeTokenLocalID, ccm.fee);

		const decodedParams = codec.decode<CCForwardMessageParams>(
			crossChainForwardMessageParams,
			ccm.params,
		);

		if (
			ccm.module === MODULE_NAME_TOKEN &&
			ccm.crossChainCommand === CROSS_CHAIN_COMMAND_NAME_TRANSFER &&
			feeTokenChainID === ownChainID
		) {
			if (escrowedAmount < decodedParams.amount) {
				this.events.get(BeforeCCMForwardingEvent).error(
					methodContext,
					{
						sendingChainID: ccm.sendingChainID,
						receivingChainID: ccm.receivingChainID,
						messageFeeTokenID: feeTokenLocalID,
						messageFee: ccm.fee,
					},
					TokenEventResult.INSUFFICIENT_ESCROW_BALANCE,
				);

				throw new Error('Insufficient balance in the sending chain for the transfer.');
			}

			await escrowStore.deductEscrowAmountWithTerminate(
				methodContext,
				this._interopMethod,
				ccm.sendingChainID,
				feeTokenLocalID,
				decodedParams.amount,
			);
			await escrowStore.addAmount(
				methodContext,
				ccm.receivingChainID,
				feeTokenLocalID,
				decodedParams.amount,
			);

			this.events.get(BeforeCCMForwardingEvent).log(methodContext, {
				sendingChainID: ccm.sendingChainID,
				receivingChainID: ccm.receivingChainID,
				messageFeeTokenID: feeTokenLocalID,
				messageFee: ccm.fee,
			});
		}
	}

	public async verifyCrossChainMessage(ctx: BeforeSendCCMsgMethodContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		if (ccm.fee < BigInt(0)) {
			throw new Error('Fee must be greater or equal to zero.');
		}
		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		const { messageFeeTokenID } = await this._interopMethod.getChannel(
			methodContext,
			ccm.sendingChainID,
		);
		const { chainID: feeTokenChainID, localID: feeTokenLocalID } = messageFeeTokenID;
		if (feeTokenChainID.equals(ownChainID)) {
			const escrowedAmount = await this._tokenMethod.getEscrowedAmount(
				methodContext,
				ccm.sendingChainID,
				feeTokenLocalID,
			);
			if (escrowedAmount < ccm.fee) {
				throw new Error('Insufficient escrow amount.');
			}
		}
	}

	public async recover(ctx: RecoverCCMsgMethodContext): Promise<void> {
		const methodContext = ctx.getMethodContext();
		const userStore = this.stores.get(UserStore);
		const address = ctx.storeKey.slice(0, ADDRESS_LENGTH);
		let account: UserStoreData;
		let decodingFailed = false;
		try {
			account = codec.decode<UserStoreData>(userStoreSchema, ctx.storeValue);
		} catch (error) {
			decodingFailed = true;
		}
		if (
			!ctx.storePrefix.equals(userStore.subStorePrefix) ||
			ctx.storeKey.length !== ADDRESS_LENGTH + TOKEN_ID_LENGTH ||
			decodingFailed
		) {
			this.events
				.get(RecoverEvent)
				.error(
					methodContext,
					address,
					{ terminatedChainID: ctx.terminatedChainID, tokenID: EMPTY_BYTES, amount: BigInt(0) },
					TokenEventResult.RECOVER_FAIL_INVALID_INPUTS,
				);

			throw new Error('Invalid arguments.');
		}

		const chainID = ctx.storeKey.slice(ADDRESS_LENGTH, ADDRESS_LENGTH + CHAIN_ID_LENGTH);
		const tokenID = ctx.storeKey.slice(ADDRESS_LENGTH, ADDRESS_LENGTH + TOKEN_ID_LENGTH);
		const localID = ctx.storeKey.slice(ADDRESS_LENGTH + CHAIN_ID_LENGTH);
		const totalAmount =
			account!.availableBalance +
			account!.lockedBalances.reduce((prev, curr) => prev + curr.amount, BigInt(0));

		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		const escrowStore = this.stores.get(EscrowStore);
		const escrowKey = Buffer.concat([ctx.terminatedChainID, localID]);
		const escrowData = await escrowStore.get(ctx, escrowKey);

		if (!ownChainID.equals(chainID) || escrowData.amount < totalAmount) {
			this.events
				.get(RecoverEvent)
				.error(
					methodContext,
					address,
					{ terminatedChainID: ctx.terminatedChainID, tokenID, amount: totalAmount },
					TokenEventResult.RECOVER_FAIL_INSUFFICIENT_ESCROW,
				);

			throw new Error('Insufficient escrow amount.');
		}

		escrowData.amount -= totalAmount;
		await escrowStore.set(ctx, escrowKey, escrowData);

		const localTokenID = Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]);
		await userStore.addAvailableBalanceWithCreate(
			methodContext,
			address,
			localTokenID,
			totalAmount,
		);

		this.events.get(RecoverEvent).log(methodContext, address, {
			terminatedChainID: ctx.terminatedChainID,
			tokenID,
			amount: totalAmount,
		});
	}
}
