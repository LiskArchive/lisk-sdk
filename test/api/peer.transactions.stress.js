'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

function postTransaction (transaction, done) {
	node.post('/peer/transactions', {
		transaction: transaction
	}, done);
}

describe('POST /peer/transactions', function () {

	describe('sending 1000 transfers to random addresses', function () {

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
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);
					transactions.push(transaction);
					count++;
					next();
				});
			}, function () {
				return (count === maximum);
			}, function (err) {
				done(err);
			});
		});

		it('should confirm all transactions', function (done) {
			var blocksToWait = maximum / node.constants.maxTxsPerBlock + 1;
			node.waitForBlocks(blocksToWait, function (err) {
				node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					node.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('transaction').that.is.an('object');
						return setImmediate(eachSeriesCb);
					});
				}, done);
			});
		}).timeout(500000);
	});
});
