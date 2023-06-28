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
import {  Database, Batch } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { StateStore } from '../../../src/state_store';
import { DataAccess } from '../../../src/data_access';
import { BlockHeader, StateDiff } from '../../../src/types';
import { defaultAccount, defaultAccountSchema } from '../../utils/account';
import { defaultNetworkIdentifier, registeredBlockHeaders } from '../../utils/block';

jest.mock('@liskhq/lisk-db');

describe('state store / chain_state', () => {
	let stateStore: StateStore;
	let db: any;

	const lastBlockHeaders = ([
		{ height: 30 },
		{ height: 20 },
	] as unknown) as ReadonlyArray<BlockHeader>;

	beforeEach(() => {
		db = new Database('temp');
		const dataAccess = new DataAccess({
			db,
			accountSchema: defaultAccountSchema,
			registeredBlockHeaders,
			maxBlockHeaderCache: 505,
			minBlockHeaderCache: 309,
		});
		stateStore = new StateStore(dataAccess, {
			lastBlockHeaders,
			networkIdentifier: defaultNetworkIdentifier,
			defaultAccount,
			lastBlockReward: BigInt(500000000),
		});
	});

	describe('lastBlockHeader', () => {
		it('should have first element as lastBlockHeaders', () => {
			expect(stateStore.chain.lastBlockHeaders).toEqual(lastBlockHeaders);
		});
	});

	describe('networkIdentifier', () => {
		it('should have first element as lastBlockHeader', () => {
			expect(stateStore.chain.networkIdentifier).toEqual(defaultNetworkIdentifier);
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
			await stateStore.chain.set('key1', Buffer.from('value1'));
			when(db.get)
				.calledWith(Buffer.from('chain:key1'))
				.mockResolvedValue('value5' as never);
			// Act & Assert
			expect(await stateStore.chain.get('key1')).toEqual(Buffer.from('value1'));
		});

		it('should try to get value from database if not in cache', async () => {
			// Arrange
			when(db.get)
				.calledWith(Buffer.from('chain:key1'))
				.mockResolvedValue('value5' as never);
			// Act & Assert
			expect(await stateStore.chain.get('key1')).toEqual('value5');
		});
	});

	describe('set', () => {
		it('should set value to data and set the updated keys', async () => {
			// Act
			await stateStore.chain.set('key3', Buffer.from('value3'));
			// Assert
			expect(await stateStore.chain.get('key3')).toEqual(Buffer.from('value3'));
			expect((stateStore.chain as any)._updatedKeys.size).toBe(1);
		});

		it('should set value to data and set the updated keys only once', async () => {
			// Act
			await stateStore.chain.set('key3', Buffer.from('value3'));
			await stateStore.chain.set('key3', Buffer.from('value4'));
			// Assert
			expect(await stateStore.chain.get('key3')).toEqual(Buffer.from('value4'));
			expect((stateStore.chain as any)._updatedKeys.size).toBe(1);
		});
	});

	describe('finalize', () => {
		let batchStub: Batch;
		let stateDiff: StateDiff;

		beforeEach(() => {
			batchStub = { set: jest.fn() } as any;
		});

		it('should not call storage if nothing is set', () => {
			// Act
			stateStore.chain.finalize(batchStub);
			// Assert
			expect(batchStub.set).not.toHaveBeenCalled();
		});

		it('should call storage for all the updated keys', async () => {
			// Act
			await stateStore.chain.set('key3', Buffer.from('value3'));
			await stateStore.chain.set('key3', Buffer.from('value4'));
			await stateStore.chain.set('key4', Buffer.from('value5'));
			stateDiff = stateStore.chain.finalize(batchStub);
			// Assert
			expect(batchStub.set).toHaveBeenCalledWith(Buffer.from('chain:key3'), Buffer.from('value4'));
			expect(batchStub.set).toHaveBeenCalledWith(Buffer.from('chain:key4'), Buffer.from('value5'));
		});

		it('should return state diff with created and updated values after finalize', async () => {
			const originalValue = Buffer.from('original-value');
			(stateStore.chain as any)['_initialValue'] = { existing: originalValue };
			// Act
			await stateStore.chain.set('existing', Buffer.from('value-new'));
			await stateStore.chain.set('key3', Buffer.from('value3'));
			await stateStore.chain.set('key3', Buffer.from('value4'));
			await stateStore.chain.set('key4', Buffer.from('value5'));
			stateDiff = stateStore.chain.finalize(batchStub);
			expect(stateDiff).toStrictEqual({
				updated: [
					{
						key: 'chain:existing',
						value: originalValue,
					},
				],
				created: ['chain:key3', 'chain:key4'],
				deleted: [],
			});
		});
	});
});
