'use strict';

var node = require('../../../node');

var getTransaction = require('../../../common/complexTransactions').getTransaction;
var getUnconfirmedTransaction = require('../../../common/complexTransactions').getUnconfirmedTransaction;

var getTransactionPromise = node.Promise.promisify(getTransaction);
var getUnconfirmedTransactionPromise = node.Promise.promisify(getUnconfirmedTransaction);

exports.confirmationPhase = function (goodTransactions, badTransactions){

	describe('before new block', function () {

		it('good transactions should remain unconfirmed', function () {
			return node.Promise.map(goodTransactions, function (tx) {
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

		it('bad transactions should not be confirmed', function () {
			return node.Promise.map(badTransactions, function (tx) {
				return getTransactionPromise(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should not be unconfirmed', function () {
			return node.Promise.map(goodTransactions, function (tx) {
				return getUnconfirmedTransactionPromise(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return node.Promise.map(goodTransactions, function (tx) {
				return getTransactionPromise(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transaction').to.have.property('id').equal(tx.id);
				});
			});
		});
	});
};
