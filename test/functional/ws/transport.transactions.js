'use strict';

require('../functional.js');

var node = require('../../node');
var shared = require('../shared');
var ws = require('../../common/ws/communication');

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transactions: [transaction]
	}, done, true);
}

describe('Posting transaction (type 0)', function () {

	var transaction;
	var goodTransactions = [];
	var badTransactions = [];
	var account = node.randomAccount();

	beforeEach(function () {
		transaction = node.randomTransaction();
	});

	describe('transaction processing', function () {

		it('when sender has no funds should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			postTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
				done();
			});
		});

		it('when sender has funds should be ok', function (done) {
			postTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
				done();
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
