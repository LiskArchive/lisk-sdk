/*
 * Copyright © 2020 Lisk Foundation
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
import { KVStore, BatchChain } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { StateStore } from '../../src';
import { BlockHeader } from '../../src/types';
import { DataAccess } from '../../src/data_access';

jest.mock('@liskhq/lisk-db');

describe('state store / chain_state', () => {
	let stateStore: StateStore;
	let db: any;

	const lastBlockHeaders = ([
		{ height: 30 },
		{ height: 20 },
	] as unknown) as ReadonlyArray<BlockHeader>;

	beforeEach(() => {
		db = new KVStore('temp');
		const dataAccess = new DataAccess({
			db,
			maxBlockHeaderCache: 505,
			minBlockHeaderCache: 309,
			registeredTransactions: {},
		});
		stateStore = new StateStore(dataAccess, {
			lastBlockHeaders,
			networkIdentifier: 'network-identifier-chain-1',
			lastBlockReward: BigInt(500000000),
		});
	});

	describe('lastBlockHeaders', () => {
		it('should have first element as lastBlockHeader', () => {
			expect(stateStore.consensus.lastBlockHeaders).toEqual(lastBlockHeaders);
		});
	});

	describe('get', () => {
		it('should get value from cache', async () => {
			// Arrange
			stateStore.consensus.set('key1', 'value1');
			when(db.get)
				.calledWith('consensus:key1')
				.mockResolvedValue('value5' as never);
			// Act & Assert
			expect(await stateStore.consensus.get('key1')).toEqual('value1');
		});

		it('should try to get value from database if not in cache', async () => {
			// Arrange
			when(db.get)
				.calledWith('consensus:key1')
				.mockResolvedValue('value5' as never);
			// Act & Assert
			expect(await stateStore.consensus.get('key1')).toEqual('value5');
		});
	});

	describe('set', () => {
		it('should set value to data and set the updated keys', async () => {
			// Act
			stateStore.consensus.set('key3', 'value3');
			// Assert
			expect(await stateStore.consensus.get('key3')).toBe('value3');
			expect((stateStore.consensus as any)._updatedKeys.size).toBe(1);
		});

		it('should set value to data and set the updated keys only once', async () => {
			// Act
			stateStore.consensus.set('key3', 'value3');
			stateStore.consensus.set('key3', 'value4');
			// Assert
			expect(await stateStore.consensus.get('key3')).toBe('value4');
			expect((stateStore.consensus as any)._updatedKeys.size).toBe(1);
		});
	});

	describe('finalize', () => {
		let batchStub: BatchChain;

		beforeEach(() => {
			batchStub = { put: jest.fn() } as any;
		});

		it('should not call storage if nothing is set', () => {
			// Act
			stateStore.consensus.finalize(batchStub);
			// Assert
			expect(batchStub.put).not.toHaveBeenCalled();
		});

		it('should call storage for all the updated keys', () => {
			// Act
			stateStore.consensus.set('key3', 'value3');
			stateStore.consensus.set('key3', 'value4');
			stateStore.consensus.set('key4', 'value5');
			stateStore.consensus.finalize(batchStub);
			// Assert
			expect(batchStub.put).toHaveBeenCalledWith('consensus:key3', 'value4');
			expect(batchStub.put).toHaveBeenCalledWith('consensus:key4', 'value5');
		});
	});
});
