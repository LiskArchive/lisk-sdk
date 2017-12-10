'use strict';

var test = require('../functional.js');

var expect = require('chai').expect;
var Promise = require('bluebird');

var apiHelpers = require('../../common/helpers/api');
var waitFor = require('../../common/utils/waitFor');

function confirmation (goodTransactions, badTransactions, pendingMultisignatures) {

	describe('after transactions get confirmed', function () {

		before(function () {
			return waitFor.confirmations(test._.map(goodTransactions, 'id'));
		});

		it('bad transactions should not be confirmed', function () {
			return Promise.map(badTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return apiHelpers.getTransactionsPromise(params).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});
		});

		// TODO: After migration /transactions/unconfirmed make sure this phase works
		it.skip('good transactions should not be unconfirmed', function () {
			return Promise.map(goodTransactions, function (transaction) {
				return apiHelpers.getUnconfirmedTransactionPromise(transaction.id).then(function (res) {
					expect(res).to.have.property('success').to.be.not.ok;
					expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return Promise.map(goodTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return apiHelpers.getTransactionsPromise(params).then(function (res) {
					res.body.data.should.have.length(1);
				});
			});
		});

		if (pendingMultisignatures) {
			it('pendingMultisignatures should remain in the pending queue', function () {
				return Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'publicKey=' + transaction.senderPublicKey
					];

					return apiHelpers.getPendingMultisignaturesPromise(params).then(function (res) {
						expect(res).to.have.property('success').to.be.ok;
						expect(res).to.have.property('transactions').to.be.an('array').to.have.lengthOf(1);
						expect(res.transactions[0]).to.have.property('transaction').to.have.property('id').to.equal(transaction.id);
					});
				});
			});

			it('pendingMultisignatures should not be confirmed', function () {
				return Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'id=' + transaction.id
					];
					return apiHelpers.getTransactionsPromise(params).then(function (res) {
						res.body.data.should.have.length(0);
					});
				});
			});
		};
	});
};

module.exports = {
	confirmation: confirmation
};
