'use strict';

require('../../../functional.js');

var node = require('../../../../node');
var shared = require('../../../shared');
var localShared = require('./shared');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;

describe('POST /api/transactions (validate type 1 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = node.randomAccount();

	localShared.beforeValidationPhase(account);

	describe('registering second secret', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = node.lisk.signature.createSignature(account.password, node.randomPassword());

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase on an account with a second passphrase already enabled should pass but fail on confirmation', function () {
			transaction = node.lisk.signature.createSignature(account.password, node.randomPassword());
			var secondKeys = node.lisk.crypto.getKeys(account.secondPassword);
			node.lisk.crypto.secondSign(transaction, secondKeys);
			transaction.id = node.lisk.crypto.getId(transaction);

			return sendTransactionPromise(transaction).then(function (res) {

				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
