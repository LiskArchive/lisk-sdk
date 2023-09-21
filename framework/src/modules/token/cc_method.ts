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
import {
	BeforeCCMForwardingContext,
	CrossChainMessageContext,
	RecoverContext,
} from '../interoperability/types';
import { ADDRESS_LENGTH, CHAIN_ID_LENGTH, TokenEventResult, TOKEN_ID_LENGTH } from './constants';
import { EscrowStore } from './stores/escrow';
import { UserStore, UserStoreData, userStoreSchema } from './stores/user';
import { InteroperabilityMethod } from './types';
import { BeforeCCCExecutionEvent } from './events/before_ccc_execution';
import { RecoverEvent } from './events/recover';
import { EMPTY_BYTES } from '../interoperability/constants';
import { BeforeCCMForwardingEvent } from './events/before_ccm_forwarding';
import { splitTokenID } from './utils';
import { getEncodedCCMAndID, getTokenIDLSK } from '../interoperability/utils';
import { InternalMethod } from './internal_method';

export class TokenInteroperableMethod extends BaseCCMethod {
	private _interopMethod!: InteroperabilityMethod;
	private _internalMethod!: InternalMethod;

	public addDependencies(
		interoperabilityMethod: InteroperabilityMethod,
		internalMethod: InternalMethod,
	) {
		this._interopMethod = interoperabilityMethod;
		this._internalMethod = internalMethod;
	}

	public async beforeCrossChainCommandExecute(ctx: CrossChainMessageContext): Promise<void> {
		const {
			transaction: { senderAddress: relayerAddress },
			ccm,
		} = ctx;
		const methodContext = ctx.getMethodContext();
		const tokenID = await this._interopMethod.getMessageFeeTokenIDFromCCM(methodContext, ccm);
		const { ccmID } = getEncodedCCMAndID(ccm);
		const [chainID] = splitTokenID(tokenID);
		const userStore = this.stores.get(UserStore);

		if (chainID.equals(ctx.chainID)) {
			const escrowStore = this.stores.get(EscrowStore);
			const escrowKey = escrowStore.getKey(ccm.sendingChainID, tokenID);
			const escrowAccount = await escrowStore.getOrDefault(methodContext, escrowKey);

			if (escrowAccount.amount < ccm.fee) {
				this.events.get(BeforeCCCExecutionEvent).error(
					methodContext,
					{
						ccmID,
						messageFeeTokenID: tokenID,
						relayerAddress,
					},
					TokenEventResult.INSUFFICIENT_ESCROW_BALANCE,
				);

				throw new Error('Insufficient balance in the sending chain for the message fee.');
			}

			escrowAccount.amount -= ccm.fee;
			await escrowStore.set(methodContext, escrowKey, escrowAccount);
		}

		await userStore.addAvailableBalance(methodContext, relayerAddress, tokenID, ccm.fee);

		this.events.get(BeforeCCCExecutionEvent).log(methodContext, {
			ccmID,
			messageFeeTokenID: tokenID,
			relayerAddress,
		});
	}

	public async beforeCrossChainMessageForwarding(ctx: BeforeCCMForwardingContext): Promise<void> {
		const {
			transaction: { senderAddress: relayerAddress },
			ccm,
			ccmFailed,
		} = ctx;
		const { ccmID } = getEncodedCCMAndID(ccm);
		const methodContext = ctx.getMethodContext();
		const messageFeeTokenID = await this._interopMethod.getMessageFeeTokenIDFromCCM(
			methodContext,
			ccm,
		);

		if (!messageFeeTokenID.equals(getTokenIDLSK(ctx.chainID))) {
			throw new Error('Message fee token should be LSK.');
		}

		const escrowStore = this.stores.get(EscrowStore);
		if (ccm.fee > 0) {
			const sendingChainEscrowKey = escrowStore.getKey(ccm.sendingChainID, messageFeeTokenID);
			const sendingChainEscrowAccount = await escrowStore.getOrDefault(
				methodContext,
				sendingChainEscrowKey,
			);
			if (sendingChainEscrowAccount.amount < ccm.fee) {
				this.events.get(BeforeCCMForwardingEvent).error(
					methodContext,
					ccm.sendingChainID,
					ccm.receivingChainID,
					{
						ccmID,
						messageFeeTokenID,
					},
					TokenEventResult.INSUFFICIENT_ESCROW_BALANCE,
				);

				throw new Error('Insufficient balance in the sending chain for the message fee.');
			}
			// Deduct the fee from escrow of the sending chain.
			sendingChainEscrowAccount.amount -= ccm.fee;
			await escrowStore.set(methodContext, sendingChainEscrowKey, sendingChainEscrowAccount);

			// If the ccm forwarding failed, we credit relayer.
			if (ccmFailed) {
				const userStore = this.stores.get(UserStore);
				await userStore.addAvailableBalance(
					methodContext,
					relayerAddress,
					messageFeeTokenID,
					ccm.fee,
				);
			}
			// Otherwise we update the escrow of the receiving chain.
			else {
				const receivingChainEscrowKey = escrowStore.getKey(ccm.receivingChainID, messageFeeTokenID);
				const receivingChainEscrowAccount = await escrowStore.getOrDefault(
					methodContext,
					receivingChainEscrowKey,
				);
				receivingChainEscrowAccount.amount += ccm.fee;
				await escrowStore.set(methodContext, receivingChainEscrowKey, receivingChainEscrowAccount);
			}
		}

		this.events
			.get(BeforeCCMForwardingEvent)
			.log(methodContext, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				messageFeeTokenID,
			});
	}

	public async verifyCrossChainMessage(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const tokenID = await this._interopMethod.getMessageFeeTokenIDFromCCM(methodContext, ccm);
		const [chainID] = splitTokenID(tokenID);
		if (chainID.equals(ctx.chainID)) {
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
		const address = ctx.storeKey.subarray(0, ADDRESS_LENGTH);
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

		const chainID = ctx.storeKey.subarray(ADDRESS_LENGTH, ADDRESS_LENGTH + CHAIN_ID_LENGTH);
		const tokenID = ctx.storeKey.subarray(ADDRESS_LENGTH, ADDRESS_LENGTH + TOKEN_ID_LENGTH);
		const totalAmount =
			account.availableBalance +
			account.lockedBalances.reduce((prev, curr) => prev + curr.amount, BigInt(0));

		const escrowStore = this.stores.get(EscrowStore);
		const escrowKey = escrowStore.getKey(ctx.terminatedChainID, tokenID);
		const escrowData = await escrowStore.getOrDefault(methodContext, escrowKey);

		if (!ctx.chainID.equals(chainID) || escrowData.amount < totalAmount) {
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

		const userExists = await userStore.has(methodContext, userStore.getKey(address, tokenID));
		if (!userExists) {
			await this._internalMethod.initializeUserAccount(methodContext, address, tokenID);
		}

		await userStore.addAvailableBalance(methodContext, address, tokenID, totalAmount);

		this.events.get(RecoverEvent).log(methodContext, address, {
			terminatedChainID: ctx.terminatedChainID,
			tokenID,
			amount: totalAmount,
		});
	}
}
