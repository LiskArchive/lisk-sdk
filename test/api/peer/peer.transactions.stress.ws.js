'use strict';

var node = require('../../node.js');
var http = require('../../common/httpCommunication.js');
var ws = require('../../common/wsCommunication.js');

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transaction: transaction
	}, done, true);
}

function postTransactions (transactions, done) {
	ws.call('postTransactions', {
		transactions: transactions
	}, done, true);
}

describe('postTransactions', function () {

	describe('sending 1000 bundled transfers to random addresses', function () {

		var transactions = [];
		var maximum = 1000;
		var count = 1;

		before(function (done) {
			node.async.doUntil(function (next) {
				var bundled = [];

				for (var i = 0; i < node.config.broadcasts.releaseLimit; i++) {
					var transaction = node.lisk.transaction.createTransaction(
						node.randomAccount().address,
						node.randomNumber(100000000, 1000000000),
						node.gAccount.password
					);

					transactions.push(transaction);
					bundled.push(transaction);
					count++;
				}

				postTransactions(bundled, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					next();
				});
			}, function () {
				return (count >= maximum);
			}, function (err) {
				done(err);
			});
		});

		it('should confirm all transactions', function (done) {
			var blocksToWait = Math.ceil(maximum / node.constants.maxTxsPerBlock);
			node.waitForBlocks(blocksToWait, function (err) {
				node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('transaction').that.is.an('object');
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
			node.async.doUntil(function (next) {
				var transaction = node.lisk.transaction.createTransaction(
					node.randomAccount().address,
					node.randomNumber(100000000, 1000000000),
					node.gAccount.password
				);

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
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
			var blocksToWait = Math.ceil(maximum / node.constants.maxTxsPerBlock);
			node.waitForBlocks(blocksToWait, function (err) {
				node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('transaction').that.is.an('object');
						return setImmediate(eachSeriesCb);
					});
				}, done);
			});
		}).timeout(500000);
	});
});
