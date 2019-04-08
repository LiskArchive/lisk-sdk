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

const async = require('async');
const blockVersion = require('../../../../../src/modules/chain/logic/block_version');
const application = require('../../../common/application');
const modulesLoader = require('../../../common/modules_loader');
const clearDatabaseTable = require('../../../common/storage_sandbox')
	.clearDatabaseTable;
const loadTables = require('./process_tables_data.json');
const definitions = require('../../../../../src/modules/chain/schema/definitions');

const { REWARDS } = global.constants;

describe('integration test (blocks) - process', () => {
	let blocksProcess;
	let blocks;
	let storage;
	let originalBlockRewardsOffset;
	let scope;

	before(done => {
		// Force rewards start at 150-th block
		originalBlockRewardsOffset = REWARDS.OFFSET;
		REWARDS.OFFSET = 150;

		// Set current block version to 0
		blockVersion.currentBlockVersion = 0;

		application.init(
			{ sandbox: { name: 'blocks_process' } },
			(err, scopeInit) => {
				blocksProcess = scopeInit.modules.blocks.process;
				blocks = scopeInit.modules.blocks;
				storage = scopeInit.components.storage;
				scope = scopeInit;
				done(err);
			}
		);
	});

	after(done => {
		REWARDS.OFFSET = originalBlockRewardsOffset;
		application.cleanup(done);
	});

	beforeEach(done => {
		async.series(
			{
				clearTables: seriesCb => {
					async.every(
						[
							'blocks WHERE height > 1',
							'trs WHERE "blockId" != \'6524861224470851795\'',
							"mem_accounts WHERE address IN ('2737453412992791987L', '2896019180726908125L')",
							'forks_stat',
						],
						(table, everyCb) => {
							clearDatabaseTable(
								storage,
								modulesLoader.scope.components.logger,
								table
							)
								.then(res => {
									everyCb(null, res);
								})
								.catch(error => {
									everyCb(error, null);
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
				loadTables: seriesCb => {
					async.everySeries(
						loadTables,
						(table, everySeriesCb) => {
							const cs = new storage.adapter.db.$config.pgp.helpers.ColumnSet(
								table.fields,
								{
									table: table.name,
								}
							);
							const insert = storage.adapter.db.$config.pgp.helpers.insert(
								table.data,
								cs
							);
							storage.adapter
								.execute(insert)
								.then(() => {
									everySeriesCb(null, true);
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
				return done();
			}
		);
	});

	describe('getCommonBlock()', () => {
		describe('validation with definitions.CommonBlock', () => {
			let validCommonBlock;
			const blockHeightTwo = {
				id: '3082931137036442832',
				previousBlock: '6524861224470851795',
				timestamp: '52684260',
				height: 2,
			};

			let commonBlockValidationError;

			beforeEach(() => {
				return scope.schema.validate(
					validCommonBlock,
					definitions.CommonBlock,
					err => {
						commonBlockValidationError = err;
					}
				);
			});

			describe('when rpc.commonBlock call returns valid result', () => {
				before(done => {
					validCommonBlock = Object.assign({}, blockHeightTwo);
					done();
				});

				it('should return undefined error', async () => {
					return expect(commonBlockValidationError).to.be.undefined;
				});
			});

			describe('when rpc.commonBlock call returns invalid result', () => {
				describe('when id = null', () => {
					before(done => {
						validCommonBlock = Object.assign({}, blockHeightTwo);
						validCommonBlock.id = null;
						done();
					});

					it('should return array of errors', async () => {
						return expect(commonBlockValidationError)
							.to.be.an('array')
							.of.length(1);
					});

					it('should return error containing message', async () => {
						return expect(commonBlockValidationError)
							.to.have.nested.property('0.message')
							.equal('Expected type string but found type null');
					});

					it('should return error containing path', async () => {
						return expect(commonBlockValidationError)
							.to.have.nested.property('0.path')
							.equal('#/id');
					});
				});

				describe('when previousBlock = null', () => {
					before(done => {
						validCommonBlock = Object.assign({}, blockHeightTwo);
						validCommonBlock.previousBlock = null;
						done();
					});

					it('should return array of errors', async () => {
						return expect(commonBlockValidationError)
							.to.be.an('array')
							.of.length(1);
					});

					it('should return error containing message', async () => {
						return expect(commonBlockValidationError)
							.to.have.nested.property('0.message')
							.equal('Expected type string but found type null');
					});

					it('should return error containing path', async () => {
						return expect(commonBlockValidationError)
							.to.have.nested.property('0.path')
							.equal('#/previousBlock');
					});
				});
			});
		});
	});

	describe('loadBlocksOffset() - no errors', () => {
		it('should load block 2 from db: block without transactions', done => {
			blocks.lastBlock.set(__testContext.config.genesisBlock);
			blocksProcess.loadBlocksOffset(1, 2, (err, loadedBlock) => {
				if (err) {
					return done(err);
				}

				blocks.lastBlock.set(loadedBlock);
				expect(loadedBlock.height).to.equal(2);
				return done();
			});
		});

		it('should load block 3 from db: block with transactions', done => {
			blocksProcess.loadBlocksOffset(1, 3, (err, loadedBlock) => {
				if (err) {
					return done(err);
				}

				blocks.lastBlock.set(loadedBlock);
				expect(loadedBlock.height).to.equal(3);
				return done();
			});
		});
	});

	describe('loadBlocksOffset() - block/transaction errors', () => {
		it('should load block 4 from db and return blockSignature error', done => {
			blocksProcess.loadBlocksOffset(1, 4, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Failed to verify block signature');
					return done();
				}

				return done(loadedBlock);
			});
		});

		it('should load block 5 from db and return payloadHash error', done => {
			blocks.lastBlock.set(loadTables[0].data[2]);

			blocksProcess.loadBlocksOffset(1, 5, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Invalid payload hash');
					return done();
				}

				return done(loadedBlock);
			});
		});

		it('should load block 6 from db and return block timestamp error', done => {
			blocks.lastBlock.set(loadTables[0].data[4]);

			blocksProcess.loadBlocksOffset(1, 6, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Invalid block timestamp');
					return done();
				}

				return done(loadedBlock);
			});
		});

		it('should load block 7 from db and return unknown transaction type error', done => {
			blocks.lastBlock.set(loadTables[0].data[4]);

			blocksProcess.loadBlocksOffset(1, 7, (err, loadedBlock) => {
				if (err) {
					expect(err).equal(
						'Blocks#loadBlocksOffset error: Unknown transaction type 99'
					);
					return done();
				}

				return done(loadedBlock);
			});
		});

		it('should load block 8 from db and return block version error', done => {
			blocks.lastBlock.set(loadTables[0].data[5]);

			blocksProcess.loadBlocksOffset(1, 8, (err, loadedBlock) => {
				if (err) {
					expect(err).equal('Invalid block version');
					return done();
				}

				return done(loadedBlock);
			});
		});

		it('should load block 9 from db and return previousBlock error (fork:1)', done => {
			blocks.lastBlock.set(loadTables[0].data[1]);

			blocksProcess.loadBlocksOffset(1, 9, (err, loadedBlock) => {
				if (err) {
					expect(err).equal(
						'Invalid previous block: 15335393038826825161 expected: 13068833527549895884'
					);
					return done();
				}

				return done(loadedBlock);
			});
		});

		it('should load block 10 from db and return duplicated votes error', done => {
			blocks.lastBlock.set(loadTables[0].data[7]);

			blocksProcess.loadBlocksOffset(1, 10, (err, loadedBlock) => {
				if (err) {
					expect(err).equal(
						'Failed to validate vote schema: Array items are not unique (indexes 0 and 4)'
					);
					return done();
				}

				return done(loadedBlock);
			});
		});
	});
});
