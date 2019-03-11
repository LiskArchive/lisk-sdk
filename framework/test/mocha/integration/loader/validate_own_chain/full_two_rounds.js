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

const Promise = require('bluebird');
const blockVersion = require('../../../../../src/modules/chain/logic/block_version.js');
const QueriesHelper = require('../../../common/integration/sql/queries_helper.js');
const localCommon = require('../../common');

const exceptions = global.exceptions;

describe('validateOwnChain', () => {
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	localCommon.beforeBlock(
		'lisk_functional_validate_own_chain_full_two_rounds',
		lib => {
			library = lib;
			Queries = new QueriesHelper(lib, lib.components.storage);

			addTransactionsAndForgePromise = Promise.promisify(
				localCommon.addTransactionsAndForge
			);
		}
	);

	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('[1.7-transactions-changes-revisit] forge 3 rounds (303 blocks) with version = 0', () => {
		before(() => {
			// Set current block version to 0
			blockVersion.currentBlockVersion = 0;

			// Not consider the genesis block
			return Promise.mapSeries([...Array(101 * 3 - 1)], async () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 303', async () => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.eql(303);
		});

		it('all blocks should have version = 0', async () => {
			const version = 0;

			return Queries.getAllBlocks().then(rows => {
				_.each(rows, row => {
					expect(row.version).to.be.equal(version);
				});
			});
		});

		describe('increase block version = 1 and exceptions for height = 101', () => {
			let validateOwnChainError = null;

			before(done => {
				const __private = library.rewiredModules.loader.__get__('__private');

				// Set current block version to 1
				blockVersion.currentBlockVersion = 1;

				// Set proper exceptions for blocks versions
				exceptions.blockVersions = {
					0: { start: 0, end: 101 },
				};

				__private.validateOwnChain(error => {
					validateOwnChainError = error;
					done();
				});
			});

			it('there should be no error during chain validation', async () => {
				expect(library.components.logger.info).to.be.calledWith(
					'Finished validating the chain. You are at height 101.'
				);
				return expect(validateOwnChainError).to.be.eql(null);
			});

			it('blockchain should be at height 101', async () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return expect(lastBlock.height).to.eql(101);
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

				it('blockchain should be at height 106', async () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return expect(lastBlock.height).to.eql(106);
				});

				it('last 5 blocks should have version = 1', async () => {
					return Queries.getAllBlocks().then(rows => {
						_.each(rows, row => {
							if (row.height > 101) {
								expect(row.version).to.be.equal(1);
							}
						});
					});
				});
			});
		});
	});
});
