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
const constants = require('../../../helpers/constants');
const queriesHelper = require('../common/sql/queriesHelper.js');
const localCommon = require('./common');

describe('block_version', () => {
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	constants.blockVersions = [
		1,
		102, // Bump block version at height 102
		203, // Bump block version at height 203
	];

	localCommon.beforeBlock('lisk_functional_block_version', lib => {
		library = lib;
		Queries = new queriesHelper(lib, lib.db);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);
	});

	describe('forge 3 rounds of blocks (303 blocks) with different block version each round', () => {
		before(() => {
			// Forge 3 rounds of blocks to reach height 303 (genesis block is already there)
			return Promise.mapSeries([...Array(302)], () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 303', () => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.eql(303);
		});

		it('blocks of round 1 should have version = 0', () => {
			const round = 1;
			const version = 0;

			return Queries.getBlocks(round).then(rows => {
				_.each(rows, row => {
					expect(row.version).to.be.equal(version);
				});
			});
		});

		it('blocks of round 2 should have version = 1', () => {
			const round = 2;
			const version = 1;

			return Queries.getBlocks(round).then(rows => {
				_.each(rows, row => {
					expect(row.version).to.be.equal(version);
				});
			});
		});

		it('blocks of round 3 should have version = 2', () => {
			const round = 3;
			const version = 2;

			return Queries.getBlocks(round).then(rows => {
				_.each(rows, row => {
					expect(row.version).to.be.equal(version);
				});
			});
		});
	});
});
