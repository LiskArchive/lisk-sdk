'use strict';

var node = require('../../../../node');
var shared = require('../../../shared');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../../common/apiHelpers').waitForConfirmations;
var apiCodes = require('../../../../../helpers/apiCodes');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var sendSignaturePromise = require('../../../../common/apiHelpers').sendSignaturePromise;

function beforeValidationPhase (scenarios) {

	var transactionsToWaitFor = [];

	before(function () {
		//Crediting accounts
		return node.Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}
			var transaction = node.lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				transactionsToWaitFor.push(transaction.id);
			});
		}))
			.then(function () {
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function () {
				return node.Promise.all(Object.keys(scenarios).map(function (type) {
					var transaction = node.lisk.multisignature.createMultisignature(scenarios[type].account.password, null, scenarios[type].keysgroup, scenarios[type].lifetime, scenarios[type].min);

					return sendTransactionPromise(transaction).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
						scenarios[type].transaction = transaction;
						transactionsToWaitFor.push(transaction.id);
					});
				}));
			})
			.then(function () {
				return node.Promise.all(Object.keys(scenarios).map(function (type) {
					return node.Promise.all(node.Promise.map(scenarios[type].members, function (member) {
						var signature = node.lisk.multisignature.signTransaction(scenarios[type].transaction, member.password);

						return sendSignaturePromise(signature, scenarios[type].transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					}));
				}));
			})
			.then(function () {
				return waitForConfirmations(transactionsToWaitFor);
			});
	});
};

module.exports = {
	beforeValidationPhase: beforeValidationPhase
};
