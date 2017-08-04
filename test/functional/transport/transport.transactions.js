'use strict';

var Promise = require('bluebird');

var node = require('../../node');
var ws = require('../../common/wsCommunication');
var getTransaction = require('../../common/complexTransactions').getTransaction;
var getUnconfirmedTransaction = require('../../common/complexTransactions').getUnconfirmedTransaction;

var getTransactionPromise = Promise.promisify(getTransaction);
var getUnconfirmedTransactionPromise = Promise.promisify(getUnconfirmedTransaction);

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
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: '+account.address+' balance: 0');
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
	});

	describe('confirmation', function () {

		describe('before new block', function () {

			it('good transactions should remain unconfirmed', function () {
				return Promise.map(goodTransactions, function (tx){
					return getTransactionPromise(tx.id).then(function (res) {
						node.expect(res).to.have.property('success').to.be.not.ok;
						node.expect(res).to.have.property('error').equal('Transaction not found');
					});
				});
			});
		});

		describe('after new block', function () {

			before(function (done) {
				node.onNewBlock(done);
			});

			it('bad transactions should NOT be confirmed', function () {
				return Promise.map(badTransactions, function (tx){
					return getTransactionPromise(tx.id).then(function (res) {
						node.expect(res).to.have.property('success').to.be.not.ok;
						node.expect(res).to.have.property('error').equal('Transaction not found');
					});
				});
			});

			it('good transactions should NOT be UNconfirmed', function () {
				return Promise.map(goodTransactions, function (tx){
					return getUnconfirmedTransactionPromise(tx.id).then(function (res) {
						node.expect(res).to.have.property('success').to.be.not.ok;
						node.expect(res).to.have.property('error').equal('Transaction not found');
					});
				});
			});

			it('good transactions should be confirmed', function () {
				return Promise.map(goodTransactions, function (tx){
					return getTransactionPromise(tx.id).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transaction').to.have.property('id').equal(tx.id);
					});
				});
			});
		});
	});
});
