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
import { TokenAPI } from './api';
import {
	ADDRESS_LENGTH,
	CHAIN_ID_ALIAS_NATIVE,
	CHAIN_ID_LENGTH,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_USER,
} from './constants';
import {
	BeforeApplyCCMsgAPIContext,
	BeforeRecoverCCMsgAPIContext,
	BeforeSendCCMsgAPIContext,
	RecoverCCMsgAPIContext,
} from './interop_types';
import { EscrowStoreData, escrowStoreSchema, UserStoreData, userStoreSchema } from './schemas';
import { InteroperabilityAPI } from './types';
import {
	addEscrowAmount,
	deductEscrowAmountWithTerminate,
	getUserStoreKey,
	splitTokenID,
	updateAvailableBalanceWithCreate,
} from './utils';

export class TokenInteroperableAPI {
	private readonly _moduleID: number;
	private readonly _tokenAPI: TokenAPI;

	private _interopAPI!: InteroperabilityAPI;

	public constructor(moduleID: number, tokenAPI: TokenAPI) {
		this._moduleID = moduleID;
		this._tokenAPI = tokenAPI;
	}

	public addDependencies(interoperabilityAPI: InteroperabilityAPI) {
		this._interopAPI = interoperabilityAPI;
	}

	public async beforeApplyCCM(ctx: BeforeApplyCCMsgAPIContext): Promise<void> {
		const { ccm } = ctx;
		const apiContext = ctx.getAPIContext();
		if (ccm.fee < BigInt(0)) {
			throw new Error('Fee must be greater or equal to zero.');
		}
		const { id: ownChainID } = await this._interopAPI.getOwnChainAccount(apiContext);
		const { messageFeeTokenID } = await this._interopAPI.getChannel(apiContext, ccm.sendingChainID);
		const [feeTokenChainID, feeTokenLocalID] = splitTokenID(messageFeeTokenID);
		if (!feeTokenChainID.equals(ownChainID)) {
			await updateAvailableBalanceWithCreate(
				apiContext,
				this._moduleID,
				ctx.trsSender,
				messageFeeTokenID,
				ccm.fee,
			);
			return;
		}
		await deductEscrowAmountWithTerminate(
			apiContext,
			this._interopAPI,
			this._moduleID,
			ccm.sendingChainID,
			feeTokenLocalID,
			ccm.fee,
		);

		const canonicalTokenID = await this._tokenAPI.getCanonicalTokenID(
			apiContext,
			messageFeeTokenID,
		);
		await updateAvailableBalanceWithCreate(
			apiContext,
			this._moduleID,
			ctx.trsSender,
			canonicalTokenID,
			ccm.fee,
		);
	}

	public async beforeRecoverCCM(ctx: BeforeRecoverCCMsgAPIContext): Promise<void> {
		const { ccm } = ctx;
		const apiContext = ctx.getAPIContext();
		if (ccm.fee < BigInt(0)) {
			throw new Error('Fee must be greater or equal to zero.');
		}
		const { id: ownChainID } = await this._interopAPI.getOwnChainAccount(apiContext);
		const { messageFeeTokenID } = await this._interopAPI.getChannel(apiContext, ccm.sendingChainID);
		const [feeTokenChainID, feeTokenLocalID] = splitTokenID(messageFeeTokenID);
		if (!feeTokenChainID.equals(ownChainID)) {
			await updateAvailableBalanceWithCreate(
				apiContext,
				this._moduleID,
				ctx.trsSender,
				messageFeeTokenID,
				ccm.fee,
			);
			return;
		}

		await deductEscrowAmountWithTerminate(
			apiContext,
			this._interopAPI,
			this._moduleID,
			ccm.sendingChainID,
			feeTokenLocalID,
			ccm.fee,
		);
		const canonicalTokenID = await this._tokenAPI.getCanonicalTokenID(
			apiContext,
			messageFeeTokenID,
		);
		await updateAvailableBalanceWithCreate(
			apiContext,
			this._moduleID,
			ctx.trsSender,
			canonicalTokenID,
			ccm.fee,
		);
	}

	public async beforeSendCCM(ctx: BeforeSendCCMsgAPIContext): Promise<void> {
		const { ccm } = ctx;
		const apiContext = ctx.getAPIContext();
		if (ccm.fee < BigInt(0)) {
			throw new Error('Fee must be greater or equal to zero.');
		}
		const { id: ownChainID } = await this._interopAPI.getOwnChainAccount(apiContext);
		const { messageFeeTokenID } = await this._interopAPI.getChannel(apiContext, ccm.sendingChainID);
		const [feeTokenChainID, feeTokenLocalID] = splitTokenID(messageFeeTokenID);
		const userStore = apiContext.getStore(this._moduleID, STORE_PREFIX_USER);
		let tokenID = messageFeeTokenID;
		if (feeTokenChainID.equals(ownChainID)) {
			tokenID = await this._tokenAPI.getCanonicalTokenID(apiContext, messageFeeTokenID);
			await addEscrowAmount(
				apiContext,
				this._moduleID,
				ccm.receivingChainID,
				feeTokenLocalID,
				ccm.fee,
			);
		}
		const payer = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(ctx.feeAddress, tokenID),
			userStoreSchema,
		);
		if (payer.availableBalance < ccm.fee) {
			throw new Error(
				`Payer ${ctx.feeAddress.toString(
					'hex',
				)} does not have sufficient balance for fee ${ccm.fee.toString()}`,
			);
		}
		payer.availableBalance -= ccm.fee;
		await userStore.setWithSchema(getUserStoreKey(ctx.feeAddress, tokenID), payer, userStoreSchema);
	}

	public async recover(ctx: RecoverCCMsgAPIContext): Promise<void> {
		const apiContext = ctx.getAPIContext();
		if (STORE_PREFIX_USER !== ctx.storePrefix) {
			throw new Error(`Invalid store prefix ${ctx.storePrefix} to recover.`);
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

		const { id: ownChainID } = await this._interopAPI.getOwnChainAccount(apiContext);

		if (!ownChainID.equals(chainID)) {
			throw new Error(
				`ChainID ${chainID.toString('hex')} does not match with own chain ID ${ownChainID.toString(
					'hex',
				)}`,
			);
		}
		const escrowStore = apiContext.getStore(this._moduleID, STORE_PREFIX_ESCROW);
		const escrowKey = Buffer.concat([ctx.terminatedChainID, localID]);
		const escrowData = await escrowStore.getWithSchema<EscrowStoreData>(
			escrowKey,
			escrowStoreSchema,
		);
		if (escrowData.amount < totalAmount) {
			throw new Error(
				`Escrow amount ${escrowData.amount.toString()} is not sufficient for ${totalAmount.toString()}`,
			);
		}
		escrowData.amount -= totalAmount;
		await escrowStore.setWithSchema(escrowKey, escrowData, escrowStoreSchema);

		const localTokenID = Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]);
		await updateAvailableBalanceWithCreate(
			apiContext,
			this._moduleID,
			address,
			localTokenID,
			totalAmount,
		);
	}
}
