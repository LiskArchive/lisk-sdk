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

'use strict';

const { StateStore } = require('../../../../../../../src/modules/chain/blocks');

describe('state store / account', () => {
	const defaultAccounts = [
		{ address: '1276152240083265771L', balance: '100' },
		{ address: '11237980039345381032L', balance: '555' },
	];

	let stateStore;
	let storageStub;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					get: jest.fn(),
					upsert: jest.fn(),
				},
			},
		};
		stateStore = new StateStore(storageStub);
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
			expect(stateStore.account.data).toStrictEqual(defaultAccounts);
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
			const account = stateStore.account.get(defaultAccounts[0].address);
			// Assert
			expect(account).toStrictEqual(defaultAccounts[0]);
		});

		it('should throw an error if not exist', async () => {
			// Act && Assert
			expect(() => stateStore.account.get('123L')).toThrow('does not exist');
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
			const account = stateStore.account.getOrDefault(
				defaultAccounts[0].address,
			);
			// Assert
			expect(account).toStrictEqual(defaultAccounts[0]);
		});

		it('should get the default account', async () => {
			// Act
			const account = stateStore.account.getOrDefault('123L');
			// Assert
			expect(account.balance).toBe('0');
		});
	});

	describe('set', () => {
		let secondPublicKey;
		let secondSignature;

		beforeEach(async () => {
			// Arrange
			secondPublicKey =
				'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b';
			secondSignature = true;
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);
			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			await stateStore.account.cache(filter);
		});

		it('should set the updated values for the account', async () => {
			// Act
			const updatedAccount = stateStore.account.get(defaultAccounts[0].address);

			updatedAccount.secondPublicKey = secondPublicKey;
			updatedAccount.secondSignature = secondSignature;

			stateStore.account.set(defaultAccounts[0].address, updatedAccount);
			// Assert
			expect(stateStore.account.get(defaultAccounts[0].address)).toStrictEqual(
				updatedAccount,
			);
		});

		it('should update the updateKeys property', async () => {
			const updatedKeys = ['secondPublicKey', 'secondSignature'];
			const updatedAccount = stateStore.account.get(defaultAccounts[0].address);

			updatedAccount.secondPublicKey = secondPublicKey;
			updatedAccount.secondSignature = secondSignature;

			stateStore.account.set(defaultAccounts[0].address, updatedAccount);

			expect(stateStore.account.updatedKeys[0]).toStrictEqual(updatedKeys);
		});
	});

	describe('finalize', () => {
		let updatedAccount;
		let secondPublicKey;
		let secondSignature;

		beforeEach(async () => {
			secondPublicKey =
				'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b';
			secondSignature = true;

			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);

			const filter = [
				{ address: defaultAccounts[0].address },
				{ address: defaultAccounts[1].address },
			];
			await stateStore.account.cache(filter);

			updatedAccount = stateStore.account.get(defaultAccounts[0].address);

			updatedAccount.secondPublicKey = secondPublicKey;
			updatedAccount.secondSignature = secondSignature;

			stateStore.account.set(updatedAccount.address, updatedAccount);
		});

		it('should save the account state in the database', async () => {
			await stateStore.account.finalize();

			expect(storageStub.entities.Account.upsert).toHaveBeenCalledWith(
				{ address: defaultAccounts[0].address },
				{ secondPublicKey, secondSignature },
				null,
				undefined,
			);
		});
	});
});
