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

var async = require('async');
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
	describe('stress test for type 0 transactions with data @slow', () => {
		var transactions = [];
		var maximum = 1000;
		var waitForExtraBlocks = 4; // Wait for extra blocks to ensure all the transactions are included in the block

		describe('sending 1000 bundled transfers to random addresses', () => {
			var count = 1;

			before(done => {
				async.doUntil(
					next => {
						var bundled = [];
						for (
							var i = 0;
							i < params.configurations[0].broadcasts.releaseLimit;
							i++
						) {
							var transaction = lisk.transaction.transfer({
								amount: randomUtil.number(100000000, 1000000000),
								passphrase: accountFixtures.genesis.passphrase,
								recipientId: randomUtil.account().address,
								data: randomUtil.dataField(64),
							});
							transactions.push(transaction);
							bundled.push(transaction);
							count++;
						}
						sendTransactionsPromise(bundled).then(next);
					},
					() => {
						return count >= maximum;
					},
					() => {
						done();
					}
				);
			});

			it('should confirm all transactions on all nodes', done => {
				var blocksToWait =
					Math.ceil(maximum / constants.maxTransactionsPerBlock) +
					waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, params).then(done);
				});
			});
		});

		describe('sending 1000 single transfers to random addresses', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(maximum).map(() => {
						var transaction = lisk.transaction.transfer({
							amount: randomUtil.number(100000000, 1000000000),
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: randomUtil.account().address,
							data: randomUtil.dataField(64),
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
					confirmTransactionsOnAllNodes(transactions, params).then(done);
				});
			});
		});
	});
};
