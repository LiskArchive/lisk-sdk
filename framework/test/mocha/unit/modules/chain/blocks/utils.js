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

'use strict';

const crypto = require('crypto');
const BigNum = require('@liskhq/bignum');
const blocksUtils = require('../../../../../../src/modules/chain/blocks/utils');

describe('blocks/utils', () => {
	const genesisBlock = {
		id: '6524861224470851795',
		height: 1,
	};

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
	});

	afterEach(() => sinonSandbox.restore());

	describe('getIdSequence', () => {
		it('should call storage.entities.Block.getFirstBlockIdOfLastRounds with proper params', async () => {
			await blocksUtils.getIdSequence(
				storageStub,
				10,
				lastBlock,
				genesisBlock,
				101,
			);
			expect(storageStub.entities.Block.getFirstBlockIdOfLastRounds).to.have
				.been.calledOnce;
			expect(
				storageStub.entities.Block.getFirstBlockIdOfLastRounds,
			).to.have.been.calledWith({
				height: 10,
				numberOfRounds: 5,
				numberOfDelegates: 101,
			});
		});

		it('should return error when storage.entities.Block.getFirstBlockIdOfLastRounds fails', async () => {
			const message = 'Database went wrong';
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.rejects(
				new Error(message),
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
					101,
				);
			} catch (err) {
				expect(err.message).to.equal(
					'Failed to get id sequence for height: 10',
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
				101,
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal(
				'9314232245035524467,1,2,3,4,6524861224470851795',
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
				101,
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
				101,
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
				101,
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
				101,
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
				101,
			);
			expect(sequence).to.be.an('object');
			expect(sequence.firstHeight).to.equal(1);
			expect(sequence.ids).to.equal(
				'9314232245035524467,2,6524861224470851795',
			);
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
						dummyBlockReduced,
					);
					return dummyBlockReturned;
				});
			});

			describe('and block.transactions != undefined', () => {
				it('should add numberOfTransactions = block.transactions.length', async () => {
					const dummyBlockReduced = _.cloneDeep(dummyBlock);
					delete dummyBlockReduced.numberOfTransactions;
					dummyBlockReturned = blocksUtils.addBlockProperties(
						dummyBlockReduced,
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
					dummyBlockCompleted,
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
					dummyBlockCompleted,
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
					dummyBlockCompleted,
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
					dummyBlockCompleted,
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
					dummyBlockCompleted,
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
					dummyBlockCompleted,
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
					dummyBlockCompleted,
				);
				return dummyBlockReduced;
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
						defaultHeight,
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
					defaultHeight,
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
					defaultHeight,
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
