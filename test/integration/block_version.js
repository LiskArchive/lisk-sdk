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
const blockVersion = require('../../logic/block_version.js');
const queriesHelper = require('../common/integration/sql/queriesHelper.js');
const localCommon = require('./common');

const exceptions = global.exceptions;

describe('block_version', () => {
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	localCommon.beforeBlock('lisk_functional_block_version', lib => {
		library = lib;
		Queries = new queriesHelper(lib, lib.db);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);
	});

	describe('forge first round of blocks (101 blocks) with version 0', () => {
		before(() => {
			// Set current block version to 0
			blockVersion.currentBlockVersion = 0;

			// Forge 1 round of blocks to reach height 101 (genesis block is already there)
			return Promise.mapSeries([...Array(100)], () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 101', () => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.eql(101);
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
	});

	describe('forge second round of blocks (101 blocks) with version 1', () => {
		before(() => {
			// Set current block version to 1
			blockVersion.currentBlockVersion = 1;

			// Forge 1 round of blocks to reach height 202
			return Promise.mapSeries([...Array(101)], () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 202', () => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.eql(202);
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
	});

	describe('forge third round of blocks (101 blocks) with version 2', () => {
		before(() => {
			// Set current block version to 2
			blockVersion.currentBlockVersion = 2;

			// Forge 1 round of blocks to reach height 303
			return Promise.mapSeries([...Array(101)], () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('blockchain should be at height 303', () => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.eql(303);
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

	describe('when there are no exceptions for blocks versions', () => {
		it('snapshotting should fail', done => {
			const __private = library.rewiredModules.loader.__get__('__private');

			library.rewiredModules.loader.__set__(
				'library.config.loading.snapshotRound',
				3
			);

			__private.snapshotFinished = function(err) {
				expect(err).to.equal('Invalid block version');
				done();
			};

			__private.loadBlockChain();
		});
	});

	describe('when there are proper exceptions for blocks versions', () => {
		it('snapshotting should succeed', done => {
			// Set current block version to 3
			blockVersion.currentBlockVersion = 3;

			// Set proper exceptions for blocks versions
			exceptions.blockVersions = {
				0: { start: 1, end: 101 },
				1: { start: 102, end: 202 },
				2: { start: 203, end: 303 },
			};

			const __private = library.rewiredModules.loader.__get__('__private');

			library.rewiredModules.loader.__set__(
				'library.config.loading.snapshotRound',
				3
			);

			__private.snapshotFinished = function(err) {
				expect(err).to.not.exist;
				done();
			};

			__private.loadBlockChain();
		});
	});
});
