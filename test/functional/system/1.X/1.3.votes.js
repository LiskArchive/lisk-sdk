'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../common/phases');
var localCommon = require('./common');
var accountFixtures = require('../../../fixtures/accounts');

var sendTransactionPromise = require('../../../common/helpers/api').sendTransactionPromise;
var randomUtil = require('../../../common/utils/random');
var errorCodes = require('../../../../helpers/apiCodes');

describe('POST /api/transactions (unconfirmed type 3 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localCommon.beforeUnconfirmedPhase(account);

	describe('voting delegate', function () {

		it('using second signature with an account that has a pending second passphrase registration should fail', function () {
			transaction = lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey], account.secondPassword);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
				badTransactions.push(transaction);
			});
		});

		it('using no second signature with an account that has a pending second passphrase registration should be ok', function () {
			transaction = lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {

				res.body.data.message.should.be.equal('Transaction(s) accepted');
				// TODO: Enable when transaction pool order is fixed
				// goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
