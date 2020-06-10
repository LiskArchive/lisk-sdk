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
import { KVStore, BatchChain } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { StateStore } from '../../../src';
import { DataAccess } from '../../../src/data_access';
import { BlockHeader } from '../../../src/types';
import { baseAccountSchema } from '../../../src/schema';
import {
	defaultAccountAssetSchema,
	createFakeDefaultAccount,
} from '../../utils/account';
import {
	defaultNetworkIdentifier,
	defaultBlockHeaderAssetSchema,
} from '../../utils/block';

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
			lastBlockHeaders,
			networkIdentifier: defaultNetworkIdentifier,
			defaultAsset: createFakeDefaultAccount().asset,
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
				defaultNetworkIdentifier,
			);
		});
	});

	describe('lastBlockReward', () => {
		it('should have reward given at the initialization', () => {
			expect(stateStore.chain.lastBlockReward.toString()).toEqual('500000000');
		});
	});

	describe('get', () => {
		it('should get value from cache', async () => {
			// Arrange
			stateStore.chain.set('key1', Buffer.from('value1'));
			when(db.get)
				.calledWith('chain:key1')
				.mockResolvedValue('value5' as never);
			// Act & Assert
			expect(await stateStore.chain.get('key1')).toEqual(Buffer.from('value1'));
		});

		it('should try to get value from database if not in cache', async () => {
			// Arrange
			when(db.get)
				.calledWith('chain:key1')
				.mockResolvedValue('value5' as never);
			// Act & Assert
			expect(await stateStore.chain.get('key1')).toEqual('value5');
		});
	});

	describe('set', () => {
		it('should set value to data and set the updated keys', async () => {
			// Act
			stateStore.chain.set('key3', Buffer.from('value3'));
			// Assert
			expect(await stateStore.chain.get('key3')).toEqual(Buffer.from('value3'));
			expect((stateStore.chain as any)._updatedKeys.size).toBe(1);
		});

		it('should set value to data and set the updated keys only once', async () => {
			// Act
			stateStore.chain.set('key3', Buffer.from('value3'));
			stateStore.chain.set('key3', Buffer.from('value4'));
			// Assert
			expect(await stateStore.chain.get('key3')).toEqual(Buffer.from('value4'));
			expect((stateStore.chain as any)._updatedKeys.size).toBe(1);
		});
	});

	describe('finalize', () => {
		let batchStub: BatchChain;

		beforeEach(() => {
			batchStub = { put: jest.fn() } as any;
		});

		it('should not call storage if nothing is set', () => {
			// Act
			stateStore.chain.finalize(batchStub);
			// Assert
			expect(batchStub.put).not.toHaveBeenCalled();
		});

		it('should call storage for all the updated keys', () => {
			// Act
			stateStore.chain.set('key3', Buffer.from('value3'));
			stateStore.chain.set('key3', Buffer.from('value4'));
			stateStore.chain.set('key4', Buffer.from('value5'));
			stateStore.chain.finalize(batchStub);
			// Assert
			expect(batchStub.put).toHaveBeenCalledWith(
				'chain:key3',
				Buffer.from('value4'),
			);
			expect(batchStub.put).toHaveBeenCalledWith(
				'chain:key4',
				Buffer.from('value5'),
			);
		});
	});
});
