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
	ForgerInfo,
} = require('../../../../../../../../../src/modules/chain/components/storage/entities');

const { config } = require('../../../../shared');

const getAllState = async adapter =>
	adapter.execute('select * from forger_info;');

describe('ForgerInfo', () => {
	const storage = new StorageSandbox(
		config.components.storage,
		'lisk_test_chain_module_storage_forger_info',
	);
	const validSQLs = ['upsert', 'get', 'delete'];
	const validFields = ['key', 'value'];
	const validFilters = ['key', 'key_eql', 'key_ne'];

	let adapter;
	let ForgerInfoEntity;

	beforeAll(async () => {
		await storage.bootstrap();

		({ adapter } = storage);
		ForgerInfoEntity = storage.entities.ForgerInfo;
	});

	afterAll(async () => {
		storage.cleanup();
	});

	afterEach(async () => {
		await seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(ForgerInfo.prototype.constructor).not.toBeNull();
		expect(ForgerInfo.prototype.constructor.name).toEqual('ForgerInfo');
	});

	it('should extend BaseEntity', async () => {
		expect(ForgerInfo.prototype instanceof BaseEntity).toBeTruthy();
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(ForgerInfo.prototype.constructor.length).toEqual(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof ForgerInfoEntity.parseFilters).toEqual('function');
			expect(typeof ForgerInfoEntity.addFilter).toEqual('function');
			expect(typeof ForgerInfoEntity.addField).toEqual('function');
			expect(typeof ForgerInfoEntity.getFilters).toEqual('function');
			expect(typeof ForgerInfoEntity.getUpdateSet).toEqual('function');
			expect(typeof ForgerInfoEntity.getValuesSet).toEqual('function');
			expect(typeof ForgerInfoEntity.begin).toEqual('function');
			expect(typeof ForgerInfoEntity.validateFilters).toEqual('function');
			expect(typeof ForgerInfoEntity.validateOptions).toEqual('function');
		});

		it('should assign proper sql', async () => {
			expect(Object.keys(ForgerInfoEntity.SQLs)).toEqual(validSQLs);
		});

		it('should call addField the exact number of times', async () => {
			jest.spyOn(ForgerInfo.prototype, 'addField');
			// eslint-disable-next-line no-new
			new ForgerInfo(adapter);

			expect(ForgerInfo.prototype.addField).toHaveBeenCalledTimes(
				Object.keys(ForgerInfoEntity.fields).length,
			);
		});

		it('should setup correct fields', async () => {
			expect(Object.keys(ForgerInfoEntity.fields)).toEqual(validFields);
		});

		it('should setup specific filters', async () => {
			expect(ForgerInfoEntity.getFilters()).toEqual(validFilters);
		});
	});

	describe('get', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ForgerInfoEntity.setKey(data1.key, data1.value);
			await ForgerInfoEntity.setKey(data2.key, data2.value);
		});

		it('should return the all key value pairs without filters', async () => {
			const result = await getAllState(ForgerInfoEntity.adapter);
			expect(await ForgerInfoEntity.get()).toEqual(result);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ForgerInfoEntity.get({ key: data1.key })).toEqual([data1]);
		});

		it('should return empty array if no matching result found', async () => {
			expect(await ForgerInfoEntity.get({ key: 'custom-key' })).toEqual([]);
		});
	});

	describe('getOne', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ForgerInfoEntity.setKey(data1.key, data1.value);
			await ForgerInfoEntity.setKey(data2.key, data2.value);
		});

		it('should reject with error if provided without filters', async () => {
			await expect(ForgerInfoEntity.getOne()).rejects.toThrow(
				'Multiple rows were not expected.',
			);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ForgerInfoEntity.getOne({ key: data1.key })).toEqual(data1);
		});

		it('should reject with error if provided filter does not match', async () => {
			await expect(
				ForgerInfoEntity.getOne({ key: 'custom-key' }),
			).rejects.toThrow('No data returned from the query.');
		});
	});

	describe('getKey', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ForgerInfoEntity.setKey(data1.key, data1.value);
			await ForgerInfoEntity.setKey(data2.key, data2.value);
		});

		it('should resolve with error when invoked without key', async () => {
			expect(ForgerInfoEntity.getKey()).rejects.toThrow(
				'Must provide the key to get',
			);
		});

		it('should return matching result value with provided filters', async () => {
			expect(await ForgerInfoEntity.getKey(data1.key)).toEqual(data1.value);
		});

		it('should resolve with null if provided filter does not match', async () => {
			expect(await ForgerInfoEntity.getKey('custom-key')).toBeNull();
		});
	});

	describe('setKey', () => {
		it('should resolve with error when invoked without key', async () => {
			expect(ForgerInfoEntity.setKey()).rejects.toThrow(
				'Must provide the key to set',
			);
		});

		it('should resolve with error when invoked without value', async () => {
			expect(ForgerInfoEntity.setKey('myKey')).rejects.toThrow(
				'Must provide the value to set',
			);
		});

		it('should create key value pair if not exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			await ForgerInfoEntity.setKey(key, value);

			const result = await getAllState(ForgerInfoEntity.adapter);

			expect(result).toEqual([{ key, value }]);
		});

		it('should update the value if key already exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			const updatedValue = 'myUpdatedValue';

			await ForgerInfoEntity.setKey(key, value);
			await ForgerInfoEntity.setKey(key, updatedValue);

			const result = await getAllState(ForgerInfoEntity.adapter);
			expect(result).toEqual([{ key, value: updatedValue }]);
		});
	});

	describe('delete', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ForgerInfoEntity.setKey(data1.key, data1.value);
			await ForgerInfoEntity.setKey(data2.key, data2.value);
		});

		it('should delete the matching key record from database', async () => {
			// Before delete verify they exists
			expect(await getAllState(ForgerInfoEntity.adapter)).toEqual([
				data1,
				data2,
			]);

			await ForgerInfoEntity.delete({ key: data1.key });

			expect(await getAllState(ForgerInfoEntity.adapter)).toEqual([data2]);
		});

		it('should not throw error if no matching record found', async () => {
			const nonExistingKey = 'nonExistingKey';

			await expect(
				ForgerInfoEntity.delete({ key: nonExistingKey }),
			).resolves.toBeNull();
		});
	});
});
