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
} = require('../../../../../../../../utils/storage/storage_sandbox');
const seeder = require('../../../../../../../../utils/storage/storage_seed');
const {
	entities: { BaseEntity },
} = require('../../../../../../../../../src/components/storage');
const {
	TempBlock,
} = require('../../../../../../../../../src/controller/node/components/storage/entities');

const { config } = require('../../../../../modules/shared');

describe('TempBlock', () => {
	const storage = new StorageSandbox(
		config.components.storage,
		'lisk_test_chain_module_storage_temp_block',
	);
	const validSQLs = ['create', 'delete', 'get', 'truncate', 'isEmpty'];
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
	let TempBlockEntity;

	const row1 = {
		id: '10620616195853047363',
		height: 1,
		fullBlock: {
			version: 0,
			totalAmount: '10000000000000000',
			totalFee: '0',
			reward: '0',
			payloadHash:
				'23ce0366ef0a14a91e5fd4b1591fc880ffbef9d988ff8bebf8f3666b0c09597d',
			timestamp: 0,
			numberOfTransactions: 103,
			payloadLength: 19619,
			previousBlockId: null,
			generatorPublicKey:
				'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b',
			transactions: [],
			height: 1,
			blockSignature:
				'c81204bf67474827fd98584e7787084957f42ce8041e713843dd2bb352b73e81143f68bd74b06da8372c43f5e26406c4e7250bbd790396d85dea50d448d62606',
			id: '10620616195853047363',
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
				'23ce0366ef0a14a91e5fd4b1591fc880ffbef9d988ff8bebf8f3666b0c09597d',
			timestamp: 0,
			numberOfTransactions: 103,
			payloadLength: 19619,
			previousBlockId: null,
			generatorPublicKey:
				'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b',
			transactions: [
				{
					type: 0,
					amount: '10000000000000000',
					fee: '0',
					timestamp: 0,
					recipientId: '11237980039345381032L',
					senderId: '1276152240083265771L',
					senderPublicKey:
						'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b',
					signature:
						'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
					id: '7646387794267587684',
				},
			],
			height: 2,
			blockSignature:
				'c81204bf67474827fd98584e7787084957f42ce8041e713843dd2bb352b73e81143f68bd74b06da8372c43f5e26406c4e7250bbd790396d85dea50d448d62606',
			id: '10620616195853047363',
		},
	};
	beforeAll(async () => {
		await storage.bootstrap();

		({ adapter } = storage);
		TempBlockEntity = storage.entities.TempBlock;
	});

	afterAll(async () => {
		storage.cleanup();
	});

	beforeEach(async () => {
		await TempBlockEntity.create(row1);
		await TempBlockEntity.create(row2);
	});

	afterEach(async () => {
		await seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(TempBlock.prototype.constructor).not.toBeNull();
		expect(TempBlock.prototype.constructor.name).toEqual('TempBlock');
	});

	it('should extend BaseEntity', async () => {
		expect(TempBlock.prototype instanceof BaseEntity).toBeTruthy();
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(TempBlock.prototype.constructor).toHaveLength(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof TempBlockEntity.parseFilters).toEqual('function');
			expect(typeof TempBlockEntity.addFilter).toEqual('function');
			expect(typeof TempBlockEntity.addField).toEqual('function');
			expect(typeof TempBlockEntity.getFilters).toEqual('function');
			expect(typeof TempBlockEntity.getUpdateSet).toEqual('function');
			expect(typeof TempBlockEntity.getValuesSet).toEqual('function');
			expect(typeof TempBlockEntity.begin).toEqual('function');
			expect(typeof TempBlockEntity.validateFilters).toEqual('function');
			expect(typeof TempBlockEntity.validateOptions).toEqual('function');
		});

		it('should assign proper sql', async () => {
			expect(Object.keys(TempBlockEntity.SQLs)).toEqual(validSQLs);
		});

		it('should call addField the exact number of times', async () => {
			jest.spyOn(TempBlock.prototype, 'addField');
			// eslint-disable-next-line no-new
			new TempBlock(adapter);

			expect(TempBlock.prototype.addField).toHaveBeenCalledTimes(
				Object.keys(TempBlockEntity.fields).length,
			);
		});

		it('should setup correct fields', async () => {
			expect(Object.keys(TempBlockEntity.fields)).toEqual(validFields);
		});

		it('should setup specific filters', async () => {
			expect(TempBlockEntity.getFilters()).toEqual(validFilters);
		});
	});

	describe('get', () => {
		const expectedResult = [row1, row2];

		it('should return the all key value pairs without filters', async () => {
			expect(await TempBlockEntity.get()).toEqual(expectedResult);
		});

		it('should return matching result with provided filters', async () => {
			expect(await TempBlockEntity.get({ height: row1.height })).toEqual([
				row1,
			]);
		});

		it('should return empty array if no matching result found', async () => {
			expect(await TempBlockEntity.get({ height: 3 })).toEqual([]);
		});
	});

	describe('getOne', () => {
		it('should reject with error if provided without filters', async () => {
			await expect(TempBlockEntity.getOne()).rejects.toThrow(
				'Multiple rows were not expected.',
			);
		});

		it('should return matching result with provided filters', async () => {
			expect(await TempBlockEntity.getOne({ id: row1.id })).toEqual(row1);
		});

		it('should reject with error if provided filter does not match', async () => {
			await expect(TempBlockEntity.getOne({ height: 10 })).rejects.toThrow(
				'No data returned from the query.',
			);
		});
	});

	describe('delete', () => {
		it('should delete the matching row from database', async () => {
			await TempBlockEntity.delete({ height: row2.height });

			expect(await TempBlockEntity.get()).toEqual([row1]);
		});

		it('should not throw error if no matching record found', async () => {
			const height = 5;

			await expect(TempBlockEntity.delete({ height })).resolves.toBeNull();
		});
	});

	describe('truncate', () => {
		it('should truncate all rows from table', async () => {
			await TempBlockEntity.truncate();

			expect(await TempBlockEntity.get()).toEqual([]);
		});
	});

	describe('isEmpty', () => {
		it('should return false if table is not empty', async () => {
			const isEmpty = await TempBlockEntity.isEmpty();

			expect(isEmpty).toEqual(false); // Row 1 and Row 2
		});

		it('should return true if table is empty', async () => {
			await TempBlockEntity.truncate();
			const isEmpty = await TempBlockEntity.isEmpty();

			expect(isEmpty).toEqual(true);
		});
	});
});
