'use strict';

require('../functional.js');

var node = require('../../node.js');
var ws = require('../../common/ws/communication.js');
var shared = require('../shared');

var waitFor = require('../../common/utils/waitFor');

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
				node.expect(err).to.be.null;
				var blocksToWait = Math.ceil(maximum / node.constants.maxTxsPerBlock);
				waitFor.blocks(blocksToWait, function (err, res) {
					done();
				});
			});
		});

		shared.confirmationPhase(transactions);
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

				postTransactions([transaction], function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					transactions.push(transaction);
					count++;
					next();
				});
			}, function () {
				return (count >= maximum);
			}, function (err) {
				node.expect(err).to.be.null;
				var blocksToWait = Math.ceil(maximum / node.constants.maxTxsPerBlock);
				waitFor.blocks(blocksToWait, function (err, res) {
					done();
				});
			});
		});

		shared.confirmationPhase(transactions);
	});
});
