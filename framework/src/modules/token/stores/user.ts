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
import { NotFoundError } from '@liskhq/lisk-db';
import { BaseStore, ImmutableStoreGetter, StoreGetter } from '../../base_store';
import { MAX_MODULE_NAME_LENGTH, MIN_MODULE_NAME_LENGTH, TOKEN_ID_LENGTH } from '../constants';
import { TokenID } from '../types';

export interface UserStoreData {
	availableBalance: bigint;
	lockedBalances: {
		module: string;
		amount: bigint;
	}[];
}

export const userStoreSchema = {
	$id: '/token/store/user',
	type: 'object',
	required: ['availableBalance', 'lockedBalances'],
	properties: {
		availableBalance: { dataType: 'uint64', fieldNumber: 1 },
		lockedBalances: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['module', 'amount'],
				properties: {
					module: {
						dataType: 'string',
						fieldNumber: 1,
						minLength: MIN_MODULE_NAME_LENGTH,
						maxLength: MAX_MODULE_NAME_LENGTH,
					},
					amount: { dataType: 'uint64', fieldNumber: 2 },
				},
			},
		},
	},
};

export class UserStore extends BaseStore<UserStoreData> {
	public schema = userStoreSchema;

	// TODO: Remove this function when updating the methods
	public async accountExist(context: ImmutableStoreGetter, address: Buffer): Promise<boolean> {
		const allUserData = await this.iterate(context, {
			gte: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 0)]),
			lte: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 255)]),
		});
		return allUserData.length !== 0;
	}

	public async addAvailableBalanceWithCreate(
		context: StoreGetter,
		address: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		let recipient: UserStoreData;
		try {
			recipient = await this.get(context, this.getKey(address, tokenID));
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			recipient = {
				availableBalance: BigInt(0),
				lockedBalances: [],
			};
		}
		recipient.availableBalance += amount;
		await this.set(context, this.getKey(address, tokenID), recipient);
	}

	public getKey(address: Buffer, tokenID: TokenID): Buffer {
		return Buffer.concat([address, tokenID]);
	}

	public async save(
		context: StoreGetter,
		address: Buffer,
		tokenID: Buffer,
		data: UserStoreData,
	): Promise<void> {
		const lockedBalances = data.lockedBalances.filter(locked => locked.amount !== BigInt(0));
		lockedBalances.sort((a, b) => a.module.localeCompare(b.module, 'en'));

		await this.set(context, this.getKey(address, tokenID), {
			...data,
			lockedBalances,
		});
	}

	public async addAvailableBalance(
		context: StoreGetter,
		address: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		const recipient = await this.get(context, this.getKey(address, tokenID));
		recipient.availableBalance += amount;
		await this.set(context, this.getKey(address, tokenID), recipient);
	}
}
