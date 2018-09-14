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
		'lisk_functional_validate_own_chain_more_than_two_rounds',
		lib => {
			library = lib;
			Queries = new queriesHelper(lib, lib.db);

			addTransactionsAndForgePromise = Promise.promisify(
				localCommon.addTransactionsAndForge
			);
		}
	);

	describe('forge 3 rounds (303 blocks) with version = 0', () => {
		before(() => {
			// Set current block version to 0
			blockVersion.currentBlockVersion = 0;

			// Not consider the genesis block
			return Promise.mapSeries([...Array(101 * 3 - 1)], () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 303', () => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.eql(303);
		});

		it('all blocks should have version = 0', () => {
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

			before(done => {
				const __private = library.rewiredModules.loader.__get__('__private');

				// Set current block version to 1
				blockVersion.currentBlockVersion = 1;

				// Set proper exceptions for blocks versions
				exceptions.blockVersions = {
					0: { start: 0, end: 50 },
				};

				__private.validateOwnChain(error => {
					validateOwnChainError = error;
					done();
				});
			});

			it('should fail with error', () => {
				expect(library.logger.error).to.be.calledWith(
					"There are more than 202 invalid blocks. Can't delete those to recover the chain."
				);
				return expect(validateOwnChainError.message).to.be.eql(
					'Your block chain is invalid. Please rebuild from snapshot.'
				);
			});
		});
	});
});
