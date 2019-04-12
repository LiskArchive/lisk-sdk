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
const { transfer } = require('@liskhq/lisk-transactions');
const randomUtil = require('../common/utils/random');
const accountsFixtures = require('../fixtures/accounts');
const QueriesHelper = require('../common/integration/sql/queries_helper');
const localCommon = require('./common');

const { REWARDS } = global.constants;

describe('rebuilding', () => {
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	// Set rewards start at 150-th block
	REWARDS.OFFSET = 150;

	localCommon.beforeBlock('rebuilding', lib => {
		library = lib;
		Queries = new QueriesHelper(lib, lib.components.storage);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);
	});

	function getMemAccounts() {
		return Queries.getAccounts().then(rows => {
			const accounts = {};
			_.map(rows, acc => {
				accounts[acc.address] = acc;
			});
			return _.cloneDeep(accounts);
		});
	}

	describe('rebuilding to end of round 2 when blockchain contains 303 blocks', () => {
		let memAccountsBeforeRebuild;

		before(() => {
			const data = 'Lindsay 💖';

			// Forge 99 blocks to reach height 100 (genesis block is already there)
			return (
				Promise.mapSeries([...Array(99)], async () => {
					return addTransactionsAndForgePromise(library, [], 0);
				})
					// Forge 1 block with transaction to reach height 101
					.then(() => {
						const transaction = transfer({
							recipientId: randomUtil.account().address,
							amount: randomUtil.number(100000000, 1000000000).toString(),
							passphrase: accountsFixtures.genesis.passphrase,
							data,
						});
						return addTransactionsAndForgePromise(library, [transaction], 0);
					})
					// Forge 101 block with transaction to reach height 202
					.then(() => {
						return Promise.mapSeries([...Array(101)], async () => {
							return addTransactionsAndForgePromise(library, [], 0);
						});
					})
					.then(() => {
						return getMemAccounts().then(_accounts => {
							// Save copy of mem_accounts table
							memAccountsBeforeRebuild = _.cloneDeep(_accounts);
							// Forge one more round of blocks to reach height 303
							// blocks from that round should be deleted during rebuilding process)
							return Promise.mapSeries([...Array(101)], async () => {
								return addTransactionsAndForgePromise(library, [], 0);
							});
						});
					})
			);
		});

		it('mem_accounts states after rebuilding should match copy taken after round 2', done => {
			const lastBlock = library.modules.blocks.lastBlock.get();
			expect(lastBlock.height).to.eql(303);

			const __private = library.rewiredModules.loader.__get__('__private');

			library.rewiredModules.loader.__set__(
				'library.config.loading.rebuildUpToRound',
				2
			);

			__private.rebuildFinished = function(err) {
				expect(err).to.not.exist;
				getMemAccounts()
					.then(_accounts => {
						expect(_accounts).to.deep.equal(memAccountsBeforeRebuild);
						done();
					})
					.catch(getMemAccountsErr => {
						done(getMemAccountsErr);
					});
			};

			__private.loadBlockChain();
		});
	});
});
