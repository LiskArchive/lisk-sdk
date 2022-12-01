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

import { utils } from '@liskhq/lisk-cryptography';
import { StoreGetter } from '../../../../../src';
import { UserStore } from '../../../../../src/modules/token/stores/user';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('UserStore', () => {
	const defaultAddress = utils.getRandomBytes(20);
	const defaultTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);

	const defaultData = {
		availableBalance: BigInt(100),
		lockedBalances: [{ module: 'pos', amount: BigInt(99) }],
	};

	let store: UserStore;
	let context: StoreGetter;

	beforeEach(async () => {
		store = new UserStore('token');
		const db = new InMemoryPrefixedStateDB();
		const stateStore = new PrefixedStateReadWriter(db);
		context = createStoreGetter(stateStore);

		await store.set(context, Buffer.concat([defaultAddress, defaultTokenID]), defaultData);
	});

	describe('addAvailableBalanceWithCreate', () => {
		it('should create with specified balance if previous data does not exist', async () => {
			const address = utils.getRandomBytes(20);
			const tokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
			await store.addAvailableBalanceWithCreate(context, address, tokenID, BigInt(999));

			const setValue = await store.get(context, Buffer.concat([address, tokenID]));

			expect(setValue.availableBalance).toEqual(BigInt(999));
			expect(setValue.lockedBalances).toEqual([]);
		});

		it('should add amount to previous data if exists', async () => {
			await store.addAvailableBalanceWithCreate(
				context,
				defaultAddress,
				defaultTokenID,
				BigInt(999),
			);

			const setValue = await store.get(context, Buffer.concat([defaultAddress, defaultTokenID]));

			expect(setValue.availableBalance).toEqual(BigInt(1099));
			expect(setValue.lockedBalances).toHaveLength(1);
		});
	});

	describe('getKey', () => {
		it('should return the key for the store', () => {
			expect(store.getKey(defaultAddress, defaultTokenID)).toEqual(
				Buffer.concat([defaultAddress, defaultTokenID]),
			);
		});
	});

	describe('save', () => {
		it('should sort the locked balance', async () => {
			await store.save(context, defaultAddress, defaultTokenID, {
				availableBalance: BigInt(100),
				lockedBalances: [
					{ module: 'pos', amount: BigInt(99) },
					{ module: 'chain', amount: BigInt(10) },
				],
			});

			const setValue = await store.get(context, Buffer.concat([defaultAddress, defaultTokenID]));

			expect(setValue.availableBalance).toEqual(BigInt(100));
			expect(setValue.lockedBalances).toHaveLength(2);
			expect(setValue.lockedBalances[0].module).toBe('chain');
			expect(setValue.lockedBalances[1].module).toBe('pos');
		});

		it('should removed zero locked balance element', async () => {
			await store.save(context, defaultAddress, defaultTokenID, {
				availableBalance: BigInt(100),
				lockedBalances: [
					{ module: 'pos', amount: BigInt(99) },
					{ module: 'dps', amount: BigInt(0) },
					{ module: 'chain', amount: BigInt(10) },
				],
			});

			const setValue = await store.get(context, Buffer.concat([defaultAddress, defaultTokenID]));

			expect(setValue.availableBalance).toEqual(BigInt(100));
			expect(setValue.lockedBalances).toHaveLength(2);
			expect(setValue.lockedBalances[0].module).toBe('chain');
			expect(setValue.lockedBalances[1].module).toBe('pos');
		});
	});

	describe('addAvailableBalance', () => {
		it('should reject if the account does not exist', async () => {
			const address = utils.getRandomBytes(20);
			const tokenID = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);

			await expect(
				store.addAvailableBalance(context, address, tokenID, BigInt(999)),
			).rejects.toThrow('does not exist');
		});

		it('should add the balance', async () => {
			await store.addAvailableBalance(context, defaultAddress, defaultTokenID, BigInt(999));

			const setValue = await store.get(context, Buffer.concat([defaultAddress, defaultTokenID]));

			expect(setValue.availableBalance).toEqual(BigInt(1099));
			expect(setValue.lockedBalances).toHaveLength(1);
		});
	});
});
