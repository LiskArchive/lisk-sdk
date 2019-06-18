/* eslint-disable mocha/no-pending-tests */
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
	ChainMeta,
} = require('../../../../../../../../../src/modules/chain/components/storage/entities');

const testConfig = require('../../../../../../../../fixtures/config/devnet/config');

const getAllMeta = async adapter =>
	adapter.execute('select * from chain_meta;');

describe('ChainMeta', () => {
	let adapter;
	let storage;
	let ChainMetaEntity;

	const validSQLs = ['create', 'update', 'upsert', 'get'];

	const validFields = ['key', 'value'];

	const validFilters = ['key', 'key_eql', 'key_ne'];

	beforeAll(async () => {
		storage = new StorageSandbox(
			testConfig.components.storage,
			'lisk_test_storage_custom_round_chain_module'
		);
		await storage.bootstrap();

		adapter = storage.adapter;
		ChainMetaEntity = storage.entities.ChainMeta;
	});

	afterEach(async () => {
		await seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(ChainMeta.prototype.constructor).not.toBeNull();
		expect(ChainMeta.prototype.constructor.name).toEqual('ChainMeta');
	});

	it('should extend BaseEntity', async () => {
		expect(ChainMeta.prototype instanceof BaseEntity).toBeTruthy();
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(ChainMeta.prototype.constructor.length).toEqual(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof ChainMetaEntity.parseFilters).toEqual('function');
			expect(typeof ChainMetaEntity.addFilter).toEqual('function');
			expect(typeof ChainMetaEntity.addField).toEqual('function');
			expect(typeof ChainMetaEntity.getFilters).toEqual('function');
			expect(typeof ChainMetaEntity.getUpdateSet).toEqual('function');
			expect(typeof ChainMetaEntity.getValuesSet).toEqual('function');
			expect(typeof ChainMetaEntity.begin).toEqual('function');
			expect(typeof ChainMetaEntity.validateFilters).toEqual('function');
			expect(typeof ChainMetaEntity.validateOptions).toEqual('function');
		});

		it('should assign proper sql', async () => {
			expect(Object.keys(ChainMetaEntity.SQLs)).toEqual(validSQLs);
		});

		it('should call addField the exact number of times', async () => {
			jest.spyOn(ChainMeta.prototype, 'addField');
			new ChainMeta(adapter);

			expect(ChainMeta.prototype.addField).toHaveBeenCalledTimes(
				Object.keys(ChainMetaEntity.fields).length
			);
		});

		it('should setup correct fields', async () => {
			expect(Object.keys(ChainMetaEntity.fields)).toEqual(validFields);
		});

		it('should setup specific filters', async () => {
			expect(ChainMetaEntity.getFilters()).toEqual(validFilters);
		});
	});

	describe('create', () => {
		it('should create a key value pair', async () => {
			const data = { key: 'myKey', value: 'myValue' };
			await ChainMetaEntity.create(data);
			const result = await getAllMeta(ChainMetaEntity.adapter);

			expect(result).toEqual([data]);
		});

		it('should be rejected if key already exists', async () => {
			const data = { key: 'myKey', value: 'myValue' };
			await ChainMetaEntity.create(data);

			await expect(ChainMetaEntity.create(data)).rejects.toThrow(
				'duplicate key value violates unique constraint "chain_meta_pkey"'
			);
		});
	});

	describe('update', () => {
		it('should update a value if key exists', async () => {
			const data = { key: 'myKey', value: 'myValue' };
			// First create the value
			await ChainMetaEntity.create(data);

			// Verify its created
			const result = await getAllMeta(ChainMetaEntity.adapter);
			expect(result).toEqual([data]);

			// Now update the value
			const dataToUpdate = {
				key: 'myKey',
				value: 'updatedValue',
			};
			await ChainMetaEntity.update(dataToUpdate);

			// Verify if its updated
			const result2 = await getAllMeta(ChainMetaEntity.adapter);
			expect(result2).toEqual([dataToUpdate]);
		});

		it('should not be rejected if key does not exists', async () => {
			const data = { key: 'myKey', value: 'myValue' };

			// Update the data without creating it first
			expect(ChainMetaEntity.update(data)).rejects.toThrow();
		});
	});

	describe('upsert', () => {
		it('should create key value pair if not exists', async () => {
			const data = { key: 'myKey', value: 'myValue' };
			await ChainMetaEntity.upsert(data);

			const result = await getAllMeta(ChainMetaEntity.adapter);

			expect(result).toEqual([data]);
		});

		it('should update the value if key already exists', async () => {
			const data = { key: 'myKey', value: 'myValue' };
			await ChainMetaEntity.create(data);

			const data2 = { key: 'myKey', value: 'myUpdatedValue' };
			await ChainMetaEntity.upsert(data2);

			const result = await getAllMeta(ChainMetaEntity.adapter);
			expect(result).toEqual([data2]);
		});
	});

	describe('get', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ChainMetaEntity.create(data1);
			await ChainMetaEntity.create(data2);
		});

		it('should return the all key value pairs without filters', async () => {
			const result = await getAllMeta(ChainMetaEntity.adapter);
			expect(await ChainMetaEntity.get()).toEqual(result);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ChainMetaEntity.get({ key: data1.key })).toEqual([data1]);
		});

		it('should return empty array if no matching result found', async () => {
			expect(await ChainMetaEntity.get({ key: 'custom-key' })).toEqual([]);
		});
	});

	describe('getOne', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ChainMetaEntity.create(data1);
			await ChainMetaEntity.create(data2);
		});

		it('should reject with error if provided without filters', async () => {
			await expect(ChainMetaEntity.getOne()).rejects.toThrow(
				'Multiple rows were not expected.'
			);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ChainMetaEntity.getOne({ key: data1.key })).toEqual(data1);
		});

		it('should reject with error if provided filter does not match', async () => {
			await expect(
				ChainMetaEntity.getOne({ key: 'custom-key' })
			).rejects.toThrow('No data returned from the query.');
		});
	});

	describe('fetch', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ChainMetaEntity.create(data1);
			await ChainMetaEntity.create(data2);
		});

		it('should resolve with null if invoked without key', async () => {
			expect(await ChainMetaEntity.fetch()).toBeNull();
		});

		it('should return matching result value with provided filters', async () => {
			expect(await ChainMetaEntity.fetch(data1.key)).toEqual(data1.value);
		});

		it('should resolve with null if provided filter does not match', async () => {
			expect(await ChainMetaEntity.fetch('custom-key')).toBeNull();
		});
	});
});
