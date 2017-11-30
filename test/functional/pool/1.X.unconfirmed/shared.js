'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var shared = require('../../shared');
var accountFixtures = require('../../../fixtures/accounts');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');

function beforeUnconfirmedPhase (account) {
	before(function () {
		var transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);

		return sendTransactionPromise(transaction)
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');

				return waitForConfirmations([transaction.id]);
			})
			.then(function () {
				transaction = lisk.signature.createSignature(account.password, account.secondPassword);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
	});
};

function beforeUnconfirmedPhaseWithDapp (account) {
	before(function () {
		var transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);

		return sendTransactionPromise(transaction)
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');

				return waitForConfirmations([transaction.id]);
			})
			.then(function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.guestbookDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.transactionId = transaction.id;

				return waitForConfirmations([transaction.id]);
			})
			.then(function (res) {
				transaction = lisk.signature.createSignature(account.password, account.secondPassword);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
	});
};

module.exports = {
	beforeUnconfirmedPhase: beforeUnconfirmedPhase,
	beforeUnconfirmedPhaseWithDapp: beforeUnconfirmedPhaseWithDapp
};
