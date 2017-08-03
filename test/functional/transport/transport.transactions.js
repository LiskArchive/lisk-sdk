'use strict';

var _ = require('lodash');
var crypto = require('crypto');
var Promise = require('bluebird');

var node = require('../../node.js');
var ws = require('../../common/wsCommunication.js');
var getTransaction = require('../../common/complexTransactions.js').getTransaction;
var getTransactionPromisify = Promise.promisify(getTransaction);
var getUnconfirmedTransaction = require('../../common/complexTransactions.js').getUnconfirmedTransaction;
var getUnconfirmedTransactionPromisify = Promise.promisify(getUnconfirmedTransaction);

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transaction: transaction
	}, done, true);
}

describe('Basic Transactions via websockets', function () {

	var transaction;
	var goodTransactions = [];
	var badTransactions = [];
	var account = node.randomAccount();

	beforeEach(function () {
		transaction = node.randomTx();
	});

	describe('schema', function () {
	});

	describe('processing', function () {

		it('when sender has NO funds should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			postTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
				badTransactions.push(transaction);
				done();
			});
		});

		it('when sender has funds should be OK', function (done) {
			postTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
				done();
			});
		});

		it('good transactions should NOT be confirmed before new block', function () {
			return Promise.map(goodTransactions, function (tx){
				return getTransactionPromisify(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});
	});

	describe('confirmation', function () {

		before(function (done) {
			node.onNewBlock(done);
		});

		it('bad transactions should NOT be confirmed', function () {
			return Promise.map(badTransactions, function (tx){
				return getTransactionPromisify(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should NOT be unconfirmed', function () {
			return Promise.map(goodTransactions, function (tx){
				return getUnconfirmedTransactionPromisify(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return Promise.map(goodTransactions, function (tx){
				return getTransactionPromisify(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transaction').to.have.property('id').equal(tx.id);
				});
			});
		});
	});
});
