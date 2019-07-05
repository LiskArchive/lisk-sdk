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
	BlockTemp,
} = require('../../../../../../../../../src/modules/chain/components/storage/entities');

const { config } = require('../../shared');

describe('BlockTemp', () => {
	const storage = new StorageSandbox(
		config.components.storage,
		'lisk_test_chain_module_storage_block_temp'
	);
	const validSQLs = ['create', 'delete', 'get'];
	const validFields = ['id', 'height', 'fullBlock'];
	const validFilters = [
		'id',
		'id_eql',
		'id_ne',
		'id_in',
		'id_like',
		'height',
		'height_eql',
		'height_ne',
		'height_gt',
		'height_gte',
		'height_lt',
		'height_lte',
		'height_in',
	];

	let adapter;
	let BlockTempEntity;

	const row1 = {
		id: '6524861224470851795',
		height: 1,
		fullBlock: {
			version: 0,
			totalAmount: '10000000000000000',
			totalFee: '0',
			reward: '0',
			payloadHash:
				'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
			timestamp: 0,
			numberOfTransactions: 103,
			payloadLength: 19619,
			previousBlock: null,
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			transactions: [],
			height: 1,
			blockSignature:
				'c81204bf67474827fd98584e7787084957f42ce8041e713843dd2bb352b73e81143f68bd74b06da8372c43f5e26406c4e7250bbd790396d85dea50d448d62606',
			id: '6524861224470851795',
		},
	};

	const row2 = {
		id: '1524861224470851795',
		height: 2,
		fullBlock: {
			version: 0,
			totalAmount: '10000000000000000',
			totalFee: '0',
			reward: '0',
			payloadHash:
				'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
			timestamp: 0,
			numberOfTransactions: 103,
			payloadLength: 19619,
			previousBlock: null,
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			transactions: [
				{
					type: 0,
					amount: '10000000000000000',
					fee: '0',
					timestamp: 0,
					recipientId: '16313739661670634666L',
					senderId: '1085993630748340485L',
					senderPublicKey:
						'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
					signature:
						'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
					id: '1465651642158264047',
				},
			],
			height: 2,
			blockSignature:
				'c81204bf67474827fd98584e7787084957f42ce8041e713843dd2bb352b73e81143f68bd74b06da8372c43f5e26406c4e7250bbd790396d85dea50d448d62606',
			id: '6524861224470851795',
		},
	};
	beforeAll(async () => {
		await storage.bootstrap();

		adapter = storage.adapter;
		BlockTempEntity = storage.entities.BlockTemp;
	});

	afterAll(async () => {
		storage.cleanup();
	});

	beforeEach(async () => {
		await BlockTempEntity.create(row1);
		await BlockTempEntity.create(row2);
	});

	afterEach(async () => {
		await seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(BlockTemp.prototype.constructor).not.toBeNull();
		expect(BlockTemp.prototype.constructor.name).toEqual('BlockTemp');
	});

	it('should extend BaseEntity', async () => {
		expect(BlockTemp.prototype instanceof BaseEntity).toBeTruthy();
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(BlockTemp.prototype.constructor.length).toEqual(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof BlockTempEntity.parseFilters).toEqual('function');
			expect(typeof BlockTempEntity.addFilter).toEqual('function');
			expect(typeof BlockTempEntity.addField).toEqual('function');
			expect(typeof BlockTempEntity.getFilters).toEqual('function');
			expect(typeof BlockTempEntity.getUpdateSet).toEqual('function');
			expect(typeof BlockTempEntity.getValuesSet).toEqual('function');
			expect(typeof BlockTempEntity.begin).toEqual('function');
			expect(typeof BlockTempEntity.validateFilters).toEqual('function');
			expect(typeof BlockTempEntity.validateOptions).toEqual('function');
		});

		it('should assign proper sql', async () => {
			expect(Object.keys(BlockTempEntity.SQLs)).toEqual(validSQLs);
		});

		it('should call addField the exact number of times', async () => {
			jest.spyOn(BlockTemp.prototype, 'addField');
			new BlockTemp(adapter);

			expect(BlockTemp.prototype.addField).toHaveBeenCalledTimes(
				Object.keys(BlockTempEntity.fields).length
			);
		});

		it('should setup correct fields', async () => {
			expect(Object.keys(BlockTempEntity.fields)).toEqual(validFields);
		});

		it('should setup specific filters', async () => {
			expect(BlockTempEntity.getFilters()).toEqual(validFilters);
		});
	});

	describe('get', () => {
		const expectedResult = [row1, row2];

		it('should return the all key value pairs without filters', async () => {
			expect(await BlockTempEntity.get()).toEqual(expectedResult);
		});

		it('should return matching result with provided filters', async () => {
			expect(await BlockTempEntity.get({ height: row1.height })).toEqual([
				row1,
			]);
		});

		it('should return empty array if no matching result found', async () => {
			expect(await BlockTempEntity.get({ height: 3 })).toEqual([]);
		});
	});

	describe('getOne', () => {
		it('should reject with error if provided without filters', async () => {
			await expect(BlockTempEntity.getOne()).rejects.toThrow(
				'Multiple rows were not expected.'
			);
		});

		it('should return matching result with provided filters', async () => {
			expect(await BlockTempEntity.getOne({ id: row1.id })).toEqual(row1);
		});

		it('should reject with error if provided filter does not match', async () => {
			await expect(BlockTempEntity.getOne({ height: 10 })).rejects.toThrow(
				'No data returned from the query.'
			);
		});
	});

	describe('delete', () => {
		it('should delete the matching row from database', async () => {
			await BlockTempEntity.delete({ height: row2.height });

			expect(await BlockTempEntity.get()).toEqual([row1]);
		});

		it('should not throw error if no matching record found', async () => {
			const height = 5;

			await expect(BlockTempEntity.delete({ height })).resolves.toBeNull();
		});
	});
});
