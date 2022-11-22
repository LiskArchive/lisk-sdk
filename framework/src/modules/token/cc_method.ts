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
import { BaseCCMethod } from '../interoperability/base_cc_method';
import { CrossChainMessageContext, RecoverContext } from '../interoperability/types';
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
import { splitTokenID } from './utils';

export class TokenInteroperableMethod extends BaseCCMethod {
	private _ownChainID!: Buffer;

	private _interopMethod!: InteroperabilityMethod;

	public init(ownChainID: Buffer): void {
		this._ownChainID = ownChainID;
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod) {
		this._interopMethod = interoperabilityMethod;
	}

	public async beforeCrossChainCommandExecution(ctx: CrossChainMessageContext): Promise<void> {
		const {
			transaction: { senderAddress: relayerAddress },
			ccm,
		} = ctx;
		const methodContext = ctx.getMethodContext();
		const tokenID = await this._interopMethod.getMessageFeeTokenID(
			methodContext,
			ccm.sendingChainID,
		);
		const [chainID] = splitTokenID(tokenID);
		const userStore = this.stores.get(UserStore);

		if (chainID.equals(this._ownChainID)) {
			const escrowStore = this.stores.get(EscrowStore);
			const escrowKey = escrowStore.getKey(ccm.sendingChainID, tokenID);
			const escrowAccount = await escrowStore.getOrDefault(methodContext, escrowKey);

			if (escrowAccount.amount < ccm.fee) {
				this.events.get(BeforeCCCExecutionEvent).error(
					methodContext,
					{
						sendingChainID: ccm.sendingChainID,
						receivingChainID: ccm.receivingChainID,
						messageFeeTokenID: tokenID,
						messageFee: ccm.fee,
						relayerAddress,
					},
					TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
				);

				throw new Error('Insufficient balance in the sending chain for the message fee.');
			}

			escrowAccount.amount -= ccm.fee;
			await escrowStore.set(methodContext, escrowKey, escrowAccount);
		}

		await userStore.addAvailableBalance(methodContext, relayerAddress, tokenID, ccm.fee);

		this.events.get(BeforeCCCExecutionEvent).log(methodContext, {
			sendingChainID: ccm.sendingChainID,
			receivingChainID: ccm.receivingChainID,
			messageFeeTokenID: tokenID,
			messageFee: ccm.fee,
			relayerAddress,
		});
	}

	public async beforeCrossChainMessageForwarding(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const tokenID = await this._interopMethod.getMessageFeeTokenID(
			methodContext,
			ccm.sendingChainID,
		);
		const [chainID] = splitTokenID(tokenID);

		const escrowStore = this.stores.get(EscrowStore);
		const escrowKey = escrowStore.getKey(ccm.sendingChainID, tokenID);
		const escrowAccount = await escrowStore.getOrDefault(methodContext, escrowKey);
		if (escrowAccount.amount < ccm.fee) {
			this.events.get(BeforeCCMForwardingEvent).error(
				methodContext,
				{
					sendingChainID: ccm.sendingChainID,
					receivingChainID: ccm.receivingChainID,
					messageFeeTokenID: tokenID,
					messageFee: ccm.fee,
				},
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);

			throw new Error('Insufficient balance in the sending chain for the message fee.');
		}

		escrowAccount.amount -= ccm.fee;
		await escrowStore.set(methodContext, escrowKey, escrowAccount);

		await escrowStore.addAmount(methodContext, ccm.receivingChainID, tokenID, ccm.fee);

		if (
			ccm.module === MODULE_NAME_TOKEN &&
			ccm.crossChainCommand === CROSS_CHAIN_COMMAND_NAME_TRANSFER &&
			chainID.equals(this._ownChainID)
		) {
			const decodedParams = codec.decode<CCForwardMessageParams>(
				crossChainForwardMessageParams,
				ccm.params,
			);
			const updatedEscrowAccount = await escrowStore.get(methodContext, escrowKey);
			if (updatedEscrowAccount.amount < decodedParams.amount) {
				this.events.get(BeforeCCMForwardingEvent).error(
					methodContext,
					{
						sendingChainID: ccm.sendingChainID,
						receivingChainID: ccm.receivingChainID,
						messageFeeTokenID: tokenID,
						messageFee: ccm.fee,
					},
					TokenEventResult.INSUFFICIENT_ESCROW_BALANCE,
				);

				throw new Error('Insufficient balance in the sending chain for the transfer.');
			}

			updatedEscrowAccount.amount -= decodedParams.amount;
			await escrowStore.set(methodContext, escrowKey, updatedEscrowAccount);

			await escrowStore.addAmount(
				methodContext,
				ccm.receivingChainID,
				tokenID,
				decodedParams.amount,
			);

			this.events.get(BeforeCCMForwardingEvent).log(methodContext, {
				sendingChainID: ccm.sendingChainID,
				receivingChainID: ccm.receivingChainID,
				messageFeeTokenID: tokenID,
				messageFee: ccm.fee,
			});
		}
	}

	public async verifyCrossChainMessage(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const tokenID = await this._interopMethod.getMessageFeeTokenID(
			methodContext,
			ccm.sendingChainID,
		);
		const [chainID] = splitTokenID(tokenID);
		if (chainID.equals(this._ownChainID)) {
			const escrowStore = this.stores.get(EscrowStore);
			const escrowAccount = await escrowStore.getOrDefault(
				methodContext,
				escrowStore.getKey(ccm.sendingChainID, tokenID),
			);

			if (escrowAccount.amount < ccm.fee) {
				throw new Error('Insufficient escrow amount.');
			}
		}
	}

	public async recover(ctx: RecoverContext): Promise<void> {
		const methodContext = ctx.getMethodContext();
		const userStore = this.stores.get(UserStore);
		const address = ctx.storeKey.slice(0, ADDRESS_LENGTH);
		let account: UserStoreData;

		if (
			!ctx.substorePrefix.equals(userStore.subStorePrefix) ||
			ctx.storeKey.length !== ADDRESS_LENGTH + TOKEN_ID_LENGTH
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

		try {
			account = codec.decode<UserStoreData>(userStoreSchema, ctx.storeValue);
		} catch (error) {
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
		const totalAmount =
			account.availableBalance +
			account.lockedBalances.reduce((prev, curr) => prev + curr.amount, BigInt(0));

		const escrowStore = this.stores.get(EscrowStore);
		const escrowKey = escrowStore.getKey(ctx.terminatedChainID, tokenID);
		const escrowData = await escrowStore.getOrDefault(methodContext, escrowKey);

		if (!this._ownChainID.equals(chainID) || escrowData.amount < totalAmount) {
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
		await escrowStore.set(methodContext, escrowKey, escrowData);

		await userStore.addAvailableBalance(methodContext, address, tokenID, totalAmount);

		this.events.get(RecoverEvent).log(methodContext, address, {
			terminatedChainID: ctx.terminatedChainID,
			tokenID,
			amount: totalAmount,
		});
	}
}
