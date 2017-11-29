'use strict';

require('../../functional.js');

var node = require('../../../node');
var shared = require('../../shared');
var localShared = require('./shared');
var accountFixtures = require('../../../fixtures/accounts');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var randomUtil = require('../../../common/utils/random');

describe('POST /api/transactions (unconfirmed type 3 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localShared.beforeUnconfirmedPhase(account);

	describe('voting delegate', function () {

		it('using second signature with an account that has a pending second passphrase registration should fail', function () {
			transaction = node.lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey], account.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
				badTransactions.push(transaction);
			});
		});

		it('using no second signature with an account that has a pending second passphrase registration should be ok', function () {
			transaction = node.lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				// TODO: Enable when transaction pool order is fixed
				// goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
