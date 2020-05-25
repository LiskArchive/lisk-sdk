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
import { StateStore } from '../../src';
import { DataAccess } from '../../src/data_access';
import { Account, accountDefaultValues } from '../../src/account';

jest.mock('@liskhq/lisk-db');

describe('state store / account', () => {
	const defaultAccounts = [
		{
			...accountDefaultValues,
			address: '1276152240083265771L',
			balance: '100',
		},
		{
			...accountDefaultValues,
			address: '5059876081639179984L',
			balance: '555',
		},
		{
			...accountDefaultValues,
			address: '1059876081639179984L',
			balance: '444',
		},
	];

	const stateStoreAccounts = [
		new Account({
			...accountDefaultValues,
			address: '1276152240083265771L',
			balance: '100',
		}),
		new Account({
			...accountDefaultValues,
			address: '5059876081639179984L',
			balance: '555',
		}),
	];

	let stateStore: StateStore;
	let db: any;

	beforeEach(() => {
		db = new KVStore('temp');
		const dataAccess = new DataAccess({
			db,
			maxBlockHeaderCache: 505,
			minBlockHeaderCache: 309,
			registeredTransactions: {},
		});
		stateStore = new StateStore(dataAccess, {
			lastBlockHeaders: [],
			networkIdentifier: 'network-identifier',
			lastBlockReward: BigInt(500000000),
		});
		// Setting this as default behavior throws UnhandledPromiseRejection, so it is specifiying the non-existing account
		const dbGetMock = when(db.get)
			.calledWith('accounts:address:123L')
			.mockRejectedValue(new NotFoundError('Data not found') as never);
		for (const account of defaultAccounts) {
			dbGetMock
				.calledWith(`accounts:address:${account.address}`)
				.mockResolvedValue(
					Buffer.from(JSON.stringify(account), 'utf-8') as never,
				);
		}
		stateStore.account['_data'] = [...stateStoreAccounts];
	});

	describe('get', () => {
		it('should get the account', async () => {
			// Act
			const account = await stateStore.account.get(defaultAccounts[0].address);
			// Assert
			expect(account).toStrictEqual(stateStoreAccounts[0]);
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should try to get account from db if not found in memory', async () => {
			// Act
			await stateStore.account.get(defaultAccounts[2].address);
			// Assert
			expect(db.get).toHaveBeenCalledWith(
				`accounts:address:${defaultAccounts[2].address}`,
			);
		});

		it('should throw an error if not exist', async () => {
			// Act && Assert
			expect.assertions(1);
			try {
				await stateStore.account.get('123L');
			} catch (error) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe('getOrDefault', () => {
		it('should get the account', async () => {
			// Act
			const account = await stateStore.account.getOrDefault(
				defaultAccounts[0].address,
			);
			// Assert
			expect(account).toStrictEqual(stateStoreAccounts[0]);
		});

		it('should try to get account from db if not found in memory', async () => {
			// Act
			await stateStore.account.get(defaultAccounts[2].address);
			// Assert
			expect(db.get).toHaveBeenCalledWith(
				`accounts:address:${defaultAccounts[2].address}`,
			);
		});

		it('should get the default account', async () => {
			// Arrange
			// Act
			const account = await stateStore.account.getOrDefault('123L');
			// Assert
			expect(account).toEqual(
				new Account({ ...accountDefaultValues, address: '123L' }),
			);
			expect(account.balance).toBe(BigInt(0));
		});
	});

	describe('set', () => {
		let missedBlocks: number;
		let producedBlocks: number;

		beforeEach(() => {
			// Arrange
			missedBlocks = 1;
			producedBlocks = 1;
		});

		it('should set the updated values for the account', async () => {
			// Act
			const updatedAccount = await stateStore.account.get(
				defaultAccounts[0].address,
			);

			(updatedAccount as any).missedBlocks = missedBlocks;
			(updatedAccount as any).producedBlocks = producedBlocks;

			stateStore.account.set(defaultAccounts[0].address, updatedAccount);
			const updatedAcountAfterSet = await stateStore.account.get(
				defaultAccounts[0].address,
			);
			// Assert
			expect(updatedAcountAfterSet).toStrictEqual(updatedAccount);
		});

		it('should update the updateKeys property', async () => {
			const existingAccount = await stateStore.account.get(
				defaultAccounts[0].address,
			);
			const updatedAccount = new Account({
				...existingAccount.toJSON(),
				missedBlocks,
				producedBlocks,
			});

			stateStore.account.set(defaultAccounts[0].address, updatedAccount);

			expect(
				stateStore.account['_updatedKeys'].has(defaultAccounts[0].address),
			).toBeTrue();
		});
	});

	describe('finalize', () => {
		let existingAccount;
		let updatedAccount: Account;
		let missedBlocks: number;
		let producedBlocks: number;
		let batchStub: BatchChain;

		beforeEach(async () => {
			missedBlocks = 1;
			producedBlocks = 1;

			batchStub = { put: jest.fn() } as any;

			existingAccount = await stateStore.account.get(
				defaultAccounts[0].address,
			);
			updatedAccount = new Account({
				...existingAccount.toJSON(),
				missedBlocks,
				producedBlocks,
			});

			stateStore.account.set(updatedAccount.address, updatedAccount);
		});

		it('should save the account state in the database', () => {
			stateStore.account.finalize(batchStub);

			expect(batchStub.put).toHaveBeenCalledWith(
				`accounts:address:${updatedAccount.address}`,
				Buffer.from(JSON.stringify(updatedAccount.toJSON()), 'utf-8'),
			);
		});
	});
});
