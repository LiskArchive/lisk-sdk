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
const blockVersion = require('../../../../logic/block_version.js');
const queriesHelper = require('../../../common/integration/sql/queriesHelper.js');
const localCommon = require('../../common');

const exceptions = global.exceptions;

describe('validateOwnChain', () => {
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	localCommon.beforeBlock(
		'lisk_functional_validate_own_chain_valid_chain_full_round',
		lib => {
			library = lib;
			Queries = new queriesHelper(lib, lib.db);

			addTransactionsAndForgePromise = Promise.promisify(
				localCommon.addTransactionsAndForge
			);
		}
	);

	describe('forge 2 rounds (202 blocks) with version = 0', () => {
		before(() => {
			// Set current block version to 0
			blockVersion.currentBlockVersion = 0;

			// Not consider the genesis block
			return Promise.mapSeries([...Array(101 * 2 - 1)], () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 202', () => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.eql(202);
		});

		it('all blocks should have version = 0', () => {
			const version = 0;

			return Queries.getAllBlocks().then(rows => {
				_.each(rows, row => {
					expect(row.version).to.be.equal(version);
				});
			});
		});

		describe('increase block version = 1 and exceptions for height = 202', () => {
			let validateOwnChainError = null;

			before(done => {
				const __private = library.rewiredModules.loader.__get__('__private');

				// Set current block version to 1
				blockVersion.currentBlockVersion = 1;

				// Set proper exceptions for blocks versions
				exceptions.blockVersions = {
					0: { start: 1, end: 202 },
				};

				__private.validateOwnChain(error => {
					validateOwnChainError = error;
					done();
				});
			});

			it('there should be no error during chain validation', () => {
				expect(library.logger.info).to.be.calledWith(
					'Finished validating the chain. You are at height 202.'
				);
				return expect(validateOwnChainError).to.be.eql(null);
			});

			it('blockchain should be at height 202', () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return expect(lastBlock.height).to.eql(202);
			});

			it('remaining blocks have version = 0', () => {
				return Queries.getAllBlocks().then(rows => {
					_.each(rows, row => {
						expect(row.version).to.be.equal(0);
					});
				});
			});

			describe('forge 5 more blocks', () => {
				before(() => {
					return Promise.mapSeries([...Array(5)], () => {
						return addTransactionsAndForgePromise(library, [], 0);
					});
				});

				it('blockchain should be at height 207', () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return expect(lastBlock.height).to.eql(207);
				});

				it('last 5 blocks should have version = 1', () => {
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
