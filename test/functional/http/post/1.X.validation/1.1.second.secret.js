'use strict';

var test = require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../../common/phases');
var localCommon = require('./common');
var accountFixtures = require('../../../../fixtures/accounts');

var apiHelpers = require('../../../../common/helpers/api');
var randomUtil = require('../../../../common/utils/random');
var errorCodes = require('../../../../../helpers/apiCodes');

describe('POST /api/transactions (validate type 1 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localCommon.beforeValidationPhase(account);

	describe('registering second secret', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.signature.createSignature(account.password, randomUtil.password());

			return apiHelpers.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase on an account with a second passphrase already enabled should pass but fail on confirmation', function () {
			transaction = lisk.signature.createSignature(account.password, randomUtil.password());
			var secondKeys = lisk.crypto.getKeys(account.secondPassword);
			lisk.crypto.secondSign(transaction, secondKeys);
			transaction.id = lisk.crypto.getId(transaction);

			return apiHelpers.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
