'use strict';

require('../../functional.js');

var node = require('../../../node');
var shared = require('../../shared');
var localShared = require('./shared');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;

describe('POST /api/transactions (unconfirmed type 4 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];
	var pendingMultisignatures = [];

	var account = node.randomAccount();

	localShared.beforeUnconfirmedPhase(account);

	describe('creating multisig', function () {

		it('using second signature with an account that has a pending second passphrase registration should fail', function () {
			transaction = node.lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + node.eAccount.publicKey], 1, 1);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
				badTransactions.push(transaction);
			});
		});

		it('using no second signature with an account that has a pending second passphrase registration should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['+' + node.eAccount.publicKey], 1, 1);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				pendingMultisignatures.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
