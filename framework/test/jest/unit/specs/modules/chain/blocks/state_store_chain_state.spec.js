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

describe('state store / chain_state', () => {
	let stateStore;
	let storageStub;

	beforeEach(async () => {
		storageStub = {
			entities: {
				ChainState: {
					get: jest.fn(),
					setKey: jest.fn(),
				},
			},
		};
		stateStore = new StateStore(storageStub);
	});

	describe('cache', () => {
		it('should call storage get and store in cache', async () => {
			// Arrange
			storageStub.entities.ChainState.get.mockResolvedValue([
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			]);
			// Act
			await stateStore.chainState.cache();
			// Assert
			expect(stateStore.chainState.get('key1')).toBe('value1');
			expect(stateStore.chainState.get('key2')).toBe('value2');
		});
	});

	describe('set', () => {
		it('should set value to data and set the updated keys', async () => {
			// Act
			await stateStore.chainState.set('key3', 'value3');
			// Assert
			expect(stateStore.chainState.get('key3')).toBe('value3');
			expect(stateStore.chainState.updatedKeys.size).toBe(1);
		});

		it('should set value to data and set the updated keys only once', async () => {
			// Act
			await stateStore.chainState.set('key3', 'value3');
			await stateStore.chainState.set('key3', 'value4');
			// Assert
			expect(stateStore.chainState.get('key3')).toBe('value4');
			expect(stateStore.chainState.updatedKeys.size).toBe(1);
		});
	});

	describe('finalize', () => {
		it('should not call storage if nothing is set', async () => {
			// Act
			await stateStore.chainState.finalize();
			// Assert
			expect(storageStub.entities.ChainState.setKey).not.toHaveBeenCalled();
		});

		it('should call storage for all the updated keys', async () => {
			// Act
			await stateStore.chainState.set('key3', 'value3');
			await stateStore.chainState.set('key3', 'value4');
			await stateStore.chainState.set('key4', 'value5');
			await stateStore.chainState.finalize();
			// Assert
			expect(storageStub.entities.ChainState.setKey).toHaveBeenCalledWith(
				'key3',
				'value4',
				undefined,
			);
			expect(storageStub.entities.ChainState.setKey).toHaveBeenCalledWith(
				'key4',
				'value5',
				undefined,
			);
		});
	});
});
