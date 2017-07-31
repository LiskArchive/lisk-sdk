'use strict';

var _ = require('lodash');
var crypto = require('crypto');

var node = require('../../node.js');
var ws = require('../../common/wsCommunication.js');
var http = require('../../common/httpCommunication.js');

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transaction: transaction
	}, done, true);
}

function getTransactions (transactions, cb) {
	http.get('/api/transactions', function (err, res) {
		if (err) {
			return cb(err);
		}
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('transactions').to.be.an('array');
		cb(null, res.body.transactions);
	});
}

describe('getTransactions', function () {

	it('should return valid response', function (done) {
		ws.call('getTransactions', function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactions').to.be.an('array');
			done();
		});
	});

	before(function (done) {

		var randomAccount = node.randomAccount();
		var transaction = node.lisk.transaction.createTransaction(randomAccount.address, 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			done(err);
		});
	});

	it('should return non empty transaction list after post', function (done) {
		ws.call('getTransactions', function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactions').to.be.an('array').and.to.be.not.empty;
			done();
		});
	});
});

describe('postTransactions', function () {

	var goodTransactions = [];

	describe('schema', function () {

		it('using valid transaction should be ok', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

			postTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				done();
			});

			goodTransactions.push(transaction);
		});
	});

	describe('processing', function () {

		it('when sender has funds should be ok', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

			postTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				done();
			});

			goodTransactions.push(transaction);
		});
	});

	describe('confirmation', function () {

		before(function (done) {
			node.onNewBlock(function () {
				done();
			});
		});

		it('well processed transactions should have been confirmed', function (done) {
			getTransactions(goodTransactions, function (err, transactionsReceived) {
				var goodTransactionIds = goodTransactions.map(function (goodTransaction) {
					return _.get(goodTransaction, 'id', null);
				}).filter(function (transactionId) {
					return !!transactionId;
				});

				node.expect(_.intersection(_.map(transactionsReceived, 'id'), goodTransactionIds)).to.not.have.lengthOf(goodTransactions);
				done();
			});
		});
	});
});
