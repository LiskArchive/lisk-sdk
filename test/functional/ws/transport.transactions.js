'use strict';

var test = require('../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../common/phases');

var ws = require('../../common/ws/communication');
var randomUtil = require('../../common/utils/random');
var ws = require('../../common/ws/communication');
var apiHelpers = require('../../common/helpers/api');

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transactions: [transaction]
	}, done, true);
}

describe('Posting transaction (type 0)', function () {

	var transaction;
	var goodTransactions = [];
	var badTransactions = [];
	var account = randomUtil.account();

	beforeEach(function () {
		transaction = randomUtil.transaction();
		transaction = apiHelpers.normalizeTransactionObject(transaction);
	});

	describe('transaction processing', function () {

		it('when sender has no funds should fail', function (done) {
			var transaction = lisk.transaction.createTransaction('1L', 1, account.password);
			transaction = apiHelpers.normalizeTransactionObject(transaction);

			postTransaction(transaction, function (err, res) {
				expect(res).to.have.property('success').to.be.not.ok;
				expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
				done();
			});
		});

		it('when sender has funds should be ok', function (done) {
			postTransaction(transaction, function (err, res) {
				expect(res).to.have.property('success').to.be.ok;
				expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
				done();
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
