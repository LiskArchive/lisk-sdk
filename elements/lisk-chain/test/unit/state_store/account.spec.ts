/*
 * Copyright © 2019 Lisk Foundation
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
import { KVStore, BatchChain, NotFoundError } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { StateStore, StateDiff } from '../../../src';
import { DataAccess } from '../../../src/data_access';
import { Account } from '../../../src/account';
import {
	createFakeDefaultAccount,
	encodeDefaultAccount,
	defaultAccountAssetSchema,
} from '../../utils/account';
import {
	defaultBlockHeaderAssetSchema,
	defaultNetworkIdentifier,
} from '../../utils/block';
import { baseAccountSchema } from '../../../src/schema';

jest.mock('@liskhq/lisk-db');

describe('state store / account', () => {
	const stateStoreAccounts = [
		createFakeDefaultAccount({
			balance: BigInt(100),
		}),
		createFakeDefaultAccount({
			balance: BigInt(555),
		}),
	];

	const accountOnlyInDB = createFakeDefaultAccount({ balance: BigInt(333) });

	const accountInDB = [
		...stateStoreAccounts.map(acc => ({
			key: acc.address,
			value: encodeDefaultAccount(acc),
		})),
		{
			key: accountOnlyInDB.address,
			value: encodeDefaultAccount(accountOnlyInDB),
		},
	];

	let stateStore: StateStore;
	let db: any;

	beforeEach(() => {
		db = new KVStore('temp');
		const defaultAccountSchema = {
			...baseAccountSchema,
			properties: {
				...baseAccountSchema.properties,
				asset: {
					...baseAccountSchema.properties.asset,
					properties: defaultAccountAssetSchema,
				},
			},
		};
		const dataAccess = new DataAccess({
			db,
			accountSchema: defaultAccountSchema as any,
			registeredBlockHeaders: {
				0: defaultBlockHeaderAssetSchema,
				2: defaultBlockHeaderAssetSchema,
			},
			registeredTransactions: { 8: TransferTransaction },
			maxBlockHeaderCache: 505,
			minBlockHeaderCache: 309,
		});
		stateStore = new StateStore(dataAccess, {
			lastBlockHeaders: [],
			networkIdentifier: defaultNetworkIdentifier,
			defaultAsset: createFakeDefaultAccount().asset,
			lastBlockReward: BigInt(500000000),
		});
		// Setting this as default behavior throws UnhandledPromiseRejection, so it is specifying the non-existing account
		const dbGetMock = when(db.get)
			.calledWith('accounts:address:123L')
			.mockRejectedValue(new NotFoundError('Data not found') as never);
		for (const data of accountInDB) {
			dbGetMock
				.calledWith(`accounts:address:${data.key.toString('binary')}`)
				.mockResolvedValue(data.value as never);
		}
		for (const account of stateStoreAccounts) {
			stateStore.account.set(account.address, account);
		}
	});

	describe('get', () => {
		it('should get the account', async () => {
			// Act
			const account = await stateStore.account.get(accountInDB[0].key);
			// Assert
			expect(account).toStrictEqual(stateStoreAccounts[0]);
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should try to get account from db if not found in memory', async () => {
			// Act
			await stateStore.account.get(accountInDB[2].key);
			// Assert
			expect(db.get).toHaveBeenCalledWith(
				`accounts:address:${accountInDB[2].key.toString('binary')}`,
			);
		});

		it('should throw an error if not exist', async () => {
			// Act && Assert
			expect.assertions(1);
			try {
				await stateStore.account.get(Buffer.from('123L'));
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe('getOrDefault', () => {
		it('should get the account', async () => {
			// Act
			const account = await stateStore.account.getOrDefault(accountInDB[0].key);
			// Assert
			expect(account).toStrictEqual(stateStoreAccounts[0]);
		});

		it('should try to get account from db if not found in memory', async () => {
			// Act
			await stateStore.account.get(accountInDB[2].key);
			// Assert
			expect(db.get).toHaveBeenCalledWith(
				`accounts:address:${accountInDB[2].key.toString('binary')}`,
			);
		});

		it('should get the default account', async () => {
			// Arrange
			// Act
			const account = await stateStore.account.getOrDefault(
				Buffer.from('123L'),
			);
			// Assert
			expect(account).toEqual(
				createFakeDefaultAccount({ address: Buffer.from('123L') }),
			);
			expect(account.balance).toBe(BigInt(0));
		});
	});

	describe('set', () => {
		it('should set the updated values for the account', async () => {
			// Act
			const updatedAccount = await stateStore.account.get(accountInDB[0].key);

			updatedAccount.balance = BigInt(123);
			updatedAccount.nonce = BigInt(99);

			stateStore.account.set(accountInDB[0].key, updatedAccount);
			const updatedAccountAfterSet = await stateStore.account.get(
				accountInDB[0].key,
			);
			// Assert
			expect(updatedAccountAfterSet).toStrictEqual(updatedAccount);
		});

		it('should update the updateKeys property', async () => {
			const existingAccount = await stateStore.account.get(accountInDB[0].key);
			const updatedAccount = new Account(existingAccount);
			updatedAccount.balance = BigInt(999);

			stateStore.account.set(accountInDB[0].key, updatedAccount);

			expect(
				stateStore.account['_updatedKeys'].has(accountInDB[0].key),
			).toBeTrue();
		});
	});

	describe('finalize', () => {
		let existingAccount;
		let updatedAccount: Account;
		let batchStub: BatchChain;

		beforeEach(async () => {
			batchStub = { put: jest.fn() } as any;

			existingAccount = await stateStore.account.get(accountInDB[0].key);
			updatedAccount = new Account(existingAccount);
			updatedAccount.balance = BigInt(999);

			stateStore.account.set(updatedAccount.address, updatedAccount);
		});

		it('should save the account state in the database', () => {
			stateStore.account.finalize(batchStub);

			expect(batchStub.put).toHaveBeenCalledWith(
				`accounts:address:${updatedAccount.address.toString('binary')}`,
				expect.any(Buffer),
			);
		});
	});

	describe('diff', () => {
		let existingAccount;
		let updatedAccount: Account;
		let batchStub: BatchChain;
		let stateDiff: StateDiff;

		beforeEach(async () => {
			batchStub = { put: jest.fn() } as any;

			existingAccount = await stateStore.account.get(accountInDB[0].key);
			updatedAccount = new Account(existingAccount);
			updatedAccount.balance = BigInt(999);

			stateStore.account.set(updatedAccount.address, updatedAccount);
		});

		it('should return empty array for updated and keys for newly created account', async () => {
			stateDiff = stateStore.account.finalize(batchStub);
			const account1 = await stateStore.account.get(accountInDB[0].key);
			const account2 = await stateStore.account.get(accountInDB[1].key);

			expect(stateDiff).toStrictEqual({
				updated: [],
				created: [
					`accounts:address:${account1.address.toString('binary')}`,
					`accounts:address:${account2.address.toString('binary')}`,
				],
			});
		});
	});
});
