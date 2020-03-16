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
import { StateStore } from '../../src';
import { StorageTransaction, BlockHeader } from '../../src/types';

describe('state store / chain_state', () => {
	let stateStore: StateStore;
	let storageStub: any;

	const lastBlockHeaders = ([
		{ height: 30 },
		{ height: 20 },
	] as unknown) as ReadonlyArray<BlockHeader>;

	beforeEach(async () => {
		storageStub = {
			entities: {
				ConsensusState: {
					get: jest.fn(),
					getKey: jest.fn(),
					setKey: jest.fn(),
				},
			},
		};
		stateStore = new StateStore(storageStub, {
			lastBlockHeaders,
			networkIdentifier: 'network-identifier-chain-1',
		});
	});

	describe('lastBlockHeaders', () => {
		it('should have first element as lastBlockHeader', async () => {
			expect(stateStore.consensus.lastBlockHeaders).toEqual(lastBlockHeaders);
		});
	});

	describe('cache', () => {
		it('should call storage get and store in cache', async () => {
			// Arrange
			storageStub.entities.ConsensusState.get.mockResolvedValue([
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			]);
			// Act
			await stateStore.consensus.cache();
			// Assert
			expect(await stateStore.consensus.get('key1')).toBe('value1');
			expect(await stateStore.consensus.get('key2')).toBe('value2');
		});
	});

	describe('get', () => {
		it('should get value from cache', async () => {
			// Arrange
			storageStub.entities.ConsensusState.get.mockResolvedValue([
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			]);
			await stateStore.consensus.cache();
			// Act & Assert
			expect(await stateStore.consensus.get('key1')).toEqual('value1');
		});

		it('should try to get value from database if not in cache', async () => {
			// Arrange
			storageStub.entities.ConsensusState.get.mockResolvedValue([
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			]);
			await stateStore.consensus.cache();
			// Act
			await stateStore.consensus.get('key3');
			// Assert
			expect(storageStub.entities.ConsensusState.getKey.mock.calls[0]).toEqual([
				'key3',
			]);
		});
	});

	describe('set', () => {
		it('should set value to data and set the updated keys', async () => {
			// Act
			await stateStore.consensus.set('key3', 'value3');
			// Assert
			expect(await stateStore.consensus.get('key3')).toBe('value3');
			expect((stateStore.consensus as any)._updatedKeys.size).toBe(1);
		});

		it('should set value to data and set the updated keys only once', async () => {
			// Act
			await stateStore.consensus.set('key3', 'value3');
			await stateStore.consensus.set('key3', 'value4');
			// Assert
			expect(await stateStore.consensus.get('key3')).toBe('value4');
			expect((stateStore.consensus as any)._updatedKeys.size).toBe(1);
		});
	});

	describe('finalize', () => {
		let txStub = {} as StorageTransaction;

		it('should not call storage if nothing is set', async () => {
			// Act
			await stateStore.consensus.finalize(txStub);
			// Assert
			expect(storageStub.entities.ConsensusState.setKey).not.toHaveBeenCalled();
		});

		it('should call storage for all the updated keys', async () => {
			// Act
			await stateStore.consensus.set('key3', 'value3');
			await stateStore.consensus.set('key3', 'value4');
			await stateStore.consensus.set('key4', 'value5');
			await stateStore.consensus.finalize(txStub);
			// Assert
			expect(storageStub.entities.ConsensusState.setKey).toHaveBeenCalledWith(
				'key3',
				'value4',
				txStub,
			);
			expect(storageStub.entities.ConsensusState.setKey).toHaveBeenCalledWith(
				'key4',
				'value5',
				txStub,
			);
		});

		it('should handle promise rejection', async () => {
			// Prepare
			storageStub.entities.ConsensusState.setKey.mockImplementation(() =>
				Promise.reject(new Error('Fake storage layer error')),
			);
			// Act
			await stateStore.consensus.set('key3', 'value3');
			// Assert
			return expect(stateStore.consensus.finalize(txStub)).rejects.toThrow(
				'Fake storage layer error',
			);
		});
	});
});
