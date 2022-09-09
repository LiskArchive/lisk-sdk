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
import { ADDRESS_LENGTH, CHAIN_ID_ALIAS_NATIVE, CHAIN_ID_LENGTH } from './constants';

import { UserStoreData, userStoreSchema } from './schemas';
import { EscrowStore } from './stores/escrow';
import { UserStore } from './stores/user';
import { InteroperabilityMethod } from './types';
import { splitTokenID } from './utils';

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

	public async beforeApplyCCM(ctx: BeforeApplyCCMsgMethodContext): Promise<void> {
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
		const [feeTokenChainID, feeTokenLocalID] = splitTokenID(messageFeeTokenID);
		const userStore = this.stores.get(UserStore);
		if (!feeTokenChainID.equals(ownChainID)) {
			await userStore.updateAvailableBalanceWithCreate(
				methodContext,
				ctx.trsSender,
				messageFeeTokenID,
				ccm.fee,
			);
			return;
		}
		const escrowStore = this.stores.get(EscrowStore);
		await escrowStore.deductEscrowAmountWithTerminate(
			methodContext,
			this._interopMethod,
			ccm.sendingChainID,
			feeTokenLocalID,
			ccm.fee,
		);

		const canonicalTokenID = await this._tokenMethod.getCanonicalTokenID(
			methodContext,
			messageFeeTokenID,
		);
		await userStore.updateAvailableBalanceWithCreate(
			methodContext,
			ctx.trsSender,
			canonicalTokenID,
			ccm.fee,
		);
	}

	public async beforeRecoverCCM(ctx: BeforeRecoverCCMsgMethodContext): Promise<void> {
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
		const [feeTokenChainID, feeTokenLocalID] = splitTokenID(messageFeeTokenID);
		const userStore = this.stores.get(UserStore);
		if (!feeTokenChainID.equals(ownChainID)) {
			await userStore.updateAvailableBalanceWithCreate(
				methodContext,
				ctx.trsSender,
				messageFeeTokenID,
				ccm.fee,
			);
			return;
		}

		const escrowStore = this.stores.get(EscrowStore);
		await escrowStore.deductEscrowAmountWithTerminate(
			methodContext,
			this._interopMethod,
			ccm.sendingChainID,
			feeTokenLocalID,
			ccm.fee,
		);
		const canonicalTokenID = await this._tokenMethod.getCanonicalTokenID(
			methodContext,
			messageFeeTokenID,
		);
		await userStore.updateAvailableBalanceWithCreate(
			methodContext,
			ctx.trsSender,
			canonicalTokenID,
			ccm.fee,
		);
	}

	public async beforeSendCCM(ctx: BeforeSendCCMsgMethodContext): Promise<void> {
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
		const [feeTokenChainID, feeTokenLocalID] = splitTokenID(messageFeeTokenID);
		const userStore = this.stores.get(UserStore);
		let tokenID = messageFeeTokenID;
		if (feeTokenChainID.equals(ownChainID)) {
			tokenID = await this._tokenMethod.getCanonicalTokenID(methodContext, messageFeeTokenID);
			const escrowStore = this.stores.get(EscrowStore);
			await escrowStore.addAmount(methodContext, ccm.receivingChainID, feeTokenLocalID, ccm.fee);
		}
		const payer = await userStore.get(ctx, userStore.getKey(ctx.feeAddress, tokenID));
		if (payer.availableBalance < ccm.fee) {
			throw new Error(
				`Payer ${ctx.feeAddress.toString(
					'hex',
				)} does not have sufficient balance for fee ${ccm.fee.toString()}`,
			);
		}
		payer.availableBalance -= ccm.fee;
		await userStore.set(ctx, userStore.getKey(ctx.feeAddress, tokenID), payer);
	}

	public async recover(ctx: RecoverCCMsgMethodContext): Promise<void> {
		const methodContext = ctx.getMethodContext();
		const userStore = this.stores.get(UserStore);
		if (!ctx.storePrefix.equals(userStore.subStorePrefix)) {
			throw new Error(`Invalid store prefix ${ctx.storePrefix.toString('hex')} to recover.`);
		}
		if (ctx.storeKey.length !== 28) {
			throw new Error(`Invalid store key ${ctx.storeKey.toString('hex')} to recover.`);
		}
		const account = codec.decode<UserStoreData>(userStoreSchema, ctx.storeValue);
		const address = ctx.storeKey.slice(0, ADDRESS_LENGTH);
		const chainID = ctx.storeKey.slice(ADDRESS_LENGTH, ADDRESS_LENGTH + CHAIN_ID_LENGTH);
		const localID = ctx.storeKey.slice(ADDRESS_LENGTH + CHAIN_ID_LENGTH);
		const totalAmount =
			account.availableBalance +
			account.lockedBalances.reduce((prev, curr) => prev + curr.amount, BigInt(0));

		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);

		if (!ownChainID.equals(chainID)) {
			throw new Error(
				`ChainID ${chainID.toString('hex')} does not match with own chain ID ${ownChainID.toString(
					'hex',
				)}`,
			);
		}
		const escrowStore = this.stores.get(EscrowStore);
		const escrowKey = Buffer.concat([ctx.terminatedChainID, localID]);
		const escrowData = await escrowStore.get(ctx, escrowKey);
		if (escrowData.amount < totalAmount) {
			throw new Error(
				`Escrow amount ${escrowData.amount.toString()} is not sufficient for ${totalAmount.toString()}`,
			);
		}
		escrowData.amount -= totalAmount;
		await escrowStore.set(ctx, escrowKey, escrowData);

		const localTokenID = Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]);
		await userStore.updateAvailableBalanceWithCreate(
			methodContext,
			address,
			localTokenID,
			totalAmount,
		);
	}
}
