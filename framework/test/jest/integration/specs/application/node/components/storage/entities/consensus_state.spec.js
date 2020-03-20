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

'use strict';

const {
	StorageSandbox,
} = require('../../../../../../../../utils/storage/storage_sandbox');
const seeder = require('../../../../../../../../utils/storage/storage_seed');
const {
	entities: { BaseEntity },
} = require('../../../../../../../../../src/components/storage');
const {
	ConsensusStateEntity: ConsensusState,
} = require('../../../../../../../../../src/application/storage/entities');

const { config } = require('../../../../../modules/shared');

const getAllState = async adapter =>
	adapter.execute('select * from consensus_state;');

describe('ConsensusState', () => {
	const storage = new StorageSandbox(
		config.components.storage,
		'lisk_test_chain_module_storage_consensus_state',
	);
	const validSQLs = ['upsert', 'get', 'delete'];
	const validFields = ['key', 'value'];
	const validFilters = ['key', 'key_eql', 'key_ne'];

	let adapter;
	let ConsensusStateEntity;

	beforeAll(async () => {
		await storage.bootstrap();

		({ adapter } = storage);
		ConsensusStateEntity = storage.entities.ConsensusState;
	});

	afterAll(async () => {
		storage.cleanup();
	});

	afterEach(async () => {
		await seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(ConsensusState.prototype.constructor).not.toBeNull();
		expect(ConsensusState.prototype.constructor.name).toEqual('ConsensusState');
	});

	it('should extend BaseEntity', async () => {
		expect(ConsensusState.prototype instanceof BaseEntity).toBeTruthy();
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(ConsensusState.prototype.constructor).toHaveLength(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof ConsensusStateEntity.parseFilters).toEqual('function');
			expect(typeof ConsensusStateEntity.addFilter).toEqual('function');
			expect(typeof ConsensusStateEntity.addField).toEqual('function');
			expect(typeof ConsensusStateEntity.getFilters).toEqual('function');
			expect(typeof ConsensusStateEntity.getUpdateSet).toEqual('function');
			expect(typeof ConsensusStateEntity.getValuesSet).toEqual('function');
			expect(typeof ConsensusStateEntity.begin).toEqual('function');
			expect(typeof ConsensusStateEntity.validateFilters).toEqual('function');
			expect(typeof ConsensusStateEntity.validateOptions).toEqual('function');
		});

		it('should assign proper sql', async () => {
			expect(Object.keys(ConsensusStateEntity.SQLs)).toEqual(validSQLs);
		});

		it('should call addField the exact number of times', async () => {
			jest.spyOn(ConsensusState.prototype, 'addField');
			// eslint-disable-next-line no-new
			new ConsensusState(adapter);

			expect(ConsensusState.prototype.addField).toHaveBeenCalledTimes(
				Object.keys(ConsensusStateEntity.fields).length,
			);
		});

		it('should setup correct fields', async () => {
			expect(Object.keys(ConsensusStateEntity.fields)).toEqual(validFields);
		});

		it('should setup specific filters', async () => {
			expect(ConsensusStateEntity.getFilters()).toEqual(validFilters);
		});
	});

	describe('get', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ConsensusStateEntity.setKey(data1.key, data1.value);
			await ConsensusStateEntity.setKey(data2.key, data2.value);
		});

		it('should return the all key value pairs without filters', async () => {
			const result = await getAllState(ConsensusStateEntity.adapter);
			expect(await ConsensusStateEntity.get()).toEqual(result);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ConsensusStateEntity.get({ key: data1.key })).toEqual([
				data1,
			]);
		});

		it('should return empty array if no matching result found', async () => {
			expect(await ConsensusStateEntity.get({ key: 'custom-key' })).toEqual([]);
		});
	});

	describe('getOne', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ConsensusStateEntity.setKey(data1.key, data1.value);
			await ConsensusStateEntity.setKey(data2.key, data2.value);
		});

		it('should reject with error if provided without filters', async () => {
			await expect(ConsensusStateEntity.getOne()).rejects.toThrow(
				'Multiple rows were not expected.',
			);
		});

		it('should return matching result with provided filters', async () => {
			expect(await ConsensusStateEntity.getOne({ key: data1.key })).toEqual(
				data1,
			);
		});

		it('should reject with error if provided filter does not match', async () => {
			await expect(
				ConsensusStateEntity.getOne({ key: 'custom-key' }),
			).rejects.toThrow('No data returned from the query.');
		});
	});

	describe('getKey', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ConsensusStateEntity.setKey(data1.key, data1.value);
			await ConsensusStateEntity.setKey(data2.key, data2.value);
		});

		it('should resolve with error when invoked without key', async () => {
			await expect(ConsensusStateEntity.getKey()).rejects.toThrow(
				'Must provide the key to get',
			);
		});

		it('should return matching result value with provided filters', async () => {
			expect(await ConsensusStateEntity.getKey(data1.key)).toEqual(data1.value);
		});

		it('should resolve with null if provided filter does not match', async () => {
			expect(await ConsensusStateEntity.getKey('custom-key')).toBeNull();
		});
	});

	describe('setKey', () => {
		it('should resolve with error when invoked without key', async () => {
			await expect(ConsensusStateEntity.setKey()).rejects.toThrow(
				'Must provide the key to set',
			);
		});

		it('should resolve with error when invoked without value', async () => {
			await expect(ConsensusStateEntity.setKey('myKey')).rejects.toThrow(
				'Must provide the value to set',
			);
		});

		it('should create key value pair if not exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			await ConsensusStateEntity.setKey(key, value);

			const result = await getAllState(ConsensusStateEntity.adapter);

			expect(result).toEqual([{ key, value }]);
		});

		it('should update the value if key already exists', async () => {
			const key = 'myKey';
			const value = 'myValue';
			const updatedValue = 'myUpdatedValue';

			await ConsensusStateEntity.setKey(key, value);
			await ConsensusStateEntity.setKey(key, updatedValue);

			const result = await getAllState(ConsensusStateEntity.adapter);
			expect(result).toEqual([{ key, value: updatedValue }]);
		});
	});

	describe('delete', () => {
		const data1 = { key: 'myKey1', value: 'myValue' };
		const data2 = { key: 'myKey2', value: 'myValue' };

		beforeEach(async () => {
			await ConsensusStateEntity.setKey(data1.key, data1.value);
			await ConsensusStateEntity.setKey(data2.key, data2.value);
		});

		it('should delete the matching key record from database', async () => {
			// Before delete verify they exists
			expect(await getAllState(ConsensusStateEntity.adapter)).toEqual([
				data1,
				data2,
			]);

			await ConsensusStateEntity.delete({ key: data1.key });

			expect(await getAllState(ConsensusStateEntity.adapter)).toEqual([data2]);
		});

		it('should not throw error if no matching record found', async () => {
			const nonExistingKey = 'nonExistingKey';

			await expect(
				ConsensusStateEntity.delete({ key: nonExistingKey }),
			).resolves.toBeNull();
		});
	});
});
