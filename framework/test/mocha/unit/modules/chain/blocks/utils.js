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

const crypto = require('crypto');
const BigNum = require('@liskhq/bignum');
const blocksUtils = require('../../../../../../src/modules/chain/blocks/utils');
const blocksLogic = require('../../../../../../src/modules/chain/blocks/block');

describe('blocks/utils', () => {
	const genesisBlock = {
		id: '6524861224470851795',
		height: 1,
	};

	const fullBlocksListRows = [
		{
			b_id: '13068833527549895884',
			b_height: 3, // Block 1
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '6950874693022090568',
			t_type: 0,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
		{
			b_id: '13068833527549895884',
			b_height: 3, // Block 1
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '13831767660337349834',
			t_type: 1,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
		{
			b_id: '7018883617995376402',
			b_height: 4, // Block 2
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '10550826199952791739',
			t_type: 2,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
		{
			b_id: '7018883617995376402',
			b_height: 4, // Block 2
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '3502881310841638511',
			t_type: 3,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
	];

	const storageBlocksListRows = [
		{
			id: '13068833527549895884',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 3, // Block 1
			version: 0,
			transactions: [
				{
					id: '6950874693022090568',
					type: 5,
					asset: {
						dapp: {
							category: 0,
							description: 'my app desc',
							icon: 'app.icon',
							link: 'app-link.com',
							name: 'App Name',
							tags: null,
							type: 0,
						},
					},
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
		{
			id: '13068833527549895884',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 3, // Block 1
			version: '0',
			transactions: [
				{
					id: '13831767660337349834',
					type: 1,
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
		{
			id: '7018883617995376402',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 4, // Block 2
			version: '1',
			transactions: [
				{
					id: '10550826199952791739',
					type: 2,
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
		{
			id: '7018883617995376402',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 4, // Block 2
			version: 1,
			transactions: [
				{
					id: '3502881310841638511',
					type: 3,
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
	];

	const lastBlock = { id: '9314232245035524467', height: 1 };

	let storageStub;
	let interfaceAdaptersMock;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					delegateBlocksRewards: sinonSandbox.stub().resolves(),
				},
				Block: {
					get: sinonSandbox.stub().resolves(['1']),
					getFirstBlockIdOfLastRounds: sinonSandbox
						.stub()
						.resolves([...storageBlocksListRows]),
				},
			},
		};

		interfaceAdaptersMock = {
			transactions: {
				dbRead(input) {
					return { id: input.t_id, type: input.t_type };
				},
				fromBlock(input) {
					return input;
				},
			},
		};
	});

	afterEach(() => sinonSandbox.restore());

	describe('readDbRows', () => {
		beforeEach(async () => {
			sinonSandbox.spy(blocksLogic, 'dbRead');
		});

		it('should call library.logic.block.dbRead with each block', async () => {
			blocksUtils.readDbRows(
				fullBlocksListRows,
				interfaceAdaptersMock,
				genesisBlock
			);

			fullBlocksListRows.forEach(block => {
				expect(blocksLogic.dbRead).to.have.callCount(4);
				expect(blocksLogic.dbRead).to.have.been.calledWith(block);
			});
		});

		it('should read an empty array', async () =>
			expect(blocksUtils.readDbRows([])).to.be.an('array'));

		describe('with 2 blocks each containing 2 transactions', () => {
			let blocks;

			beforeEach(async () => {
				blocks = blocksUtils.readDbRows(
					fullBlocksListRows,
					interfaceAdaptersMock,
					genesisBlock
				);
				expect(blocks).to.be.an('array');
			});

			it('should read the rows correctly', async () => {
				// Block 1
				expect(blocks[0]).to.be.an('object');
				expect(blocks[0].id).to.equal('13068833527549895884');
				expect(blocks[0].height).to.equal(3);
				expect(blocks[0].transactions).to.be.an('array');
				expect(blocks[0].transactions[0]).to.be.an('object');
				expect(blocks[0].transactions[0].id).to.equal('6950874693022090568');
				expect(blocks[0].transactions[0].type).to.equal(0);
				expect(blocks[0].transactions[1]).to.be.an('object');
				expect(blocks[0].transactions[1].id).to.equal('13831767660337349834');
				expect(blocks[0].transactions[1].type).to.equal(1);

				// Block 2
				expect(blocks[1]).to.be.an('object');
				expect(blocks[1].id).to.equal('7018883617995376402');
				expect(blocks[1].height).to.equal(4);
				expect(blocks[1].transactions).to.be.an('array');
				expect(blocks[1].transactions[0]).to.be.an('object');
				expect(blocks[1].transactions[0].id).to.equal('10550826199952791739');
				expect(blocks[1].transactions[0].type).to.equal(2);
				expect(blocks[1].transactions[1]).to.be.an('object');
				expect(blocks[1].transactions[1].id).to.equal('3502881310841638511');
				return expect(blocks[1].transactions[1].type).to.equal(3);
			});
		});

		it('should generate fake signature for genesis block', async () => {
			const genesisBlock_view_full_blocks_list = [
				{
					b_id: '6524861224470851795',
					b_height: 1,
					b_generatorPublicKey:
						'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
					t_id: '1465651642158264047',
					t_type: 0,
					b_totalAmount: 100,
					b_totalFee: 10,
					b_reward: 1,
					b_version: 1,
				},
				{
					b_id: '6524861224470851795',
					b_height: 1,
					b_generatorPublicKey:
						'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
					t_id: '3634383815892709956',
					t_type: 2,
					b_totalAmount: 100,
					b_totalFee: 10,
					b_reward: 1,
					b_version: 1,
				},
			];

			const blockObject = blocksUtils.readDbRows(
				genesisBlock_view_full_blocks_list,
				interfaceAdaptersMock,
				genesisBlock
			);

			expect(blockObject).to.be.an('array');
			expect(blockObject[0]).to.be.an('object');
			expect(blockObject[0].id).to.equal('6524861224470851795');
			return expect(blockObject[0].generationSignature).to.equal(
				'0000000000000000000000000000000000000000000000000000000000000000'
			);
		});
	});

	describe('loadBlocksPart', () => {
		it('should return error when library.storage.entities.Block.get fails', async () => {
			const expectedError = new Error('An error');
			storageStub.entities.Block.get
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.throws(expectedError);

			try {
				await blocksUtils.loadBlocksPart(
					storageStub,
					interfaceAdaptersMock,
					genesisBlock,
					{}
				);
			} catch (err) {
				expect(err).to.equal(expectedError);
			}
		});

		it('should return an array of blocks', async () => {
			storageStub.entities.Block.get
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.resolves([...storageBlocksListRows]);

			const blocks = await blocksUtils.loadBlocksPart(
				storageStub,
				interfaceAdaptersMock,
				genesisBlock,
				{}
			);
			expect(blocks).to.be.an('array');
			expect(blocks[0]).to.be.an('object');
			expect(blocks[0].id).to.equal('13068833527549895884');
		});
	});

	describe('loadLastBlock', () => {
		it('should return error when library.storage.entities.Block.get fails', async () => {
			storageStub.entities.Block.get.resolves(null);

			try {
				await blocksUtils.loadLastBlock(
					storageStub,
					interfaceAdaptersMock,
					genesisBlock
				);
			} catch (err) {
				expect(err.message).to.equal('Failed to load last block');
			}
		});

		describe('sorting the block.transactions array', () => {
			it('should return the block', async () => {
				storageStub.entities.Block.get.resolves([...storageBlocksListRows]);
				const block = await blocksUtils.loadLastBlock(
					storageStub,
					interfaceAdaptersMock,
					genesisBlock
				);

				expect(block).to.be.an('object');
				expect(block.id).to.equal('13068833527549895884');
			});
		});
	});

	describe('getIdSequence', () => {
		it('should call storage.entities.Block.getFirstBlockIdOfLastRounds with proper params', async () => {
			await blocksUtils.getIdSequence(
				storageStub,
				10,
				lastBlock,
				genesisBlock,
				101
			);
			expect(storageStub.entities.Block.getFirstBlockIdOfLastRounds).to.have
				.been.calledOnce;
			expect(
				storageStub.entities.Block.getFirstBlockIdOfLastRounds
			).to.have.been.calledWith({
				height: 10,
				numberOfRounds: 5,
				numberOfDelegates: 101,
			});
		});

		it('should return error when storage.entities.Block.getFirstBlockIdOfLastRounds fails', async () => {
			const message = 'Database went wrong';
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.rejects(
				new Error(message)
			);
			try {
				await blocksUtils.getIdSequence(storageStub, 10, {}, genesisBlock, 101);
			} catch (err) {
				expect(err.message).to.equal(message);
			}
		});

		it('should return error when no row is found', async () => {
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.resolves([]);
			try {
				await blocksUtils.getIdSequence(
					storageStub,
					10,
					lastBlock,
					genesisBlock,
					101
				);
			} catch (err) {
				expect(err.message).to.equal(
					'Failed to get id sequence for height: 10'
				);
			}
		});

		it('should return valid block id list', async () => {
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.resolves([
				{ id: 1, height: 2 },
				{ id: 2, height: 3 },
				{ id: 3, height: 4 },
				{ id: 4, height: 5 },
			]);
			const sequence = await blocksUtils.getIdSequence(
				storageStub,
				10,
				lastBlock,
				genesisBlock,
				101
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal(
				'9314232245035524467,1,2,3,4,6524861224470851795'
			);
		});

		it('should not add genesis block to the set when genesisBlock is undefined', async () => {
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.resolves([
				{ id: 1, height: 2 },
			]);

			const sequence = await blocksUtils.getIdSequence(
				storageStub,
				10,
				lastBlock,
				undefined,
				101
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal('9314232245035524467,1');
		});

		it('should not add genesis block to the set more than once', async () => {
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.resolves([
				{ id: '6524861224470851795', height: 1 },
			]);

			const sequence = await blocksUtils.getIdSequence(
				storageStub,
				10,
				lastBlock,
				genesisBlock,
				101
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal('9314232245035524467,6524861224470851795');
		});

		it('should not add last block when it is undefined', async () => {
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.resolves([
				{ id: '6524861224470851795', height: 1 },
			]);

			const sequence = await blocksUtils.getIdSequence(
				storageStub,
				10,
				undefined,
				genesisBlock,
				101
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal('6524861224470851795');
		});

		it('should not add last block to the set more than once', async () => {
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.resolves([
				{ id: '9314232245035524467', height: 1 },
			]);

			const sequence = await blocksUtils.getIdSequence(
				storageStub,
				10,
				lastBlock,
				genesisBlock,
				101
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal('9314232245035524467,6524861224470851795');
		});

		it('should not add resolved block to the set more than once', async () => {
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.resolves([
				{ id: 2, height: 3 },
				{ id: 2, height: 3 },
			]);

			const sequence = await blocksUtils.getIdSequence(
				storageStub,
				10,
				lastBlock,
				genesisBlock,
				101
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal(
				'9314232245035524467,2,6524861224470851795'
			);
		});
	});

	describe('loadBlocksData', () => {
		it('should return error when storage.entities.Block.get fails', async () => {
			storageStub.entities.Block.get
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.resolves(null);

			try {
				await blocksUtils.loadBlocksData(storageStub, { id: '1' });
			} catch (err) {
				expect(err.message).to.equal("Cannot read property 'forEach' of null");
			}
		});

		it('should return error when called with both id and lastId', async () => {
			storageStub.entities.Block.get.resolves(['1']);

			try {
				await blocksUtils.loadBlocksData(storageStub, { id: '1' });
			} catch (err) {
				expect(err.message).to.equal(
					'Invalid filter: Received both id and lastId'
				);
			}
		});

		it('should return empty row when called with invalid id', async () => {
			storageStub.entities.Block.get
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.resolves([]);

			const blocks = await blocksUtils.loadBlocksData(storageStub, { id: '1' });
			expect(blocks).to.an('array').that.is.empty;
		});

		it('should return one row when called with valid id', async () => {
			storageStub.entities.Block.get
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.resolves([...storageBlocksListRows]);

			const blocks = await blocksUtils.loadBlocksData(storageStub, {
				id: '13068833527549895884',
			});
			expect(blocks).to.be.an('array');
			expect(blocks[0].b_id).to.eql('13068833527549895884');
		});
	});

	describe('setHeight', () => {
		const dummyBlock = {
			id: '6',
			height: 4,
		};
		const dummyLastBlock = {
			id: '5',
			height: 5,
		};

		it('should return block with increased height based on last block', async () =>
			expect(blocksUtils.setHeight(dummyBlock, dummyLastBlock)).to.eql({
				id: '6',
				height: 6,
			}));
	});

	describe('addBlockProperties', () => {
		let dummyBlockReturned;
		const dummyBlock = {
			id: 1,
			version: 0,
			numberOfTransactions: 0,
			transactions: [],
			totalAmount: new BigNum(0),
			totalFee: new BigNum(0),
			payloadLength: 0,
			reward: new BigNum(0),
		};

		afterEach(() => expect(dummyBlockReturned).to.deep.equal(dummyBlock));

		describe('when block.version = undefined', () => {
			it('should add version = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.version;
				dummyBlockReturned = blocksUtils.addBlockProperties(dummyBlockReduced);
				return dummyBlockReturned;
			});
		});

		describe('when block.numberOfTransactions = undefined', () => {
			describe('and block.transactions = undefined', () => {
				it('should add numberOfTransactions = 0', async () => {
					const dummyBlockReduced = _.cloneDeep(dummyBlock);
					delete dummyBlockReduced.numberOfTransactions;
					delete dummyBlockReduced.transactions;
					dummyBlockReturned = blocksUtils.addBlockProperties(
						dummyBlockReduced
					);
					return dummyBlockReturned;
				});
			});

			describe('and block.transactions != undefined', () => {
				it('should add numberOfTransactions = block.transactions.length', async () => {
					const dummyBlockReduced = _.cloneDeep(dummyBlock);
					delete dummyBlockReduced.numberOfTransactions;
					dummyBlockReturned = blocksUtils.addBlockProperties(
						dummyBlockReduced
					);
					return dummyBlockReturned;
				});
			});
		});

		describe('when block.totalAmount = undefined', () => {
			it('should add totalAmount = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.totalAmount;
				dummyBlockReturned = blocksUtils.addBlockProperties(dummyBlockReduced);
				return dummyBlockReturned;
			});
		});

		describe('when block.totalFee = undefined', () => {
			it('should add totalFee = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.totalFee;
				dummyBlockReturned = blocksUtils.addBlockProperties(dummyBlockReduced);
				return dummyBlockReturned;
			});
		});

		describe('when block.payloadLength = undefined', () => {
			it('should add payloadLength = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.payloadLength;
				dummyBlockReturned = blocksUtils.addBlockProperties(dummyBlockReduced);
				return dummyBlockReturned;
			});
		});

		describe('when block.reward = undefined', () => {
			it('should add reward = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.reward;
				dummyBlockReturned = blocksUtils.addBlockProperties(dummyBlockReduced);
				return dummyBlockReturned;
			});
		});

		describe('when block.transactions = undefined', () => {
			it('should add transactions = []', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.transactions;
				dummyBlockReturned = blocksUtils.addBlockProperties(dummyBlockReduced);
				return dummyBlockReturned;
			});
		});
	});

	describe('deleteBlockProperties', () => {
		let dummyBlockReduced;
		const dummyBlock = {
			id: 1,
			version: 1,
			numberOfTransactions: 1,
			transactions: [{ id: 1 }],
			totalAmount: new BigNum(1),
			totalFee: new BigNum(1),
			payloadLength: 1,
			reward: new BigNum(1),
		};

		describe('when block.version = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.not.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete version property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.version = 0;
				dummyBlockReduced = blocksUtils.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.numberOfTransactions = number', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete numberOfTransactions property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockReduced = blocksUtils.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.totalAmount = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.not.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalAmount property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.totalAmount = new BigNum(0);
				dummyBlockReduced = blocksUtils.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.totalFee = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.not.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.totalFee = new BigNum(0);
				dummyBlockReduced = blocksUtils.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.payloadLength = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.not.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.payloadLength = 0;
				dummyBlockReduced = blocksUtils.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.reward = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.not.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.reward = new BigNum(0);
				dummyBlockReduced = blocksUtils.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.transactions.length = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.not.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.transactions = [];
				dummyBlockReduced = blocksUtils.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});
	});

	describe('loadSecondLastBlock', () => {
		describe('when utils.loadBlocksPart fails', () => {
			describe('if should reject with an error', () => {
				it('should call a callback with returned error', async () => {
					storageStub.entities.Block.get.rejects(new Error('Block Error'));
					try {
						await blocksUtils.loadSecondLastBlock(
							storageStub,
							interfaceAdaptersMock,
							genesisBlock,
							1
						);
					} catch (error) {
						expect(error.message).to.eql('Block Error');
					}
				});
			});

			describe('if returns empty', () => {
				beforeEach(async () => {
					storageStub.entities.Block.get.resolves([]);
				});

				it('should call a callback with error "previousBlock is null"', async () => {
					try {
						await blocksUtils.loadSecondLastBlock(
							storageStub,
							interfaceAdaptersMock,
							genesisBlock,
							1
						);
					} catch (error) {
						expect(error.message).to.equal('PreviousBlock is null');
					}
				});
			});
		});

		describe('when modules.blocks.utils.loadBlocksPart succeeds', () => {
			beforeEach(async () => {
				storageStub.entities.Block.get.resolves([
					{
						id: 2,
						height: 2,
						generatorPublicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
						totalAmount: 100,
						totalFee: 10,
						reward: 1,
						version: 1,
					},
					{
						id: 3,
						height: 3,
						generatorPublicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a9',
						totalAmount: 100,
						totalFee: 10,
						reward: 1,
						version: 1,
					},
				]);
			});

			it('returns the fist block', async () => {
				const block = await blocksUtils.loadSecondLastBlock(
					storageStub,
					interfaceAdaptersMock,
					genesisBlock,
					1
				);
				expect(block.id).to.equal(2);
			});
		});
	});

	describe('calculateNewBroadhash', () => {
		const defaultNethash = '';
		const defaultHeight = 1;

		describe('when there is a problem getting blocks from the db', () => {
			beforeEach(async () => {
				storageStub.entities.Block.get.rejects(new Error('error'));
			});

			it('should throw an error', async () => {
				try {
					await blocksUtils.calculateNewBroadhash(
						storageStub,
						defaultNethash,
						defaultHeight
					);
				} catch (error) {
					expect(error.message).to.equal('error');
				}
			});
		});
		describe('when there is just a single block', () => {
			const blocks = [
				{
					id: '00000002',
					height: 2,
				},
			];

			beforeEach(async () => {
				storageStub.entities.Block.get.resolves(blocks);
			});

			it('should return broadhash equal to nethash and same height', async () => {
				const { broadhash, height } = await blocksUtils.calculateNewBroadhash(
					storageStub,
					defaultNethash,
					defaultHeight
				);
				expect(broadhash).to.equal(defaultNethash);
				expect(height).to.equal(defaultHeight);
			});
		});

		describe('when there are more than one block', () => {
			const blocks = [
				{
					id: '00000002',
					height: 2,
				},
				{
					id: '00000001',
					height: 1,
				},
			];

			beforeEach(async () => {
				storageStub.entities.Block.get.resolves(blocks);
			});

			it('should return just calculated broadhash and best height', async () => {
				const { broadhash, height } = await blocksUtils.calculateNewBroadhash(
					storageStub,
					defaultNethash,
					defaultHeight
				);
				const seed = blocks.map(row => row.id).join('');
				const newBroadhash = crypto
					.createHash('sha256')
					.update(seed, 'utf8')
					.digest()
					.toString('hex');
				expect(broadhash).to.equal(newBroadhash);
				expect(height).to.equal(blocks[0].height);
			});
		});
	});
});
