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
	entities: { BaseEntity },
	errors: { NonSupportedFilterTypeError, NonSupportedOperationError },
} = require('../../../../../../../../src/components/storage');
const {
	Block,
} = require('../../../../../../../../src/modules/chain/components/storage/entities');
const storageSandbox = require('../../../../../../common/storage_sandbox');
const blocksFixtures = require('../../../../../../fixtures/blocks');

describe('Block', () => {
	let adapter;
	let validBlockSQLs;
	let invalidFilter;
	let validFilter;
	let validBlock;
	let invalidBlock;
	let storage;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.components.storage,
			'lisk_test_storage_custom_block_chain_module'
		);
		await storage.bootstrap();

		validBlockSQLs = ['create', 'delete', 'getFirstBlockIdOfLastRounds'];

		invalidFilter = {
			invalid: true,
			filter: true,
		};

		validFilter = {
			id: '7807109686729042739',
		};

		validBlock = {
			id: '7807109686729042739',
			height: 1,
			blockSignature:
				'a47d07d3a8d8024eb44672bc6d07cdcd1cd03803d9612b7b10c10d5a844fb8f6ed11fab5159b6d9826b7302c3d3f5d7d29d13b40e6fe59c9374f4ec94af4eb0f',
			generatorPublicKey:
				'73ec4adbd8f99f0d46794aeda3c3d86b245bd9d27be2b282cdd38ad21988556b',
			payloadHash:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			payloadLength: 19619,
			numberOfTransactions: 103,
			previousBlockId: null,
			timestamp: 0,
			totalAmount: '10000000000000000',
			totalFee: '0',
			reward: '0',
			version: '0',
		};

		invalidBlock = {
			id: null,
			height: '1',
			blockSignature: '',
			generatorPublicKey: '',
			payloadHash: '',
			payloadLength: 0,
			numberOfTransactions: 25,
			previousBlockId: '',
			timestamp: 0,
			totalAmount: '',
			totalFee: '0',
			reward: '0',
			version: 0,
		};

		adapter = storage.adapter;
	});

	afterEach(async () => {
		sinonSandbox.reset();
		await storageSandbox.clearDatabaseTable(storage, storage.logger, 'blocks');
	});

	it('should be a constructable function', async () => {
		expect(Block.prototype.constructor).to.be.not.null;
		expect(Block.prototype.constructor.name).to.be.eql('ChainBlock');
	});

	it('should extend BaseEntity', async () => {
		expect(Block.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Block.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const block = new Block(adapter);
			expect(typeof block.parseFilters).to.be.eql('function');
			expect(typeof block.addFilter).to.be.eql('function');
			expect(typeof block.addField).to.be.eql('function');
			expect(typeof block.getFilters).to.be.eql('function');
			expect(typeof block.getUpdateSet).to.be.eql('function');
			expect(typeof block.getValuesSet).to.be.eql('function');
			expect(typeof block.begin).to.be.eql('function');
			expect(typeof block.validateFilters).to.be.eql('function');
			expect(typeof block.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const block = new Block(adapter);
			expect(block.SQLs).to.include.all.keys(validBlockSQLs);
		});
	});

	describe('create()', () => {
		it('should call getValuesSet with proper params', async () => {
			const localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					create: 'create SQL file',
				}),
				executeFile: sinonSandbox.stub().resolves([validBlock]),
				parseQueryComponent: sinonSandbox.stub(),
			};

			const block = new Block(localAdapter);
			block.getValuesSet = sinonSandbox.stub();
			block.create(validBlock);
			expect(block.getValuesSet.calledWith([validBlock])).to.be.true;
		});

		it('should create a block object successfully', async () => {
			await storage.entities.Block.create(validBlock);
			const result = await storage.entities.Block.getOne({
				id: validBlock.id,
			});
			expect(result).to.be.eql({
				...validBlock,
				confirmations: 1,
			});
		});

		it('should skip if any invalid attribute is provided');

		it('should reject with invalid data provided', async () => {
			return expect(
				storage.entities.Block.create(invalidBlock)
			).to.eventually.be.rejectedWith('invalid input syntax for integer: ""');
		});

		it('should create multiple objects successfully', async () => {
			// Arrange
			const block = new Block(adapter);
			const blocks = [new blocksFixtures.Block(), new blocksFixtures.Block()];
			// Act
			await block.create(blocks);
			const savedBlocks = await block.get({
				id_in: [blocks[0].id, blocks[1].id],
			});
			// Assert
			expect(savedBlocks).length.to.be(2);
		});
	});

	describe('update()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Block.prototype.update).to.throw(NonSupportedOperationError);
		});
	});

	describe('updateOne()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Block.prototype.updateOne).to.throw(NonSupportedOperationError);
		});
	});

	describe('delete', () => {
		let localAdapter;
		const deleteSqlFile = 'delete SQL File';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					isPersisted: deleteSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves([validBlock]),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});
		it('should accept only valid filters', async () => {
			const block = new Block(adapter);
			expect(() => {
				block.delete(validFilter, validBlock);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const block = new Block(adapter);
			expect(() => {
				block.delete(invalidFilter, validBlock);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			const block = new Block(localAdapter);
			block.mergeFilters = sinonSandbox.stub();
			block.parseFilters = sinonSandbox.stub();
			block.delete(validFilter);
			expect(block.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const block = new Block(localAdapter);
			block.mergeFilters = sinonSandbox.stub().returns(validFilter);
			block.parseFilters = sinonSandbox.stub();
			block.delete(validFilter);
			expect(block.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should only delete records specified by filter', async () => {
			// Arrange
			const block = new Block(adapter);
			const blocks = [new blocksFixtures.Block(), new blocksFixtures.Block()];

			// Act
			await block.create(blocks);
			await block.delete({
				id: blocks[0].id,
			});
			const remainingBlock = await block.getOne({
				id: blocks[1].id,
			});
			// Assert
			expect(remainingBlock).to.exist;
		});

		it('should delete all records if no filter is specified', async () => {
			// Arrange
			const block = new Block(adapter);
			const blocks = [new blocksFixtures.Block(), new blocksFixtures.Block()];

			// Act
			await block.create(blocks);
			await block.delete();
			const remainingBlock = await block.get();
			// Assert
			expect(remainingBlock).to.be.empty;
		});
	});

	describe('getFirstBlockIdOfLastRounds', () => {
		it('should get first block id of last rounds');
	});
});
