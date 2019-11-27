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

describe('state store / transactions', () => {
	const defaultTransactions = [
		{ id: '7646387794267587684', senderPublicKey: 'public-key-1' },
		{ id: '9912090348171005050', senderPublicKey: 'public-key-2' },
	];

	let stateStore;
	let storageStub;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Transaction: {
					get: jest.fn(),
				},
			},
		};
		stateStore = new StateStore(storageStub);
	});

	describe('cache', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Transaction.get.mockResolvedValue(
				defaultTransactions,
			);
		});

		it('should call storage get and store in cache', async () => {
			// Act
			const filter = [
				{ id: defaultTransactions[0].id },
				{ id: defaultTransactions[1].id },
			];
			const results = await stateStore.transaction.cache(filter);
			// Assert
			expect(results).toHaveLength(2);
			expect(results.map(tx => tx.id)).toStrictEqual([
				defaultTransactions[0].id,
				defaultTransactions[1].id,
			]);
		});

		it('should cache to the state store', async () => {
			// Act
			const filter = [
				{ id: defaultTransactions[0].id },
				{ id: defaultTransactions[1].id },
			];
			await stateStore.transaction.cache(filter);
			// Assert
			expect(stateStore.transaction.data).toStrictEqual(defaultTransactions);
		});
	});

	describe('get', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Transaction.get.mockResolvedValue(
				defaultTransactions,
			);
			const filter = [
				{ id: defaultTransactions[0].id },
				{ id: defaultTransactions[1].id },
			];
			await stateStore.transaction.cache(filter);
		});

		it('should get the transaction', async () => {
			// Act
			const tx = stateStore.transaction.get(defaultTransactions[0].id);
			// Assert
			expect(tx).toStrictEqual(defaultTransactions[0]);
		});

		it('should throw an error if not exist', async () => {
			// Act
			expect.assertions(1);
			try {
				stateStore.transaction.get('123');
			} catch (err) {
				expect(err.message).toContain('does not exist');
			}
		});
	});

	describe('getOrDefault', () => {
		it('should throw an error', async () => {
			// Act
			expect.assertions(1);
			try {
				stateStore.transaction.getOrDefault('123');
			} catch (err) {
				expect(err.message).toContain('cannot be called');
			}
		});
	});

	describe('set', () => {
		it('should throw an error', async () => {
			// Act
			expect.assertions(1);
			try {
				stateStore.transaction.set('123', { id: '456' });
			} catch (err) {
				expect(err.message).toContain('cannot be called');
			}
		});
	});

	describe('finalize', () => {
		it('should throw an error', async () => {
			// Act
			expect.assertions(1);
			try {
				await stateStore.transaction.finalize();
			} catch (err) {
				expect(err.message).toContain('cannot be called');
			}
		});
	});
});
