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
	NetworkInfo,
} = require('../../../../../../../../../src/modules/network/components/storage/entities');

const { config } = require('../../../../shared');

const getAllState = async adapter =>
	adapter.execute('select * from network_info;');

describe('NetworkInfo', () => {
	const storage = new StorageSandbox(
		config.components.storage,
		'lisk_test_chain_module_storage_network_info',
	);
	const validSQLs = ['upsert', 'get', 'delete'];
	const validFields = ['key', 'value'];
	const validFilters = ['key', 'key_eql', 'key_ne'];

	let adapter;
	let NetworkInfoEntity;

	beforeAll(async () => {
		await storage.bootstrap();

		({ adapter } = storage);
		NetworkInfoEntity = storage.entities.NetworkInfo;
	});

	afterAll(async () => {
		storage.cleanup();
	});

	afterEach(async () => {
		await seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(NetworkInfo.prototype.constructor).not.toBeNull();
		expect(NetworkInfo.prototype.constructor.name).toEqual('NetworkInfo');
	});

	it('should extend BaseEntity', async () => {
		expect(NetworkInfo.prototype instanceof BaseEntity).toBeTruthy();
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(NetworkInfo.prototype.constructor).toHaveLength(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof NetworkInfoEntity.parseFilters).toEqual('function');
			expect(typeof NetworkInfoEntity.addFilter).toEqual('function');
			expect(typeof NetworkInfoEntity.addField).toEqual('function');
			expect(typeof NetworkInfoEntity.getFilters).toEqual('function');
			expect(typeof NetworkInfoEntity.getUpdateSet).toEqual('function');
			expect(typeof NetworkInfoEntity.getValuesSet).toEqual('function');
			expect(typeof NetworkInfoEntity.begin).toEqual('function');
			expect(typeof NetworkInfoEntity.validateFilters).toEqual('function');
			expect(typeof NetworkInfoEntity.validateOptions).toEqual('function');
		});

		it('should assign proper sql', async () => {
			expect(Object.keys(NetworkInfoEntity.SQLs)).toEqual(validSQLs);
		});

		it('should call addField the exact number of times', async () => {
			jest.spyOn(NetworkInfo.prototype, 'addField');
			// eslint-disable-next-line no-new
			new NetworkInfo(adapter);

			expect(NetworkInfo.prototype.addField).toHaveBeenCalledTimes(
				Object.keys(NetworkInfoEntity.fields).length,
			);
		});

		it('should setup correct fields', async () => {
			expect(Object.keys(NetworkInfoEntity.fields)).toEqual(validFields);
		});

		it('should setup specific filters', async () => {
			expect(NetworkInfoEntity.getFilters()).toEqual(validFilters);
		});
	});

	describe('get', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await NetworkInfoEntity.setKey(data1.key, data1.value);
			await NetworkInfoEntity.setKey(data2.key, data2.value);
		});

		it('should return the all key value pairs without filters', async () => {
			const result = await getAllState(NetworkInfoEntity.adapter);
			expect(await NetworkInfoEntity.get()).toEqual(result);
		});

		it('should return matching result with provided filters', async () => {
			expect(await NetworkInfoEntity.get({ key: data1.key })).toEqual([data1]);
		});

		it('should return empty array if no matching result found', async () => {
			expect(await NetworkInfoEntity.get({ key: 'custom-key' })).toEqual([]);
		});
	});

	describe('getOne', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await NetworkInfoEntity.setKey(data1.key, data1.value);
			await NetworkInfoEntity.setKey(data2.key, data2.value);
		});

		it('should reject with error if provided without filters', async () => {
			await expect(NetworkInfoEntity.getOne()).rejects.toThrow(
				'Multiple rows were not expected.',
			);
		});

		it('should return matching result with provided filters', async () => {
			expect(await NetworkInfoEntity.getOne({ key: data1.key })).toEqual(data1);
		});

		it('should reject with error if provided filter does not match', async () => {
			await expect(
				NetworkInfoEntity.getOne({ key: 'custom-key' }),
			).rejects.toThrow('No data returned from the query.');
		});
	});

	describe('getKey', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await NetworkInfoEntity.setKey(data1.key, data1.value);
			await NetworkInfoEntity.setKey(data2.key, data2.value);
		});

		it('should resolve with error when invoked without key', async () => {
			expect(NetworkInfoEntity.getKey()).rejects.toThrow(
				'Must provide the key to get',
			);
		});

		it('should return matching result value with provided filters', async () => {
			expect(await NetworkInfoEntity.getKey(data1.key)).toEqual(data1.value);
		});

		it('should resolve with null if provided filter does not match', async () => {
			expect(await NetworkInfoEntity.getKey('custom-key')).toBeNull();
		});
	});

	describe('setKey', () => {
		it('should resolve with error when invoked without key', async () => {
			expect(NetworkInfoEntity.setKey()).rejects.toThrow(
				'Must provide the key to set',
			);
		});

		it('should resolve with error when invoked without value', async () => {
			expect(NetworkInfoEntity.setKey('myKey')).rejects.toThrow(
				'Must provide the value to set',
			);
		});

		it('should create key value pair if not exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			await NetworkInfoEntity.setKey(key, value);

			const result = await getAllState(NetworkInfoEntity.adapter);

			expect(result).toEqual([{ key, value }]);
		});

		it('should update the value if key already exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			const updatedValue = 'myUpdatedValue';

			await NetworkInfoEntity.setKey(key, value);
			await NetworkInfoEntity.setKey(key, updatedValue);

			const result = await getAllState(NetworkInfoEntity.adapter);
			expect(result).toEqual([{ key, value: updatedValue }]);
		});
	});

	describe('delete', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await NetworkInfoEntity.setKey(data1.key, data1.value);
			await NetworkInfoEntity.setKey(data2.key, data2.value);
		});

		it('should delete the matching key record from database', async () => {
			// Before delete verify they exists
			expect(await getAllState(NetworkInfoEntity.adapter)).toEqual([
				data1,
				data2,
			]);

			await NetworkInfoEntity.delete({ key: data1.key });

			expect(await getAllState(NetworkInfoEntity.adapter)).toEqual([data2]);
		});

		it('should not throw error if no matching record found', async () => {
			const nonExistingKey = 'nonExistingKey';

			await expect(
				NetworkInfoEntity.delete({ key: nonExistingKey }),
			).resolves.toBeNull();
		});
	});
});
