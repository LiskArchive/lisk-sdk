'use strict';

var async = require('async');
var lisk = require('lisk-js');
var expect = require('chai').expect;
var config = require('../../config.json');
var constants = require('../../../helpers/constants');
var utils = require('../../common/utils');
var http = require('../../common/httpCommunication.js');
var ws = require('../../common/wsCommunication.js');

function postTransactions (transactions, done) {
	ws.call('postTransactions', {
		transactions: transactions
	}, done, true);
}

describe('postTransactions @slow', function () {

	describe('sending 1000 bundled transfers to random addresses', function () {

		var transactions = [];
		var maximum = 1000;
		var count = 1;

		before(function (done) {
			async.doUntil(function (next) {
				var bundled = [];

				for (var i = 0; i < config.broadcasts.releaseLimit; i++) {
					var transaction = lisk.transaction.createTransaction(
						utils.random.randomAccount().address,
						utils.random.randomNumber(100000000, 1000000000),
						utils.accounts.gAccount.password
					);

					transactions.push(transaction);
					bundled.push(transaction);
					count++;
				}

				postTransactions(bundled, function (err, res) {
					expect(res).to.have.property('success').to.be.ok;
					next();
				});
			}, function () {
				return (count >= maximum);
			}, function (err) {
				done(err);
			});
		});

		it('should confirm all transactions', function (done) {
			var blocksToWait = Math.ceil(maximum / constants.maxTxsPerBlock);
			utils.wait.waitForBlocks(blocksToWait, function () {
				async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						expect(res.body).to.have.property('success').to.be.ok;
						expect(res.body).to.have.property('transaction').that.is.an('object');
						return setImmediate(eachSeriesCb);
					});
				}, done);
			});
		}).timeout(500000);
	});

	describe('sending 1000 single transfers to random addresses', function () {

		var transactions = [];
		var maximum = 1000;
		var count = 1;

		before(function (done) {
			async.doUntil(function (next) {
				var transaction = lisk.transaction.createTransaction(
					utils.random.randomAccount().address,
					utils.random.randomNumber(100000000, 1000000000),
					utils.accounts.gAccount.password
				);

				postTransactions([transaction], function (err, res) {
					expect(res).to.have.property('success').to.be.ok;
					expect(res).to.have.property('transactionId').to.equal(transaction.id);
					transactions.push(transaction);
					count++;
					next();
				});
			}, function () {
				return (count >= maximum);
			}, function (err) {
				done(err);
			});
		});

		it('should confirm all transactions', function (done) {
			var blocksToWait = Math.ceil(maximum / constants.maxTxsPerBlock);
			utils.wait.waitForBlocks(blocksToWait, function () {
				async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						expect(res.body).to.have.property('success').to.be.ok;
						expect(res.body).to.have.property('transaction').that.is.an('object');
						return setImmediate(eachSeriesCb);
					});
				}, done);
			});
		}).timeout(500000);
	});
});
