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
var lisk = require('lisk-js');

var accountFixtures = require('../../../fixtures/accounts');
var constants = require('../../../../helpers/constants');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/waitFor');

var sendTransactionsPromise = require('../../../common/helpers/api').sendTransactionsPromise;
var getTransaction = require('../../utils/http').getTransaction;

module.exports = function (params) {

	describe('postTransactions @slow', function () {

		var transactions = [];
		var maximum = 1000;

		function confirmTransactionsOnAllNodes () {
			return Promise.all(_.flatMap(params.configurations, function (configuration) {
				return transactions.map(function (transaction) {
					return getTransaction(transaction.id, configuration.httpPort);
				});
			})).then(function (results) {
				results.forEach(function (transaction) {
					expect(transaction).to.have.property('id').that.is.an('string');
				});
			});
		}

		describe('sending 1000 bundled transfers to random addresses', function () {

			var count = 1;

			before(function (done) {
				async.doUntil(function (next) {
					var bundled = [];
					for (var i = 0; i < params.configurations[0].broadcasts.releaseLimit; i++) {
						var transaction = lisk.transaction.createTransaction(
							randomUtil.account().address,
							randomUtil.number(100000000, 1000000000),
							accountFixtures.genesis.password
						);
						transactions.push(transaction);
						bundled.push(transaction);
						count++;
					}
					sendTransactionsPromise(bundled).then(next);
				}, function () {
					return (count >= maximum);
				}, function () {
					done();
				});
			});

			it('should confirm all transactions on all nodes', function (done) {
				var blocksToWait = Math.ceil(maximum / constants.maxTxsPerBlock);
				waitFor.blocks(blocksToWait, function () {
					confirmTransactionsOnAllNodes().then(done);
				});
			});
		});

		describe('sending 1000 single transfers to random addresses', function () {

			before(function () {
				transactions = [];
				return Promise.all(_.range(maximum).map(function () {
					var transaction = lisk.transaction.createTransaction(
						randomUtil.account().address,
						randomUtil.number(100000000, 1000000000),
						accountFixtures.genesis.password
					);
					transactions.push(transaction);
					return sendTransactionsPromise([transaction]);
				}));
			});

			it('should confirm all transactions on all nodes', function (done) {
				var blocksToWait = Math.ceil(maximum / constants.maxTxsPerBlock);
				waitFor.blocks(blocksToWait, function () {
					confirmTransactionsOnAllNodes().then(done);
				});
			});
		});
	});
};
