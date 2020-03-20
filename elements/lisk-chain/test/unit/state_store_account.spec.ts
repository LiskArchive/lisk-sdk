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
import { when } from 'jest-when';
import { StateStore } from '../../src';
import { StorageTransaction } from '../../src/types';
import { Account, accountDefaultValues } from '../../src/account';

describe('state store / account', () => {
	const defaultAccounts = [
		{
			...accountDefaultValues,
			address: '1276152240083265771L',
			balance: '100',
		},
		{
			...accountDefaultValues,
			address: '11237980039345381032L',
			balance: '555',
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
			address: '11237980039345381032L',
			balance: '555',
		}),
	];

	let stateStore: StateStore;
	let storageStub: any;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					get: jest.fn(),
					upsert: jest.fn(),
				},
			},
		};
		stateStore = new StateStore(storageStub, {
			lastBlockHeaders: [],
			networkIdentifier: 'network-identifier',
		});
	});

	describe('cache', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);
		});

		it('should call storage get and store in cache', async () => {
			// Act
			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			const results = await stateStore.account.cache(filter);
			// Assert
			expect(results).toHaveLength(2);
			expect(results.map(account => account.address)).toStrictEqual([
				defaultAccounts[0].address,
				defaultAccounts[1].address,
			]);
		});

		it('should cache to the state store', async () => {
			// Act
			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			await stateStore.account.cache(filter);
			// Assert
			expect((stateStore.account as any)._data).toStrictEqual(
				stateStoreAccounts,
			);
		});
	});

	describe('get', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);

			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			await stateStore.account.cache(filter);
		});

		it('should get the account', async () => {
			// Act
			const account = await stateStore.account.get(defaultAccounts[0].address);
			// Assert
			expect(account).toStrictEqual(stateStoreAccounts[0]);
		});

		it('should try to get account from db if not found in memory', async () => {
			// Act
			await stateStore.account.get('321L');
			// Assert
			expect(storageStub.entities.Account.get.mock.calls[1]).toEqual([
				{ address: '321L' },
				{ limit: null },
			]);
		});

		it('should throw an error if not exist', async () => {
			when(storageStub.entities.Account.get)
				.calledWith({ address: '123L' })
				.mockResolvedValue([] as never);
			// Act && Assert
			await expect(stateStore.account.get('123L')).rejects.toThrow(
				'does not exist',
			);
		});
	});

	describe('getOrDefault', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);
			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			await stateStore.account.cache(filter);
		});

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
			await stateStore.account.getOrDefault('321L');
			// Assert
			expect(storageStub.entities.Account.get.mock.calls[1]).toEqual([
				{ address: '321L' },
				{ limit: null },
			]);
		});

		it('should get the default account', async () => {
			// Arrange
			storageStub.entities.Account.get.mockResolvedValueOnce([]);
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

		beforeEach(async () => {
			// Arrange
			missedBlocks = 1;
			producedBlocks = 1;
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);
			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			await stateStore.account.cache(filter);
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
			const updatedKeys = ['producedBlocks', 'missedBlocks'];
			const existingAccount = await stateStore.account.get(
				defaultAccounts[0].address,
			);
			const updatedAccount = new Account({
				...existingAccount.toJSON(),
				missedBlocks,
				producedBlocks,
			});

			stateStore.account.set(defaultAccounts[0].address, updatedAccount);

			expect((stateStore.account as any)._updatedKeys[0]).toStrictEqual(
				updatedKeys,
			);
		});
	});

	describe('finalize', () => {
		let txStub = {} as StorageTransaction;
		let existingAccount;
		let updatedAccount;
		let missedBlocks: number;
		let producedBlocks: number;
		let accountUpsertObj: object;

		beforeEach(async () => {
			missedBlocks = 1;
			producedBlocks = 1;

			accountUpsertObj = {
				missedBlocks,
				producedBlocks,
			};

			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);

			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			await stateStore.account.cache(filter);

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

		it('should save the account state in the database', async () => {
			await stateStore.account.finalize(txStub);

			expect(storageStub.entities.Account.upsert).toHaveBeenCalledWith(
				{ address: defaultAccounts[0].address },
				accountUpsertObj,
				null,
				txStub,
			);
		});
	});
});
