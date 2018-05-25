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

var Promise = require('bluebird');
var lisk = require('lisk-js').default;
var accountFixtures = require('../../../fixtures/accounts');
var constants = require('../../../../helpers/constants');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var sendTransactionsPromise = require('../../../common/helpers/api')
	.sendTransactionsPromise;
var confirmTransactionsOnAllNodes = require('../common/stress')
	.confirmTransactionsOnAllNodes;

module.exports = function(params) {
	describe('stress test for type 5 transactions @slow', () => {
		var transactions = [];
		var accounts = [];
		var maximum = 1000;
		var waitForExtraBlocks = 2; // Wait for extra blocks to ensure all the transactions are included in the block

		describe('prepare accounts', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(() => {
						var tmpAccount = randomUtil.account();
						var transaction = lisk.transaction.transfer({
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
				var blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) +
					waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, params)
						.then(done)
						.catch(err => {
							done(err);
						});
				});
			});
		});

		describe('sending dapp registrations', () => {
			before(() => {
				var dappName;
				transactions = [];
				return Promise.all(
					_.range(maximum).map(num => {
						dappName = randomUtil.applicationName();
						var transaction = lisk.transaction.createDapp({
							passphrase: accounts[num].passphrase,
							options: {
								name: dappName,
								category: 1,
								description: 'desc',
								tags: '2',
								type: 0,
								link: `https://github.com/blocksafe/SDK-notice/${dappName}/master.zip`,
								icon: `http://www.blocksafefoundation.com/${dappName}/header.jpg`,
							},
						});
						transactions.push(transaction);
						return sendTransactionsPromise([transaction]);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				var blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) +
					waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, params)
						.then(done)
						.catch(err => {
							done(err);
						});
				});
			});
		});
	});
};
