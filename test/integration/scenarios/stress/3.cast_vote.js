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
const lisk = require('lisk-elements').default;
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const sendTransactionsPromise = require('../../../common/helpers/api')
	.sendTransactionsPromise;
const confirmTransactionsOnAllNodes = require('../../utils/transactions')
	.confirmTransactionsOnAllNodes;

const broadcasting = process.env.BROADCASTING !== 'false';
const constants = __testContext.config.constants;

module.exports = function(configurations) {
	describe('@stress : type 3 transactions @slow', () => {
		let transactions = [];
		const accounts = [];
		const maximum = process.env.MAXIMUM_TRANSACTION || 1000;
		const waitForExtraBlocks = broadcasting ? 4 : 10; // Wait for extra blocks to ensure all the transactions are included in the blockchain

		describe(`prepare ${maximum} accounts`, () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(() => {
						const tmpAccount = randomUtil.account();
						const transaction = lisk.transaction.transfer({
							amount: 2500000000,
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: tmpAccount.address,
						});
						accounts.push(tmpAccount);
						transactions.push(transaction);
						return sendTransactionsPromise([transaction]);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				const blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) +
					waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, configurations)
						.then(done)
						.catch(err => {
							done(err);
						});
				});
			});
		});

		describe('sending vote transactions', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(num => {
						const transaction = lisk.transaction.castVotes({
							votes: [accountFixtures.existingDelegate.publicKey],
							unvotes: [],
							passphrase: accounts[num].passphrase,
						});
						transactions.push(transaction);
						return sendTransactionsPromise([transaction]);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				const blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) +
					waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, configurations)
						.then(done)
						.catch(err => {
							done(err);
						});
				});
			});
		});
	});
};
