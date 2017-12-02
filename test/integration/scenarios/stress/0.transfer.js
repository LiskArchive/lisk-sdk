'use strict';

var _ = require('lodash');
var async = require('async');
var Promise = require('bluebird');
var expect = require('chai').expect;
var lisk = require('lisk-js');

var accountFixtures = require('../../../fixtures/accounts');
var constants = require('../../../../helpers/constants');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/waitFor');

var apiCodes = require('../../../../helpers/apiCodes');
var sendTransactionsPromise = require('../../../common/helpers/api').sendTransactionsPromise;
var getTransaction = require('../../utils/http').getTransaction;

module.exports = function (params) {

	describe('postTransactions @slow', function () {

		var transactions = [];

		function confirmTransactionsOnAllNodes () {
			Promise.all(_.flatMap(params.configurations, function (configuration) {
				return transactions.map(function (transaction) {
					return getTransaction(transaction.id, configuration.port);
				});
			})).then(function (results) {
				results.forEach(function (res) {
					expect(res.body).to.have.property('transaction').that.is.an('object');
				});
			});
		}

		describe('sending 1000 bundled transfers to random addresses', function () {

			var maximum = 1000;
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

			it('should confirm all transactions on all nodes', function () {
				var blocksToWait = Math.ceil(maximum / constants.maxTxsPerBlock);
				return waitFor.confirmations(_.map(transactions, 'id'), blocksToWait).then(confirmTransactionsOnAllNodes);
			}).timeout(500000);
		});

		describe('sending 1000 single transfers to random addresses', function () {

			var maximum = 1000;
			var count = 1;

			before(function (done) {
				async.doUntil(function (next) {
					var transaction = lisk.transaction.createTransaction(
						randomUtil.account().address,
						randomUtil.number(100000000, 1000000000),
						accountFixtures.genesis.password
					);
					sendTransactionsPromise([transaction]).then(next);
				}, function () {
					return (count >= maximum);
				}, function () {
					done();
				});
			});

			it('should confirm all transactions on all nodes', function () {
				var blocksToWait = Math.ceil(maximum / constants.maxTxsPerBlock);
				return waitFor.confirmations(_.map(transactions, 'id'), blocksToWait).then(confirmTransactionsOnAllNodes);
			}).timeout(500000);
		});
	});
};
