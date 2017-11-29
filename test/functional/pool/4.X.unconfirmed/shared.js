'use strict';

var node = require('../../../node');
var shared = require('../../shared');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

var randomUtil = require('../../../common/utils/random');

function beforeValidationPhase (scenarios) {
	var transactionsToWaitFor = [];

	before(function () {
		return node.Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}

			var transaction = node.lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, node.gAccount.password);
			transactionsToWaitFor.push(transaction.id);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
		}))
			.then(function () {
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function () {
				return node.Promise.all(Object.keys(scenarios).map(function (type) {
					var transaction = node.lisk.multisignature.createMultisignature(scenarios[type].account.password, null, scenarios[type].keysgroup, scenarios[type].lifetime, scenarios[type].min);
					scenarios[type].transaction = transaction;
					transactionsToWaitFor.push(transaction.id);

					return sendTransactionPromise(transaction).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					});
				}));
			});
	});
};

function beforeValidationPhaseWithDapp (scenarios) {
	var transactionsToWaitFor = [];

	before(function () {
		return node.Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}

			var transaction = node.lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, node.gAccount.password);
			transactionsToWaitFor.push(transaction.id);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
		}))
			.then(function () {
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function () {
				return node.Promise.all(Object.keys(scenarios).map(function (type) {
					scenarios[type].dapp = randomUtil.application();
					var transaction = node.lisk.dapp.createDapp(scenarios[type].account.password, null, scenarios[type].dapp);
					scenarios[type].dapp.id = transaction.id;
					transactionsToWaitFor.push(transaction.id);

					return sendTransactionPromise(transaction).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					});
				}));
			})
			.then(function () {
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function () {
				return node.Promise.all(Object.keys(scenarios).map(function (type) {
					var transaction = node.lisk.multisignature.createMultisignature(scenarios[type].account.password, null, scenarios[type].keysgroup, scenarios[type].lifetime, scenarios[type].min);
					scenarios[type].transaction = transaction;
					transactionsToWaitFor.push(transaction.id);

					return sendTransactionPromise(transaction).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					});
				}));
			});
	});
};

module.exports = {
	beforeValidationPhase: beforeValidationPhase,
	beforeValidationPhaseWithDapp: beforeValidationPhaseWithDapp
};
