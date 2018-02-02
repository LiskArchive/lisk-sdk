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

var async = require('async');

var genesisBlock = require('../../../data/genesis_block.json');
var application = require('../../../common/application');
var loadTables = require('./process_tables_data.json');

var modulesLoader = require('../../../common/modules_loader');
var clearDatabaseTable = require('../../../common/db_sandbox')
	.clearDatabaseTable;

var constants = require('../../../../helpers/constants');

describe('blocks/process', () => {
	var blocksProcess;
	var blocks;
	var db;
	var originalBlockRewardsOffset;

	before(done => {
		// Force rewards start at 150-th block
		originalBlockRewardsOffset = constants.rewards.offset;
		constants.rewards.offset = 150;
		application.init(
			{ sandbox: { name: 'lisk_test_blocks_process' } },
			(err, scope) => {
				blocksProcess = scope.modules.blocks.process;
				blocks = scope.modules.blocks;
				db = scope.db;
				done(err);
			}
		);
	});

	after(done => {
		constants.rewards.offset = originalBlockRewardsOffset;
		application.cleanup(done);
	});

	beforeEach(done => {
		async.series(
			{
				clearTables: function(seriesCb) {
					async.every(
						[
							'blocks where height > 1',
							'trs where "blockId" != \'6524861224470851795\'',
							"mem_accounts where address in ('2737453412992791987L', '2896019180726908125L')",
							'forks_stat',
							'votes where "transactionId" = \'17502993173215211070\'',
						],
						(table, seriesCb) => {
							clearDatabaseTable(db, modulesLoader.logger, table, seriesCb);
						},
						err => {
							if (err) {
								return setImmediate(err);
							}
							return setImmediate(seriesCb);
						}
					);
				},
				loadTables: function(seriesCb) {
					async.everySeries(
						loadTables,
						(table, seriesCb) => {
							var cs = new db.$config.pgp.helpers.ColumnSet(table.fields, {
								table: table.name,
							});
							var insert = db.$config.pgp.helpers.insert(table.data, cs);
							db
								.none(insert)
								.then(() => {
									seriesCb(null, true);
								})
								.catch(err => {
									return setImmediate(err);
								});
						},
						err => {
							if (err) {
								return setImmediate(err);
							}
							return setImmediate(seriesCb);
						}
					);
				},
			},
			err => {
				if (err) {
					return done(err);
				}
				done();
			}
		);
	});

	describe('getCommonBlock()', () => {
		it('should be ok');
	});

	describe('loadBlocksOffset({verify: true}) - no errors', () => {
		it('should load block 2 from database: block without transactions', done => {
			blocks.lastBlock.set(genesisBlock);
			blocksProcess.loadBlocksOffset(1, 2, true, (err, loadedBlock) => {
				if (err) {
					return done(err);
				}

				blocks.lastBlock.set(loadedBlock);
				expect(loadedBlock.height).to.equal(2);
				done();
			});
		});

		it('should load block 3 from database: block with transactions', done => {
			blocksProcess.loadBlocksOffset(1, 3, true, (err, loadedBlock) => {
				if (err) {
					return done(err);
				}

				blocks.lastBlock.set(loadedBlock);
				expect(loadedBlock.height).to.equal(3);
				done();
			});
		});
	});

	describe('loadBlocksOffset({verify: true}) - block/transaction errors', () => {
		it('should load block 4 from db and return blockSignature error', done => {
			blocksProcess.loadBlocksOffset(1, 4, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Failed to verify block signature');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 5 from db and return payloadHash error', done => {
			blocks.lastBlock.set(loadTables[0].data[2]);

			blocksProcess.loadBlocksOffset(1, 5, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Invalid payload hash');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 6 from db and return block timestamp error', done => {
			blocks.lastBlock.set(loadTables[0].data[3]);

			blocksProcess.loadBlocksOffset(1, 6, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Invalid block timestamp');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 7 from db and return unknown transaction type error', done => {
			blocks.lastBlock.set(loadTables[0].data[4]);

			blocksProcess.loadBlocksOffset(1, 7, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal(
						'Blocks#loadBlocksOffset error: Unknown transaction type 99'
					);
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 8 from db and return block version error', done => {
			blocks.lastBlock.set(loadTables[0].data[5]);

			blocksProcess.loadBlocksOffset(1, 8, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Invalid block version');
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 9 from db and return previousBlock error (fork:1)', done => {
			blocks.lastBlock.set(loadTables[0].data[1]);

			blocksProcess.loadBlocksOffset(1, 9, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal(
						'Invalid previous block: 15335393038826825161 expected: 13068833527549895884'
					);
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load block 10 from db and return duplicated votes error', done => {
			blocks.lastBlock.set(loadTables[0].data[7]);

			blocksProcess.loadBlocksOffset(1, 10, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal(
						'Failed to validate vote schema: Array items are not unique (indexes 0 and 4)'
					);
					return done();
				}

				done(loadedBlock);
			});
		});
	});

	describe('loadBlocksOffset({verify: false}) - return block/transaction errors', () => {
		it('should clear fork_stat db table', done => {
			async.every(
				['forks_stat'],
				(table, seriesCb) => {
					clearDatabaseTable(db, modulesLoader.logger, table, seriesCb);
				},
				err => {
					if (err) {
						done(err);
					}
					done();
				}
			);
		});

		it('should load and process block 4 from db with invalid blockSignature', done => {
			blocks.lastBlock.set(loadTables[0].data[1]);

			blocksProcess.loadBlocksOffset(1, 4, false, (err, loadedBlock) => {
				if (err) {
					return done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[2].id);
				expect(loadedBlock.previousBlock).equal(
					loadTables[0].data[2].previousBlock
				);
				done();
			});
		});

		it('should load and process block 5 from db with invalid payloadHash', done => {
			blocks.lastBlock.set(loadTables[0].data[2]);

			blocksProcess.loadBlocksOffset(1, 5, false, (err, loadedBlock) => {
				if (err) {
					return done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[3].id);
				expect(loadedBlock.previousBlock).equal(
					loadTables[0].data[3].previousBlock
				);
				done();
			});
		});

		it('should load and process block 6 from db with invalid block timestamp', done => {
			blocks.lastBlock.set(loadTables[0].data[3]);

			blocksProcess.loadBlocksOffset(1, 6, false, (err, loadedBlock) => {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[4].id);
				expect(loadedBlock.previousBlock).equal(
					loadTables[0].data[4].previousBlock
				);
				done();
			});
		});

		it('should load block 7 from db and return unknown transaction type error', done => {
			blocks.lastBlock.set(loadTables[0].data[4]);

			blocksProcess.loadBlocksOffset(1, 7, true, (err, loadedBlock) => {
				if (err) {
					expect(err).equal(
						'Blocks#loadBlocksOffset error: Unknown transaction type 99'
					);
					return done();
				}

				done(loadedBlock);
			});
		});

		it('should load and process block 8 from db with invalid block version', done => {
			blocks.lastBlock.set(loadTables[0].data[5]);

			blocksProcess.loadBlocksOffset(1, 8, false, (err, loadedBlock) => {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[6].id);
				expect(loadedBlock.previousBlock).equal(
					loadTables[0].data[6].previousBlock
				);
				done();
			});
		});

		it('should load and process block 9 from db with invalid previousBlock (no fork:1)', done => {
			blocks.lastBlock.set(loadTables[0].data[1]);

			blocksProcess.loadBlocksOffset(1, 9, false, (err, loadedBlock) => {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[7].id);
				expect(loadedBlock.previousBlock).equal(
					loadTables[0].data[7].previousBlock
				);
				done();
			});
		});

		it('should load and process block 10 from db with duplicated votes', done => {
			blocks.lastBlock.set(loadTables[0].data[7]);

			blocksProcess.loadBlocksOffset(1, 10, false, (err, loadedBlock) => {
				if (err) {
					done(err);
				}

				expect(loadedBlock.id).equal(loadTables[0].data[8].id);
				expect(loadedBlock.previousBlock).equal(
					loadTables[0].data[8].previousBlock
				);
				done();
			});
		});
	});

	describe('loadBlocksFromPeer()', () => {
		it('should be ok');
	});

	describe('generateBlock()', () => {
		it('should be ok');
	});

	describe('onReceiveBlock()', () => {
		describe('calling receiveBlock()', () => {
			it('should be ok');
		});

		describe('calling receiveForkOne()', () => {
			it('should be ok');
		});

		describe('calling receiveForkFive()', () => {
			it('should be ok');
		});
	});

	describe('onBind()', () => {
		it('should be ok');
	});
});
