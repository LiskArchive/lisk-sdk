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

const Promise = require('bluebird');
const QueriesHelper = require('../../../common/integration/sql/queries_helper');
const localCommon = require('../../common');

describe('validateOwnChain', () => {
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	localCommon.beforeBlock('integration_valid_chain_full_round', lib => {
		library = lib;
		Queries = new QueriesHelper(lib, lib.components.storage);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge,
		);
	});

	describe('forge 2 rounds (202 blocks) with version = 0', () => {
		before(() => {
			library.modules.blocks.blocksVerify.exceptions = {
				...library.modules.blocks.exceptions,
				blockVersions: {
					0: {
						start: 1,
						end: 202,
					},
				},
			};

			// Not consider the genesis block
			return Promise.mapSeries([...Array(101 * 2 - 1)], async () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 202', async () => {
			const lastBlock = library.modules.blocks.lastBlock;
			return expect(lastBlock.height).to.eql(202);
		});

		it('all blocks should have version = 0', async () => {
			const version = 0;

			return Queries.getAllBlocks().then(rows => {
				_.each(rows, row => {
					expect(row.version).to.be.equal(version);
				});
			});
		});

		describe('increase block version = 1 and exceptions for height = 202', () => {
			let validateOwnChainError = null;

			before(async () => {
				// Set proper exceptions for blocks versions
				library.modules.blocks.blocksVerify.exceptions = {
					...library.modules.blocks.exceptions,
					blockVersions: {
						0: {
							start: 1,
							end: 202,
						},
					},
				};

				try {
					await library.modules.blocks.blocksVerify.requireBlockRewind(
						library.modules.blocks.lastBlock,
					);
				} catch (error) {
					validateOwnChainError = error;
				}
			});

			it('there should be no error during chain validation', async () => {
				return expect(validateOwnChainError).to.be.eql(null);
			});

			it('blockchain should be at height 202', async () => {
				const lastBlock = library.modules.blocks.lastBlock;
				return expect(lastBlock.height).to.eql(202);
			});

			it('remaining blocks have version = 0', async () => {
				return Queries.getAllBlocks().then(rows => {
					_.each(rows, row => {
						expect(row.version).to.be.equal(0);
					});
				});
			});

			describe('forge 5 more blocks', () => {
				before(() => {
					return Promise.mapSeries([...Array(5)], async () => {
						return addTransactionsAndForgePromise(library, [], 0);
					});
				});

				it('blockchain should be at height 207', async () => {
					const lastBlock = library.modules.blocks.lastBlock;
					return expect(lastBlock.height).to.eql(207);
				});

				it('last 5 blocks should have version = 1', async () => {
					return Queries.getAllBlocks().then(rows => {
						_.each(rows, row => {
							if (row.height > 202) {
								expect(row.version).to.be.equal(1);
							}
						});
					});
				});
			});
		});
	});
});
