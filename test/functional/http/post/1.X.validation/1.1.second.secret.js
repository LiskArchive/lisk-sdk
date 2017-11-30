'use strict';

var test = require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var shared = require('../../../shared');
var localShared = require('./shared');
var accountFixtures = require('../../../../fixtures/accounts');

var apiHelpers = require('../../../../common/apiHelpers');
var randomUtil = require('../../../../common/utils/random');

describe('POST /api/transactions (validate type 1 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localShared.beforeValidationPhase(account);

	describe('registering second secret', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.signature.createSignature(account.password, randomUtil.password());

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase on an account with a second passphrase already enabled should pass but fail on confirmation', function () {
			transaction = lisk.signature.createSignature(account.password, randomUtil.password());
			var secondKeys = lisk.crypto.getKeys(account.secondPassword);
			lisk.crypto.secondSign(transaction, secondKeys);
			transaction.id = lisk.crypto.getId(transaction);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
