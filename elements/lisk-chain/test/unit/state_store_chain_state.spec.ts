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

	beforeEach(() => {
		storageStub = {
			entities: {
				ChainState: {
					get: jest.fn(),
					getKey: jest.fn(),
					setKey: jest.fn(),
				},
			},
		};
		stateStore = new StateStore(storageStub, {
			lastBlockHeaders,
			networkIdentifier: 'network-identifier-chain-1',
			lastBlockReward: BigInt(500000000),
		});
	});

	describe('lastBlockHeader', () => {
		it('should have first element as lastBlockHeader', () => {
			expect(stateStore.chain.lastBlockHeader).toEqual({ height: 30 });
		});
	});

	describe('networkIdentifier', () => {
		it('should have first element as lastBlockHeader', () => {
			expect(stateStore.chain.networkIdentifier).toEqual(
				'network-identifier-chain-1',
			);
		});
	});

	describe('lastBlockReward', () => {
		it('should have reward given at the initialization', () => {
			expect(stateStore.chain.lastBlockReward.toString()).toEqual('500000000');
		});
	});

	describe('cache', () => {
		it('should call storage get and store in cache', async () => {
			// Arrange
			storageStub.entities.ChainState.get.mockResolvedValue([
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			]);
			// Act
			await stateStore.chain.cache();
			// Assert
			expect(await stateStore.chain.get('key1')).toBe('value1');
			expect(await stateStore.chain.get('key2')).toBe('value2');
		});
	});

	describe('get', () => {
		it('should get value from cache', async () => {
			// Arrange
			storageStub.entities.ChainState.get.mockResolvedValue([
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			]);
			await stateStore.chain.cache();
			// Act & Assert
			expect(await stateStore.chain.get('key1')).toEqual('value1');
		});

		it('should try to get value from database if not in cache', async () => {
			// Arrange
			storageStub.entities.ChainState.get.mockResolvedValue([
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			]);
			await stateStore.chain.cache();
			// Act
			await stateStore.chain.get('key3');
			// Assert
			expect(storageStub.entities.ChainState.getKey.mock.calls[0]).toEqual([
				'key3',
			]);
		});
	});

	describe('set', () => {
		it('should set value to data and set the updated keys', async () => {
			// Act
			stateStore.chain.set('key3', 'value3');
			// Assert
			expect(await stateStore.chain.get('key3')).toBe('value3');
			expect((stateStore.chain as any)._updatedKeys.size).toBe(1);
		});

		it('should set value to data and set the updated keys only once', async () => {
			// Act
			stateStore.chain.set('key3', 'value3');
			stateStore.chain.set('key3', 'value4');
			// Assert
			expect(await stateStore.chain.get('key3')).toBe('value4');
			expect((stateStore.chain as any)._updatedKeys.size).toBe(1);
		});
	});

	describe('finalize', () => {
		const txStub = {} as StorageTransaction;

		it('should not call storage if nothing is set', async () => {
			// Act
			await stateStore.chain.finalize(txStub);
			// Assert
			expect(storageStub.entities.ChainState.setKey).not.toHaveBeenCalled();
		});

		it('should call storage for all the updated keys', async () => {
			// Act
			stateStore.chain.set('key3', 'value3');
			stateStore.chain.set('key3', 'value4');
			stateStore.chain.set('key4', 'value5');
			await stateStore.chain.finalize(txStub);
			// Assert
			expect(storageStub.entities.ChainState.setKey).toHaveBeenCalledWith(
				'key3',
				'value4',
				txStub,
			);
			expect(storageStub.entities.ChainState.setKey).toHaveBeenCalledWith(
				'key4',
				'value5',
				txStub,
			);
		});

		it('should handle promise rejection', async () => {
			// Prepare
			storageStub.entities.ChainState.setKey.mockImplementation(async () =>
				Promise.reject(new Error('Fake storage layer error')),
			);
			// Act
			stateStore.chain.set('key3', 'value3');
			// Assert
			return expect(stateStore.chain.finalize(txStub)).rejects.toThrow(
				'Fake storage layer error',
			);
		});
	});
});
