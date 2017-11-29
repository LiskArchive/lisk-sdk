'use strict';

var node = require('../../../node');
var shared = require('../../shared');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

var randomUtil = require('../../../common/utils/random');

function beforeUnconfirmedPhase (account) {
	before(function () {
		var transaction = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, node.gAccount.password);

		return sendTransactionPromise(transaction)
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');

				return waitForConfirmations([transaction.id]);
			})
			.then(function () {
				transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
	});
};

function beforeUnconfirmedPhaseWithDapp (account) {
	before(function () {
		var transaction = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, node.gAccount.password);

		return sendTransactionPromise(transaction)
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');

				return waitForConfirmations([transaction.id]);
			})
			.then(function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, randomUtil.guestbookDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.transactionId = transaction.id;

				return waitForConfirmations([transaction.id]);
			})
			.then(function (res) {
				transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
	});
};

module.exports = {
	beforeUnconfirmedPhase: beforeUnconfirmedPhase,
	beforeUnconfirmedPhaseWithDapp: beforeUnconfirmedPhaseWithDapp
};
