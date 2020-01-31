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

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('validateOwnChain', () => {
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	localCommon.beforeBlock('validate_own_chain_more_than_two_rounds', lib => {
		library = lib;
		Queries = new QueriesHelper(lib, lib.components.storage);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge,
		);
	});

	describe('forge 3 rounds (303 blocks) with version = 0', () => {
		before(() => {
			library.modules.blocks.blocksVerify.exceptions = {
				...library.modules.blocks.exceptions,
				blockVersions: {
					0: {
						start: 1,
						end: 303,
					},
				},
			};

			// Not consider the genesis block
			return Promise.mapSeries([...Array(101 * 3 - 1)], async () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 303', async () => {
			const lastBlock = library.modules.blocks.lastBlock;
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

		// Setting exception to height 50 will cause chain to delete 303 - 50 = 253 blocks
		// which is more than 2 rounds (202 blocks) so system should be stopped with error
		describe('increase block version = 1 and exceptions for height = 50', () => {
			let validateOwnChainError = null;

			before(async () => {
				// Set proper exceptions for blocks versions
				library.modules.blocks.blocksVerify.exceptions = {
					...library.modules.blocks.exceptions,
					blockVersions: {
						0: {
							start: 1,
							end: 50,
						},
					},
				};

				try {
					await library.modules.blocks.blocksVerify.requireBlockRewind(
						library.modules.blocks.lastBlock,
					);
					library.modules.blocks.resetBlockHeaderCache();
					library.modules.blocks._lastBlock = await library.modules.blocks.blocksProcess.recoverInvalidOwnChain(
						library.modules.blocks.lastBlock,
						() => {},
					);
				} catch (error) {
					validateOwnChainError = error;
				}
			});

			it('should fail with error', async () => {
				return expect(validateOwnChainError.message).to.be.eql(
					"There are more than 202 invalid blocks. Can't delete those to recover the chain.",
				);
			});
		});
	});
});
