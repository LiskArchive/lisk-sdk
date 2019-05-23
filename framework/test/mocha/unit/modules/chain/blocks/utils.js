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
		},
		{
			b_id: '13068833527549895884',
			b_height: 3, // Block 1
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '13831767660337349834',
			t_type: 1,
		},
		{
			b_id: '7018883617995376402',
			b_height: 4, // Block 2
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '10550826199952791739',
			t_type: 2,
		},
		{
			b_id: '7018883617995376402',
			b_height: 4, // Block 2
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '3502881310841638511',
			t_type: 3,
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
		},
	];

	const storageBlocksListRowsParsed = [
		{
			b_blockSignature: null,
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			b_height: 3,
			b_id: '13068833527549895884',
			b_numberOfTransactions: null,
			b_payloadHash: null,
			b_payloadLength: null,
			b_previousBlock: null,
			b_reward: null,
			b_timestamp: null,
			b_totalAmount: null,
			b_totalFee: null,
			b_version: 0,
			d_username: null,
			dapp_category: 0,
			dapp_description: 'my app desc',
			dapp_icon: 'app.icon',
			dapp_link: 'app-link.com',
			dapp_name: 'App Name',
			dapp_tags: null,
			dapp_type: 0,
			in_dappId: null,
			m_keysgroup: null,
			m_lifetime: null,
			m_min: null,
			ot_dappId: null,
			ot_outTransactionId: null,
			s_publicKey: null,
			t_amount: null,
			t_fee: null,
			t_id: '6950874693022090568',
			t_recipientId: null,
			t_requesterPublicKey: null,
			t_senderId: null,
			t_senderPublicKey: null,
			t_signSignature: null,
			t_signature: null,
			t_signatures: null,
			t_timestamp: null,
			t_type: 5,
			tf_data: null,
			v_votes: null,
		},
		{
			b_blockSignature: null,
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			b_height: 3,
			b_id: '13068833527549895884',
			b_numberOfTransactions: null,
			b_payloadHash: null,
			b_payloadLength: null,
			b_previousBlock: null,
			b_reward: null,
			b_timestamp: null,
			b_totalAmount: null,
			b_totalFee: null,
			b_version: 0,
			d_username: null,
			dapp_category: null,
			dapp_description: null,
			dapp_icon: null,
			dapp_link: null,
			dapp_name: null,
			dapp_tags: null,
			dapp_type: null,
			in_dappId: null,
			m_keysgroup: null,
			m_lifetime: null,
			m_min: null,
			ot_dappId: null,
			ot_outTransactionId: null,
			s_publicKey: null,
			t_amount: null,
			t_fee: null,
			t_id: '13831767660337349834',
			t_recipientId: null,
			t_requesterPublicKey: null,
			t_senderId: null,
			t_senderPublicKey: null,
			t_signSignature: null,
			t_signature: null,
			t_signatures: null,
			t_timestamp: null,
			t_type: 1,
			tf_data: null,
			v_votes: null,
		},
		{
			b_blockSignature: null,
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			b_height: 4,
			b_id: '7018883617995376402',
			b_numberOfTransactions: null,
			b_payloadHash: null,
			b_payloadLength: null,
			b_previousBlock: null,
			b_reward: null,
			b_timestamp: null,
			b_totalAmount: null,
			b_totalFee: null,
			b_version: 1,
			d_username: null,
			dapp_category: null,
			dapp_description: null,
			dapp_icon: null,
			dapp_link: null,
			dapp_name: null,
			dapp_tags: null,
			dapp_type: null,
			in_dappId: null,
			m_keysgroup: null,
			m_lifetime: null,
			m_min: null,
			ot_dappId: null,
			ot_outTransactionId: null,
			s_publicKey: null,
			t_amount: null,
			t_fee: null,
			t_id: '10550826199952791739',
			t_recipientId: null,
			t_requesterPublicKey: null,
			t_senderId: null,
			t_senderPublicKey: null,
			t_signSignature: null,
			t_signature: null,
			t_signatures: null,
			t_timestamp: null,
			t_type: 2,
			tf_data: null,
			v_votes: null,
		},
		{
			b_blockSignature: null,
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			b_height: 4,
			b_id: '7018883617995376402',
			b_numberOfTransactions: null,
			b_payloadHash: null,
			b_payloadLength: null,
			b_previousBlock: null,
			b_reward: null,
			b_timestamp: null,
			b_totalAmount: null,
			b_totalFee: null,
			b_version: 1,
			d_username: null,
			dapp_category: null,
			dapp_description: null,
			dapp_icon: null,
			dapp_link: null,
			dapp_name: null,
			dapp_tags: null,
			dapp_type: null,
			in_dappId: null,
			m_keysgroup: null,
			m_lifetime: null,
			m_min: null,
			ot_dappId: null,
			ot_outTransactionId: null,
			s_publicKey: null,
			t_amount: null,
			t_fee: null,
			t_id: '3502881310841638511',
			t_recipientId: null,
			t_requesterPublicKey: null,
			t_senderId: null,
			t_senderPublicKey: null,
			t_signSignature: null,
			t_signature: null,
			t_signatures: null,
			t_timestamp: null,
			t_type: 3,
			tf_data: null,
			v_votes: null,
		},
	];

	const lastBlock = { id: '9314232245035524467', height: 1 };

	let storageStub;
	let blockMock;
	let transactionMock;
	let accountStub;
	let bindingsStub;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					delegateBlocksRewards: sinonSandbox.stub().resolves(),
				},
				Block: {
					get: sinonSandbox.stub().resolves(['1']),
					getFirstBlockIdOfLastRounds: sinonSandbox.stub().resolves(),
				},
			},
		};

		transactionMock = {
			dbRead(input) {
				return { id: input.t_id, type: input.t_type };
			},
			fromBlock(input) {
				return input;
			},
		};

		accountStub = {
			get: sinonSandbox.stub(),
		};

		accountStub.get
			.withArgs(sinonSandbox.match({ address: 'ERRL' }))
			.callsArgWith(1, 'Address error stub', null)
			.withArgs(sinonSandbox.match({ address: '0L' }))
			.callsArgWith(1, null, undefined)
			.withArgs(sinonSandbox.match({ address: '1L' }))
			.callsArgWith(1, null, { publicKey: '123abc' });
	});

	afterEach(() => sinonSandbox.restore());

	describe('readDbRows', () => {
		beforeEach(async () => {
			sinonSandbox.spy(blocksLogic, 'dbRead');
		});

		it('should call library.logic.block.dbRead with each block', async () => {
			blocksUtils.readDbRows(fullBlocksListRows, transactionMock, genesisBlock);

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
					transactionMock,
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
				},
				{
					b_id: '6524861224470851795',
					b_height: 1,
					b_generatorPublicKey:
						'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
					t_id: '3634383815892709956',
					t_type: 2,
				},
			];

			const blockObject = blocksUtils.readDbRows(
				genesisBlock_view_full_blocks_list,
				transactionMock,
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
					transactionMock,
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
				.resolves(storageBlocksListRows);

			const blocks = await blocksUtils.loadBlocksPart(
				storageStub,
				transactionMock,
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
					transactionMock,
					genesisBlock
				);
			} catch (err) {
				expect(err.message).to.equal('Failed to load last block');
			}
		});

		describe('sorting the block.transactions array', () => {
			it('should return the block', async () => {
				storageStub.entities.Block.get.resolves(storageBlocksListRows);
				const block = await blocksUtils.loadLastBlock(
					storageStub,
					transactionMock,
					genesisBlock
				);

				expect(block).to.be.an('object');
				expect(block.id).to.equal('13068833527549895884');
			});
		});
	});

	describe('getIdSequence', () => {
		it('should call library.storage.entities.Block.getFirstBlockIdOfLastRounds with proper params', done => {
			blocksUtils.getIdSequence(10, async () => {
				expect(library.storage.entities.Block.getFirstBlockIdOfLastRounds).to
					.have.been.calledOnce;
				expect(
					library.storage.entities.Block.getFirstBlockIdOfLastRounds
				).to.have.been.calledWith({
					height: 10,
					numberOfRounds: 5,
					numberOfDelegates: 101,
				});
				done();
			});
		});

		it('should return error when library.storage.entities.Block.getFirstBlockIdOfLastRounds fails', done => {
			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(loggerStub.error.args[0][0]).to.contains(
					"TypeError: Cannot read property 'length' of undefined"
				);
				expect(err).to.equal('Blocks#getIdSequence error');
				expect(sequence).to.be.undefined;
				done();
			});
		});

		it('should return error when no row is found', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([]);

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.equal('Failed to get id sequence for height: 10');
				expect(sequence).to.be.undefined;
				done();
			});
		});

		it('should return valid block id list', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([
					{ id: 1, height: 2 },
					{ id: 2, height: 3 },
					{ id: 3, height: 4 },
					{ id: 4, height: 5 },
				]);

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.be.null;
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal(
					'9314232245035524467,1,2,3,4,6524861224470851795'
				);
				done();
			});
		});

		it('should not add genesis block to the set when library.genesisBlock is undefined', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([{ id: 1, height: 2 }]);

			const genesisBlock = library.genesisBlock;
			library.genesisBlock = undefined;

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.be.null;
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal('9314232245035524467,1');
				library.genesisBlock = genesisBlock;
				done();
			});
		});

		it('should not add genesis block to the set when library.genesisBlock.block is undefined', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([{ id: 1, height: 2 }]);

			const block = library.genesisBlock.block;
			library.genesisBlock.block = undefined;

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.be.null;
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal('9314232245035524467,1');
				library.genesisBlock.block = block;
				done();
			});
		});

		it('should not add genesis block to the set more than once', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([{ id: '6524861224470851795', height: 1 }]);

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.be.null;
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal(
					'9314232245035524467,6524861224470851795'
				);
				done();
			});
		});

		it('should not add last block when it is undefined', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([{ id: '6524861224470851795', height: 1 }]);

			modules.blocks.lastBlock.get = sinonSandbox.stub(undefined);

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.be.null;
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal('6524861224470851795');
				done();
			});
		});

		it('should not add last block to the set more than once', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([{ id: '9314232245035524467', height: 1 }]);

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.be.null;
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal(
					'9314232245035524467,6524861224470851795'
				);
				done();
			});
		});

		it('should not add resolved block to the set more than once', done => {
			library.storage.entities.Block.getFirstBlockIdOfLastRounds = sinonSandbox
				.stub()
				.resolves([{ id: 2, height: 3 }, { id: 2, height: 3 }]);

			blocksUtils.getIdSequence(10, (err, sequence) => {
				expect(err).to.be.null;
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal(
					'9314232245035524467,2,6524861224470851795'
				);
				done();
			});
		});
	});

	describe('loadBlocksData', () => {
		it('should return error when library.storage.entities.Block.get fails', done => {
			library.storage.entities.Block.get = sinonSandbox
				.stub()
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.resolves(null);

			blocksUtils.loadBlocksData({ id: '1' }, (err, blocks) => {
				expect(loggerStub.error.args[0][0]).to.contains(
					"TypeError: Cannot read property 'forEach' of null"
				);
				expect(err).to.equal('Blocks#loadBlockData error');
				expect(blocks).to.be.undefined;
				done();
			});
		});

		it('should return error when called with both id and lastId', done => {
			library.storage.entities.Block.get = sinonSandbox.stub().resolves(['1']);

			blocksUtils.loadBlocksData({ id: '1', lastId: '5' }, (err, blocks) => {
				expect(err).to.equal('Invalid filter: Received both id and lastId');
				expect(blocks).to.be.undefined;
				done();
			});
		});

		it('should return empty row when called with invalid id', done => {
			library.storage.entities.Block.get = sinonSandbox
				.stub()
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.resolves([]);

			blocksUtils.loadBlocksData({ id: '1' }, (err, blocks) => {
				expect(err).to.be.null;
				expect(blocks).to.an('array').that.is.empty;
				done();
			});
		});

		it('should return one row when called with valid id', done => {
			library.storage.entities.Block.get = sinonSandbox
				.stub()
				.onCall(0)
				.resolves(['1'])
				.onCall(1)
				.resolves(storageBlocksListRows);

			blocksUtils.loadBlocksData(
				{ id: '13068833527549895884' },
				(err, blocks) => {
					expect(err).to.be.null;
					expect(blocks).to.be.an('array');
					expect(blocks[0].b_id).to.eql('13068833527549895884');
					done();
				}
			);
		});
	});

	describe('getBlockProgressLogger', () => {
		let testTracker;

		it('should initialize BlockProgressLogger', async () => {
			testTracker = blocksUtils.getBlockProgressLogger(1, 1, 'Test tracker');
			expect(testTracker.target).to.eql(1);
			return expect(testTracker.step).to.eql(1);
		});

		it('should return valid log information when call applyNext()', async () => {
			testTracker.applyNext();
			expect(loggerStub.info.args[0][0]).to.equal('Test tracker');
			return expect(loggerStub.info.args[0][1]).to.equal(
				'100.0 %: applied 1 of 1 transactions'
			);
		});

		it('should throw error when times applied >= transactionsCount', async () =>
			expect(() => {
				testTracker.applyNext();
			}).to.throw('Cannot apply transaction over the limit: 1'));

		it('should return valid log information when reset tracker and call applyNext()', async () => {
			testTracker.reset();
			testTracker.applyNext();
			expect(loggerStub.info.args[0][0]).to.equal('Test tracker');
			return expect(loggerStub.info.args[0][1]).to.equal(
				'100.0 %: applied 1 of 1 transactions'
			);
		});
	});

	describe('onBind', () => {
		beforeEach(() => {
			loggerStub.trace.resetHistory();
			return blocksUtils.onBind(bindingsStub);
		});

		it('should call library.logger.trace with "Blocks->Utils: Shared modules bind."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Utils: Shared modules bind.'
			));

		it('should create a modules object { blocks: scope.blocks }', async () =>
			expect(modules.blocks).to.equal(bindingsStub.modules.blocks));

		it('should set __private.loaded to true', async () =>
			expect(__private.loaded).to.be.true);
	});
});
