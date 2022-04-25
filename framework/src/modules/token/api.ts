/*
 * Copyright © 2021 Lisk Foundation
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

import { NotFoundError } from '@liskhq/lisk-chain';
import { ImmutableAPIContext, APIContext } from '../../node/state_machine';
import { BaseAPI } from '../base_api';
import { STORE_PREFIX_USER } from './constants';
import { UserStoreData, userStoreSchema } from './schemas';
import { InteroperabilityAPI, MinBalance, TokenID } from './types';
import { getNativeTokenID, getUserStoreKey, splitTokenID } from './utils';

export class TokenAPI extends BaseAPI {
	private _minBalances!: MinBalance[];
	private _interoperabilityAPI!: InteroperabilityAPI;
	// TODO: remove when updating the API
	private readonly _minBalance: bigint = BigInt(0);

	public init(args: { minBalances: MinBalance[] }): void {
		this._minBalances = args.minBalances;
	}

	public addDependencies(interoperabilityAPI: InteroperabilityAPI) {
		this._interoperabilityAPI = interoperabilityAPI;
	}

	public async getAvailableBalance(
		apiContext: ImmutableAPIContext,
		address: Buffer,
		_tokenID: TokenID,
	): Promise<bigint> {
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		try {
			const user = await userStore.getWithSchema<UserStoreData>(address, userStoreSchema);
			return user.availableBalance;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return BigInt(0);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getMinRemainingBalance(_apiContext: ImmutableAPIContext): Promise<bigint> {
		return this._minBalance;
	}

	public async transfer(
		apiContext: APIContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const canonicalTokenID = await this._getCanonicalTokenID(tokenID);
		const minBalance = this._getMinBalance(tokenID);
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const sender = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(senderAddress, canonicalTokenID),
			userStoreSchema,
		);
		if (sender.availableBalance < amount + minBalance) {
			throw new Error(
				`Sender ${senderAddress.toString(
					'hex',
				)} balance ${sender.availableBalance.toString()} is not sufficient for ${(
					amount + minBalance
				).toString()}`,
			);
		}
		sender.availableBalance -= amount;
		await userStore.setWithSchema(
			getUserStoreKey(senderAddress, canonicalTokenID),
			sender,
			userStoreSchema,
		);

		let recipient: UserStoreData;
		try {
			recipient = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(recipientAddress, canonicalTokenID),
				userStoreSchema,
			);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			recipient = {
				availableBalance: BigInt(0),
				lockedBalances: [],
			};
		}
		if (recipient.availableBalance + amount < minBalance) {
			throw new Error(
				`Recipient ${recipientAddress.toString('hex')} balance ${(
					recipient.availableBalance + amount
				).toString()} is not sufficient for min balance ${minBalance}`,
			);
		}
		recipient.availableBalance += amount;
		await userStore.setWithSchema(
			getUserStoreKey(recipientAddress, canonicalTokenID),
			recipient,
			userStoreSchema,
		);
	}

	public async lock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: number,
		_tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const user = await userStore.getWithSchema<UserStoreData>(address, userStoreSchema);
		if (user.availableBalance < amount + this._minBalance) {
			throw new Error(
				`User ${address.toString(
					'hex',
				)} balance ${user.availableBalance.toString()} is not sufficient for ${(
					amount + this._minBalance
				).toString()}`,
			);
		}
		user.availableBalance -= amount;
		const existingIndex = user.lockedBalances.findIndex(b => b.moduleID === moduleID);
		if (existingIndex > -1) {
			const locked = user.lockedBalances[existingIndex].amount + amount;
			user.lockedBalances[existingIndex] = {
				moduleID,
				amount: locked,
			};
		} else {
			user.lockedBalances.push({
				moduleID,
				amount,
			});
		}
		user.lockedBalances.sort((a, b) => a.moduleID - b.moduleID);
		await userStore.setWithSchema(address, user, userStoreSchema);
	}

	public async unlock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: number,
		_tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const user = await userStore.getWithSchema<UserStoreData>(address, userStoreSchema);
		const lockedIndex = user.lockedBalances.findIndex(b => b.moduleID === moduleID);
		if (lockedIndex < 0) {
			throw new Error(`No balance is locked for module ID ${moduleID}`);
		}
		const lockedObj = user.lockedBalances[lockedIndex];
		if (lockedObj.amount < amount) {
			throw new Error(
				`Not enough amount is locked for module ${moduleID} to unlock ${amount.toString()}`,
			);
		}
		lockedObj.amount -= amount;
		user.availableBalance += amount;
		if (lockedObj.amount !== BigInt(0)) {
			user.lockedBalances[lockedIndex] = lockedObj;
		} else {
			user.lockedBalances.splice(lockedIndex, 1);
		}
		await userStore.setWithSchema(address, user, userStoreSchema);
	}

	public async burn(
		apiContext: APIContext,
		senderAddress: Buffer,
		_id: TokenID,
		amount: bigint,
	): Promise<void> {
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const sender = await userStore.getWithSchema<UserStoreData>(senderAddress, userStoreSchema);
		if (sender.availableBalance < amount + this._minBalance) {
			throw new Error(
				`Sender ${senderAddress.toString(
					'hex',
				)} balance ${sender.availableBalance.toString()} is not sufficient for ${(
					amount + this._minBalance
				).toString()}`,
			);
		}
		sender.availableBalance -= amount;
		await userStore.setWithSchema(senderAddress, sender, userStoreSchema);
	}

	public async mint(
		apiContext: APIContext,
		address: Buffer,
		_id: TokenID,
		amount: bigint,
	): Promise<void> {
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		let recipient: UserStoreData;
		try {
			recipient = await userStore.getWithSchema<UserStoreData>(address, userStoreSchema);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			recipient = {
				availableBalance: BigInt(0),
				lockedBalances: [],
			};
		}
		if (recipient.availableBalance + amount < this._minBalance) {
			throw new Error(
				`Recipient ${address.toString('hex')} balance ${(
					recipient.availableBalance + amount
				).toString()} is not sufficient for min balance ${this._minBalance.toString()}`,
			);
		}
		recipient.availableBalance += amount;
		await userStore.setWithSchema(address, recipient, userStoreSchema);
	}

	public async getLockedAmount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
		moduleID: number,
		_tokenID: TokenID,
	): Promise<bigint> {
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		let data: UserStoreData;
		try {
			data = await userStore.getWithSchema<UserStoreData>(address, userStoreSchema);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return BigInt(0);
		}
		return data.lockedBalances.reduce((prev, current) => {
			if (current.moduleID === moduleID) {
				return prev + current.amount;
			}
			return prev;
		}, BigInt(0));
	}

	private async _getCanonicalTokenID(tokenID: TokenID): Promise<TokenID> {
		const [chainID] = splitTokenID(tokenID);
		const { id } = await this._interoperabilityAPI.getOwnChainAccount();
		if (chainID.equals(id)) {
			return getNativeTokenID(tokenID);
		}
		return tokenID;
	}

	private _getMinBalance(tokenID: TokenID): bigint {
		const minBalance = this._minBalances.find(mb => mb.tokenID.equals(tokenID));
		return minBalance?.amount ?? BigInt(0);
	}
}
