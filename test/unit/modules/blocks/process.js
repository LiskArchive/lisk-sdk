'use strict';

var expect = require('chai').expect;
var async = require('async');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var VoteLogic = require('../../../../logic/vote.js');
var genesisBlock = require('../../../../genesisBlock.json');
var loadTables = require('./processTablesData.json');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;

describe('blocks/process', function () {

	var blocksProcess;
	var blockLogic;
	var blocks;
	var blocksVerify;
	var accounts;
	var db;

	before(function (done) {
		modulesLoader.initLogic(BlockLogic, modulesLoader.scope, function (err, __blockLogic) {
			if (err) {
				return done(err);
			}
			blockLogic = __blockLogic;

			modulesLoader.initModules([
				{blocks: require('../../../../modules/blocks')},
				{accounts: require('../../../../modules/accounts')},
				{delegates: require('../../../../modules/delegates')},
				{transactions: require('../../../../modules/transactions')},
				{multisignatures: require('../../../../modules/multisignatures')},
				{signatures: require('../../../../modules/signatures')},
			], [
				{'block': require('../../../../logic/block')},
				{'transaction': require('../../../../logic/transaction')},
				{'account': require('../../../../logic/account')},
				{'peers': require('../../../../logic/peers')},
			], {}, function (err, __modules) {
				if (err) {
					return done(err);
				}
				__modules.blocks.verify.onBind(__modules);
				blocksVerify = __modules.blocks.verify;
				__modules.delegates.onBind(__modules);
				__modules.accounts.onBind(__modules);
				__modules.transactions.onBind(__modules);
				__modules.blocks.chain.onBind(__modules);
				__modules.multisignatures.onBind(__modules);
				__modules.signatures.onBind(__modules);
				__modules.blocks.process.onBind(__modules);
				blocksProcess = __modules.blocks.process;
				blocks = __modules.blocks;
				accounts = __modules.accounts;
				db = modulesLoader.scope.db;

				async.series({
					clearTables: function (seriesCb) {
						async.every([
							'blocks where height > 1',
							'trs where "blockId" != \'6524861224470851795\'',
							'mem_accounts where address in (\'2737453412992791987L\', \'2896019180726908125L\')',
							'forks_stat',
							'votes where "transactionId" = \'17502993173215211070\''
						], function (table, seriesCb) {
							clearDatabaseTable(db, modulesLoader.logger, table, seriesCb);
						}, function (err, result) {
							if (err) {
								return setImmediate(err);
							}
							return setImmediate(seriesCb);
						});
					},
					loadTables: function (seriesCb) {
						async.everySeries(loadTables, function (table, seriesCb) {
							var cs = new db.$config.pgp.helpers.ColumnSet(
								table.fields, {table: table.name}
							);
							var insert = db.$config.pgp.helpers.insert(table.data, cs);
							db.none(insert)
								.then(function (data) {
									seriesCb(null, true);
								}).catch(function (err) {
									return setImmediate(err);
								});
						}, function (err, result) {
							if (err) {
								return setImmediate(err);
							}
							return setImmediate(seriesCb);
						});
					}
				}, function (err) {
					if (err) {
						return done(err);
					}
					done();
				});
 			});
 		});
	});

	describe('getCommonBlock()', function () {

		it('should be ok');
	});

	describe('loadBlocksOffset({verify: true}) - no errors', function () {

		it('should load block 2 from database: block without transactions', function (done) {
			blocks.lastBlock.set(genesisBlock);
			blocksProcess.loadBlocksOffset(1, 2, true, function (err, loadedBlock) {
				if (err) {
					return done(err);
				}

				blocks.lastBlock.set(loadedBlock);
				expect(loadedBlock.height).to.be.equal(2);
				done();
			});
		});

		it('should load block 3 from database: block with transactions', function (done) {
			blocksProcess.loadBlocksOffset(1, 3, true, function (err, loadedBlock) {
				if (err) {
					return done(err);
				}

				blocks.lastBlock.set(loadedBlock);
				expect(loadedBlock.height).to.be.equal(3);
				done();
			});
		});
	});

	describe('loadBlocksOffset({verify: true}) - block/trs errors', function () {

		it('should load block 4 from db and return blockSignature error', function (done) {
			blocksProcess.loadBlocksOffset(1, 4, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Failed to verify block signature');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 5 from db and return payloadHash error', function (done) {
			blocks.lastBlock.set(loadTables[0].data[2]);

			blocksProcess.loadBlocksOffset(1, 5, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Invalid payload hash');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 6 from db and return block timestamp error', function (done) {
			blocks.lastBlock.set(loadTables[0].data[3]);

			blocksProcess.loadBlocksOffset(1, 6, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Invalid block timestamp');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 7 from db and return unknown transaction type error', function (done) {
			blocks.lastBlock.set(loadTables[0].data[4]);

			blocksProcess.loadBlocksOffset(1, 7, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Blocks#loadBlocksOffset error: Unknown transaction type 99');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 8 from db and return block version error', function (done) {
			blocks.lastBlock.set(loadTables[0].data[5]);

			blocksProcess.loadBlocksOffset(1, 8, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Invalid block version');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 9 from db and return previousBlock error (fork:1)', function (done) {
			blocks.lastBlock.set(loadTables[0].data[1]);

			blocksProcess.loadBlocksOffset(1, 9, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Invalid previous block: 15335393038826825161 expected: 13068833527549895884');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 10 from db and return duplicated votes error', function (done) {
			blocks.lastBlock.set(loadTables[0].data[7]);

			blocksProcess.loadBlocksOffset(1, 10, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Failed to validate vote schema: Array items are not unique (indexes 0 and 4)');
					return done();
				}

				done(loadedBlock);
			});
		});
	});

	describe('loadBlocksOffset({verify: false}) - rerun block/trs errors', function () {

		it('should clear fork_stat db table', function (done) {
			async.every([
				'forks_stat'
			], function (table, seriesCb) {
				clearDatabaseTable(db, modulesLoader.logger, table, seriesCb);
			}, function (err, result) {
				if (err) {
					done(err);
				}
				done();
			});
		});

		it('should load and process block 4 from db with invalid blockSignature', function (done) {
			blocks.lastBlock.set(loadTables[0].data[1]);

			blocksProcess.loadBlocksOffset(1, 4, false, function (err, loadedBlock) {
				if (err) {
					return done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[2].id);
				expect(loadedBlock.previousBlock).equal(loadTables[0].data[2].previousBlock);
				done();
			});
		});

		it('should load and process block 5 from db with invalid payloadHash', function (done) {
			blocks.lastBlock.set(loadTables[0].data[2]);

			blocksProcess.loadBlocksOffset(1, 5, false, function (err, loadedBlock) {
				if (err) {
					return done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[3].id);
				expect(loadedBlock.previousBlock).equal(loadTables[0].data[3].previousBlock);
				done();
			});
		});

		it('should load and process block 6 from db with invalid block timestamp', function (done) {
			blocks.lastBlock.set(loadTables[0].data[3]);

			blocksProcess.loadBlocksOffset(1, 6, false, function (err, loadedBlock) {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[4].id);
				expect(loadedBlock.previousBlock).equal(loadTables[0].data[4].previousBlock);
				done();
			});
		});

		it('should load block 7 from db and return unknown transaction type error', function (done) {
			blocks.lastBlock.set(loadTables[0].data[4]);

			blocksProcess.loadBlocksOffset(1, 7, true, function (err, loadedBlock) {
				if (err) {
					expect(err).equal('Blocks#loadBlocksOffset error: Unknown transaction type 99');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load and process block 8 from db with invalid block version', function (done) {
			blocks.lastBlock.set(loadTables[0].data[5]);

			blocksProcess.loadBlocksOffset(1, 8, false, function (err, loadedBlock) {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[6].id);
				expect(loadedBlock.previousBlock).equal(loadTables[0].data[6].previousBlock);
				done();
			});
		});

		it('should load and process block 9 from db with invalid previousBlock (no fork:1)', function (done) {
			blocks.lastBlock.set(loadTables[0].data[1]);

			blocksProcess.loadBlocksOffset(1, 9, false, function (err, loadedBlock) {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[7].id);
				expect(loadedBlock.previousBlock).equal(loadTables[0].data[7].previousBlock);
				done();
			});
		});

		it('should load and process block 10 from db with duplicated votes', function (done) {
			blocks.lastBlock.set(loadTables[0].data[7]);

			blocksProcess.loadBlocksOffset(1, 10, false, function (err, loadedBlock) {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[8].id);
				expect(loadedBlock.previousBlock).equal(loadTables[0].data[8].previousBlock);
				done();
			});
		});
	});

	describe('loadBlocksFromPeer()', function () {

		it('should be ok');
	});

	describe('generateBlock()', function () {

		it('should be ok');
	});

	describe('onReceiveBlock()', function () {

		describe('calling receiveBlock()', function () {

			it('should be ok');
		});

		describe('calling receiveForkOne()', function () {

			it('should be ok');
		});

		describe('calling receiveForkFive()', function () {

			it('should be ok');
		});
	});

	describe('onBind()', function () {

		it('should be ok');
	});

	after(function (done) {
		async.every([
			'blocks where height > 1',
			'trs where "blockId" != \'6524861224470851795\'',
			'mem_accounts where address in (\'2737453412992791987L\', \'2896019180726908125L\')',
			'forks_stat',
			'votes where "transactionId" = \'17502993173215211070\''
		], function (table, seriesCb) {
			clearDatabaseTable(db, modulesLoader.logger, table, seriesCb);
		}, function (err, result) {
			if (err) {
				done(err);
			}
			done();
		});
	});
});
