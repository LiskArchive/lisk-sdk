/*
 * Copyright © 2018 Lisk Foundation
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

const {
	StorageSandbox,
} = require('../../../../../../../../mocha/common/storage_sandbox');
const seeder = require('../../../../../../../../mocha/common/storage_seed');
const {
	entities: { BaseEntity },
} = require('../../../../../../../../../src/components/storage');
const {
	ChainState,
} = require('../../../../../../../../../src/modules/chain/components/storage/entities');

const { config } = require('../../../../shared');

const getAllState = async adapter =>
	adapter.execute('select * from chain_state;');

describe('ChainState', () => {
	const storage = new StorageSandbox(
		config.components.storage,
		'lisk_test_chain_module_storage_chain_state',
	);
	const validSQLs = ['upsert', 'get', 'delete'];
	const validFields = ['key', 'value'];
	const validFilters = ['key', 'key_eql', 'key_ne'];

	let adapter;
	let ChainStateEntity;

	beforeAll(async () => {
		await storage.bootstrap();

		({ adapter } = storage);
		ChainStateEntity = storage.entities.ChainState;
	});

	afterAll(async () => {
		storage.cleanup();
	});

	afterEach(async () => {
		await seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(ChainState.prototype.constructor).not.toBeNull();
		expect(ChainState.prototype.constructor.name).toEqual('ChainState');
	});

	it('should extend BaseEntity', async () => {
		expect(ChainState.prototype instanceof BaseEntity).toBeTruthy();
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(ChainState.prototype.constructor.length).toEqual(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof ChainStateEntity.parseFilters).toEqual('function');
			expect(typeof ChainStateEntity.addFilter).toEqual('function');
			expect(typeof ChainStateEntity.addField).toEqual('function');
			expect(typeof ChainStateEntity.getFilters).toEqual('function');
			expect(typeof ChainStateEntity.getUpdateSet).toEqual('function');
			expect(typeof ChainStateEntity.getValuesSet).toEqual('function');
			expect(typeof ChainStateEntity.begin).toEqual('function');
			expect(typeof ChainStateEntity.validateFilters).toEqual('function');
			expect(typeof ChainStateEntity.validateOptions).toEqual('function');
		});

		it('should assign proper sql', async () => {
			expect(Object.keys(ChainStateEntity.SQLs)).toEqual(validSQLs);
		});

		it('should call addField the exact number of times', async () => {
			jest.spyOn(ChainState.prototype, 'addField');
			// eslint-disable-next-line no-new
			new ChainState(adapter);

			expect(ChainState.prototype.addField).toHaveBeenCalledTimes(
				Object.keys(ChainStateEntity.fields).length,
			);
		});

		it('should setup correct fields', async () => {
			expect(Object.keys(ChainStateEntity.fields)).toEqual(validFields);
		});

		it('should setup specific filters', async () => {
			expect(ChainStateEntity.getFilters()).toEqual(validFilters);
		});
	});

	describe('get', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ChainStateEntity.setKey(data1.key, data1.value);
			await ChainStateEntity.setKey(data2.key, data2.value);
		});

		it('should return the all key value pairs without filters', async () => {
			const result = await getAllState(ChainStateEntity.adapter);
			expect(await ChainStateEntity.get()).toEqual(result);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ChainStateEntity.get({ key: data1.key })).toEqual([data1]);
		});

		it('should return empty array if no matching result found', async () => {
			expect(await ChainStateEntity.get({ key: 'custom-key' })).toEqual([]);
		});
	});

	describe('getOne', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ChainStateEntity.setKey(data1.key, data1.value);
			await ChainStateEntity.setKey(data2.key, data2.value);
		});

		it('should reject with error if provided without filters', async () => {
			await expect(ChainStateEntity.getOne()).rejects.toThrow(
				'Multiple rows were not expected.',
			);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ChainStateEntity.getOne({ key: data1.key })).toEqual(data1);
		});

		it('should reject with error if provided filter does not match', async () => {
			await expect(
				ChainStateEntity.getOne({ key: 'custom-key' }),
			).rejects.toThrow('No data returned from the query.');
		});
	});

	describe('getKey', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ChainStateEntity.setKey(data1.key, data1.value);
			await ChainStateEntity.setKey(data2.key, data2.value);
		});

		it('should resolve with error when invoked without key', async () => {
			expect(ChainStateEntity.getKey()).rejects.toThrow(
				'Must provide the key to get',
			);
		});

		it('should return matching result value with provided filters', async () => {
			expect(await ChainStateEntity.getKey(data1.key)).toEqual(data1.value);
		});

		it('should resolve with null if provided filter does not match', async () => {
			expect(await ChainStateEntity.getKey('custom-key')).toBeNull();
		});
	});

	describe('setKey', () => {
		it('should resolve with error when invoked without key', async () => {
			expect(ChainStateEntity.setKey()).rejects.toThrow(
				'Must provide the key to set',
			);
		});

		it('should resolve with error when invoked without value', async () => {
			expect(ChainStateEntity.setKey('myKey')).rejects.toThrow(
				'Must provide the value to set',
			);
		});

		it('should create key value pair if not exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			await ChainStateEntity.setKey(key, value);

			const result = await getAllState(ChainStateEntity.adapter);

			expect(result).toEqual([{ key, value }]);
		});

		it('should update the value if key already exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			const updatedValue = 'myUpdatedValue';

			await ChainStateEntity.setKey(key, value);
			await ChainStateEntity.setKey(key, updatedValue);

			const result = await getAllState(ChainStateEntity.adapter);
			expect(result).toEqual([{ key, value: updatedValue }]);
		});
	});

	describe('delete', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ChainStateEntity.setKey(data1.key, data1.value);
			await ChainStateEntity.setKey(data2.key, data2.value);
		});

		it('should delete the matching key record from database', async () => {
			// Before delete verify they exists
			expect(await getAllState(ChainStateEntity.adapter)).toEqual([
				data1,
				data2,
			]);

			await ChainStateEntity.delete({ key: data1.key });

			expect(await getAllState(ChainStateEntity.adapter)).toEqual([data2]);
		});

		it('should not throw error if no matching record found', async () => {
			const nonExistingKey = 'nonExistingKey';

			await expect(
				ChainStateEntity.delete({ key: nonExistingKey }),
			).resolves.toBeNull();
		});
	});
});
