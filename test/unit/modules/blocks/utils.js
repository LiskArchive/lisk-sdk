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

var rewire = require('rewire');
var modulesLoader = require('../../../common/modules_loader');

var BlocksUtils = rewire('../../../../modules/blocks/utils.js');

var viewRow_full_blocks_list = [
	{
		b_id: '13068833527549895884',
		b_height: 3,
		t_id: '6950874693022090568',
		t_type: 0,
	},
];

describe('blocks/utils', () => {
	var dbStub;
	var loggerStub;
	var blockMock;
	var transactionMock;
	var accountMock;
	var blocksUtilsModule;
	var modulesStub;
	var __private;
	var library;
	var modules;

	beforeEach(() => {
		dbStub = {
			blocks: {
				getIdSequence: sinonSandbox.stub().resolves(),
				getHeightByLastId: sinonSandbox.stub().resolves(['1']),
				loadLastBlock: sinonSandbox.stub().resolves(viewRow_full_blocks_list),
				loadBlocksData: sinonSandbox.stub(),
				aggregateBlocksReward: sinonSandbox.stub().resolves(),
			},
		};

		dbStub.blocks.loadBlocksData
			.withArgs(sinonSandbox.match({ id: '13068833527549895884' }))
			.resolves(viewRow_full_blocks_list)
			.withArgs(sinonSandbox.match({ id: '1' }))
			.resolves([]);

		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
		};

		blockMock = {
			dbRead: function(input) {
				return { id: input.b_id, height: input.b_height };
			},
		};

		transactionMock = {
			dbRead: function(input) {
				return { id: input.t_id, type: input.t_type };
			},
		};

		accountMock = {
			get: sinonSandbox.stub(),
		};

		accountMock.get
			.withArgs(sinonSandbox.match({ address: 'ERRL' }))
			.callsArgWith(1, 'Address error stub', null)
			.withArgs(sinonSandbox.match({ address: '0L' }))
			.callsArgWith(1, null, undefined)
			.withArgs(sinonSandbox.match({ address: '1L' }))
			.callsArgWith(1, null, { publicKey: '123abc' });

		blocksUtilsModule = new BlocksUtils(
			loggerStub,
			accountMock,
			blockMock,
			transactionMock,
			dbStub,
			modulesLoader.scope.dbSequence,
			modulesLoader.scope.genesisblock
		);

		modulesStub = {
			blocks: {
				lastBlock: {
					get: sinonSandbox
						.stub()
						.returns({ id: '9314232245035524467', height: 1 }),
					set: sinonSandbox
						.stub()
						.returns({ id: '9314232245035524467', height: 1 }),
				},
				utils: {
					readDbRows: blocksUtilsModule.readDbRows,
				},
			},
		};

		blocksUtilsModule.onBind(modulesStub);

		__private = BlocksUtils.__get__('__private');
		__private.loaded = false;

		library = BlocksUtils.__get__('library');
		modules = BlocksUtils.__get__('modules');
	});

	afterEach(() => {
		sinonSandbox.reset();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			expect(library.dbSequence).to.eql(modulesLoader.scope.dbSequence);
			expect(library.logic.account).to.eql(accountMock);
			expect(library.logic.block).to.eql(blockMock);
			expect(library.logic.transaction).to.eql(transactionMock);
		});

		it('should call library.logger.trace with "Blocks->Utils: Submodule initialized."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Utils: Submodule initialized.'
			);
		});

		it('should return self', () => {
			expect(blocksUtilsModule).to.be.an('object');
			expect(blocksUtilsModule.readDbRows).to.be.a('function');
		});
	});

	describe('readDbRows', () => {
		it('should transform a full_blocks_list view row into a block object', () => {
			var blockObject = blocksUtilsModule.readDbRows(viewRow_full_blocks_list);

			expect(blockObject).to.be.an('array');
			expect(blockObject[0]).to.be.an('object');
			expect(blockObject[0].id).to.equal('13068833527549895884');
			expect(blockObject[0].height).to.equal(3);
			expect(blockObject[0].transactions).to.be.an('array');
			expect(blockObject[0].transactions[0]).to.be.an('object');
			expect(blockObject[0].transactions[0].id).to.equal('6950874693022090568');
			expect(blockObject[0].transactions[0].type).to.equal(0);
		});

		it('should generate fake signature for genesis block', () => {
			var genesisBlock_view_full_blocks_list = [
				{
					b_id: '6524861224470851795',
					b_height: 1,
					t_id: '1465651642158264047',
					t_type: 0,
				},
				{
					b_id: '6524861224470851795',
					b_height: 1,
					t_id: '3634383815892709956',
					t_type: 2,
				},
			];

			var blockObject = blocksUtilsModule.readDbRows(
				genesisBlock_view_full_blocks_list
			);

			expect(blockObject).to.be.an('array');
			expect(blockObject[0]).to.be.an('object');
			expect(blockObject[0].id).to.equal('6524861224470851795');
			expect(blockObject[0].generationSignature).to.equal(
				'0000000000000000000000000000000000000000000000000000000000000000'
			);
		});
	});

	describe('loadBlocksPart', () => {
		it('should return error when library.db.blocks.loadBlocksData fails', done => {
			library.db.blocks.getHeightByLastId = sinonSandbox.stub().resolves([]);
			library.db.blocks.loadBlocksData = sinonSandbox
				.stub()
				.throws(new Error('An error'));

			blocksUtilsModule.loadBlocksPart({}, (err, blocks) => {
				expect(loggerStub.error.args[0][0]).to.contains('An error');
				expect(err).to.equal('Blocks#loadBlockData error');
				expect(blocks).to.be.undefined;
				done();
			});
		});

		it('should return block object', done => {
			library.db.blocks.loadBlocksData = sinonSandbox
				.stub()
				.resolves(viewRow_full_blocks_list);

			library.db.blocks.getHeightByLastId = sinonSandbox
				.stub()
				.resolves(library.db.blocks.loadBlocksData);

			blocksUtilsModule.loadBlocksPart({}, (err, blocks) => {
				expect(err).to.be.null;
				expect(blocks).to.be.an('array');
				expect(blocks[0]).to.be.an('object');
				expect(blocks[0].id).to.equal('13068833527549895884');
				done();
			});
		});
	});

	describe('loadLastBlock', () => {
		it('should return error when library.db.blocks.loadLastBlock fails', done => {
			library.db.blocks.loadLastBlock = sinonSandbox.stub().resolves(null);

			blocksUtilsModule.loadLastBlock((err, block) => {
				expect(loggerStub.error.args[0][0]).to.contains(
					"TypeError: Cannot read property 'length' of null"
				);
				expect(err).to.equal('Blocks#loadLastBlock error');
				expect(block).to.be.undefined;
				done();
			});
		});

		describe('sorting the block.transactions array', () => {
			it('should move votes to the end when block is genesis block', done => {
				var genesisBlock_votes = [
					{
						b_id: '6524861224470851795',
						b_height: 1,
						t_id: '1465651642158264047',
						t_type: 3,
					},
					{
						b_id: '6524861224470851795',
						b_height: 1,
						t_id: '3634383815892709956',
						t_type: 2,
					},
					{
						b_id: '6524861224470851795',
						b_height: 1,
						t_id: '3634383815892709957',
						t_type: 0,
					},
				];

				library.db.blocks.loadLastBlock = sinonSandbox
					.stub()
					.resolves(genesisBlock_votes);

				blocksUtilsModule.loadLastBlock((err, block) => {
					expect(block).to.be.an('object');
					expect(block.id).to.equal('6524861224470851795');
					expect(block.transactions).to.be.an('array');
					expect(block.transactions[0]).to.be.an('object');
					expect(block.transactions[0].id).to.equal('3634383815892709956');
					expect(block.transactions[0].type).to.equal(2);
					expect(block.transactions[1].id).to.equal('3634383815892709957');
					expect(block.transactions[1].type).to.equal(0);
					expect(block.transactions[2].id).to.equal('1465651642158264047');
					expect(block.transactions[2].type).to.equal(3);
					done();
				});
			});

			it('should move signatures to the end', done => {
				var genesisBlock_votes = [
					{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '1465651642158264047',
						t_type: 3,
					},
					{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '3634383815892709955',
						t_type: 2,
					},
					{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '3634383815892709956',
						t_type: 1,
					},
					{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '3634383815892709957',
						t_type: 0,
					},
				];

				library.db.blocks.loadLastBlock = sinonSandbox
					.stub()
					.resolves(genesisBlock_votes);

				blocksUtilsModule.loadLastBlock((err, block) => {
					expect(block).to.be.an('object');
					expect(block.id).to.equal('6524861224470851000');
					expect(block.transactions).to.be.an('array');
					expect(block.transactions[0]).to.be.an('object');
					expect(block.transactions[0].id).to.equal('1465651642158264047');
					expect(block.transactions[0].type).to.equal(3);
					expect(block.transactions[1]).to.be.an('object');
					expect(block.transactions[1].id).to.equal('3634383815892709955');
					expect(block.transactions[1].type).to.equal(2);
					expect(block.transactions[2]).to.be.an('object');
					expect(block.transactions[2].id).to.equal('3634383815892709957');
					expect(block.transactions[2].type).to.equal(0);
					expect(block.transactions[3]).to.be.an('object');
					expect(block.transactions[3].id).to.equal('3634383815892709956');
					expect(block.transactions[3].type).to.equal(1);
					done();
				});
			});

			it('should set the last block', done => {
				library.db.blocks.loadLastBlock = sinonSandbox
					.stub()
					.resolves(viewRow_full_blocks_list);

				modules.blocks.lastBlock.set = sinonSandbox.spy();

				blocksUtilsModule.loadLastBlock((err, block) => {
					expect(modules.blocks.lastBlock.set).to.have.been.calledWith(block);
					done();
				});
			});
		});
	});

	describe('getIdSequence', () => {
		it('should return error when library.db.blocks.getIdSequence fails', done => {
			blocksUtilsModule.getIdSequence(10, (err, sequence) => {
				expect(loggerStub.error.args[0][0]).to.contains(
					"TypeError: Cannot read property 'length' of undefined"
				);
				expect(err).to.equal('Blocks#getIdSequence error');
				expect(sequence).to.be.undefined;
				done();
			});
		});

		it('should return error when no row is found', done => {
			library.db.blocks.getIdSequence = sinonSandbox.stub().resolves([]);

			blocksUtilsModule.getIdSequence(10, (err, sequence) => {
				expect(err).to.equal('Failed to get id sequence for height: 10');
				expect(sequence).to.be.undefined;
				done();
			});
		});

		it('should return valid block id list', done => {
			library.db.blocks.getIdSequence = sinonSandbox
				.stub()
				.resolves([
					{ id: 1, height: 2 },
					{ id: 2, height: 3 },
					{ id: 3, height: 4 },
					{ id: 4, height: 5 },
				]);

			blocksUtilsModule.getIdSequence(10, (err, sequence) => {
				expect(sequence).to.be.an('object');
				expect(sequence.firstHeight).to.equal(1);
				expect(sequence.ids).to.equal(
					'9314232245035524467,1,2,3,4,6524861224470851795'
				);
				done();
			});
		});
	});

	describe('loadBlocksData', () => {
		it('should return error when library.db.blocks.loadBlocksData fails', done => {
			library.db.blocks.getHeightByLastId = sinonSandbox.stub().resolves(null);

			blocksUtilsModule.loadBlocksData({ id: '1' }, (err, blocks) => {
				expect(loggerStub.error.args[0][0]).to.contains(
					"TypeError: Cannot read property 'length' of null"
				);
				expect(err).to.equal('Blocks#loadBlockData error');
				expect(blocks).to.be.undefined;
				done();
			});
		});

		it('should return error when called with both id and lastId', done => {
			library.db.blocks.getHeightByLastId = sinonSandbox.stub().resolves(['1']);

			blocksUtilsModule.loadBlocksData(
				{ id: '1', lastId: '5' },
				(err, blocks) => {
					expect(err).to.equal('Invalid filter: Received both id and lastId');
					expect(blocks).to.be.undefined;
					done();
				}
			);
		});

		it('should return empty row when called with invalid id', done => {
			blocksUtilsModule.loadBlocksData({ id: '1' }, (err, blocks) => {
				expect(err).to.be.null;
				expect(blocks).to.an('array').that.is.empty;
				done();
			});
		});

		it('should return one row when called with valid id', done => {
			blocksUtilsModule.loadBlocksData({ id: '13068833527549895884' }, function(
				err,
				blocks
			) {
				expect(err).to.be.null;
				expect(blocks).to.be.an('array');
				expect(blocks[0].b_id).to.eql('13068833527549895884');
				done();
			});
		});
	});

	describe('getBlockProgressLogger', () => {
		var testTracker;

		it('should initialize BlockProgressLogger', () => {
			testTracker = blocksUtilsModule.getBlockProgressLogger(
				1,
				1,
				'Test tracker'
			);
			expect(testTracker.target).to.eql(1);
			expect(testTracker.step).to.eql(1);
		});

		it('should return valid log information when call applyNext()', () => {
			testTracker.applyNext();
			expect(loggerStub.info.args[0][0]).to.equal('Test tracker');
			expect(loggerStub.info.args[0][1]).to.equal(
				'100.0 %: applied 1 of 1 transactions'
			);
		});

		it('should throw error when times applied >= transactionsCount', () => {
			expect(() => {
				testTracker.applyNext();
			}).to.throw('Cannot apply transaction over the limit: 1');
		});

		it('should return valid log information when reset tracker and call applyNext()', () => {
			testTracker.reset();
			testTracker.applyNext();
			expect(loggerStub.info.args[0][0]).to.equal('Test tracker');
			expect(loggerStub.info.args[0][1]).to.equal(
				'100.0 %: applied 1 of 1 transactions'
			);
		});
	});

	describe('aggregateBlocksReward', () => {
		it('should return error when account.get fails', done => {
			blocksUtilsModule.aggregateBlocksReward(
				{ address: 'ERRL' },
				(err, data) => {
					expect(err).to.equal('Address error stub');
					expect(data).to.be.undefined;
					done();
				}
			);
		});

		it('should return error when account not found', done => {
			blocksUtilsModule.aggregateBlocksReward(
				{ address: '0L' },
				(err, data) => {
					expect(err).to.equal('Account not found');
					expect(data).to.be.undefined;
					done();
				}
			);
		});

		it('should return error when library.db.blocks.aggregateBlocksReward fails', done => {
			blocksUtilsModule.aggregateBlocksReward(
				{ address: '1L' },
				(err, data) => {
					expect(loggerStub.error.args[0][0]).to.contains(
						"TypeError: Cannot read property '0' of undefined"
					);
					expect(err).to.equal('Blocks#aggregateBlocksReward error');
					expect(data).to.be.undefined;
					done();
				}
			);
		});

		it('should return error when account is not a delegate', done => {
			library.db.blocks.aggregateBlocksReward = sinonSandbox
				.stub()
				.resolves([{ delegate: null }]);

			blocksUtilsModule.aggregateBlocksReward(
				{ address: '1L' },
				(err, data) => {
					expect(err).to.equal('Account is not a delegate');
					expect(data).to.be.undefined;
					done();
				}
			);
		});

		it('should return block object', done => {
			library.db.blocks.aggregateBlocksReward = sinonSandbox
				.stub()
				.resolves([{ delegate: '123abc', fees: 1, count: 100 }]);

			blocksUtilsModule.aggregateBlocksReward(
				{ address: '1L' },
				(err, data) => {
					expect(data).to.be.an('object');
					expect(data.fees).to.equal(1);
					expect(data.count).to.equal(100);
					expect(data.rewards).to.equal('0');
					done();
				}
			);
		});
	});

	describe('onBind', () => {
		beforeEach(() => {
			loggerStub.trace.reset();
			blocksUtilsModule.onBind(modulesStub);
		});

		it('should call library.logger.trace with "Blocks->Utils: Shared modules bind."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Utils: Shared modules bind.'
			);
		});

		it('should create a modules object { blocks: scope.blocks }', () => {
			expect(modules.blocks).to.equal(modulesStub.blocks);
		});

		it('should set __private.loaded to true', () => {
			expect(__private.loaded).to.be.true;
		});
	});
});
