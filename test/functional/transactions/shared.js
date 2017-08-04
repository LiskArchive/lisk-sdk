'use strict';

var Promise = require('bluebird');

var node = require('../../node');

var getTransaction = require('../../common/complexTransactions').getTransaction;
var getUnconfirmedTransaction = require('../../common/complexTransactions').getUnconfirmedTransaction;

var getTransactionPromise = Promise.promisify(getTransaction);
var getUnconfirmedTransactionPromise = Promise.promisify(getUnconfirmedTransaction);

exports.confirmationPhase = function (goodTransactions, badTransactions){

	describe('before new block', function () {

		it('good transactions should remain UNconfirmed', function () {
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
};
