'use strict';

var node = require('../../../../node');
var shared = require('../../../shared');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../../common/apiHelpers').waitForConfirmations;

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
				transaction = node.lisk.signature.createSignature(account.password, account.secondPassword, 1);

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
				transaction = node.lisk.dapp.createDapp(account.password, null, node.guestbookDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

				node.guestbookDapp.transactionId = transaction.id;

				return waitForConfirmations([transaction.id]);
			})
			.then(function (res) {
				transaction = node.lisk.signature.createSignature(account.password, account.secondPassword, 1);

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
