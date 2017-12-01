'use strict';

var test = require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;
var Promise = require('bluebird');

var accountFixtures = require('../../../../fixtures/accounts');

var apiCodes = require('../../../../../helpers/apiCodes');

var apiHelpers = require('../../../../common/helpers/api');
var randomUtil = require('../../../../common/utils/random');
var waitFor = require('../../../../common/utils/waitFor');
var swaggerEndpoint = require('../../../../common/swaggerSpec');
var signatureEndpoint = new swaggerEndpoint('POST /signatures');

function beforeValidationPhase (scenarios) {
	var transactionsToWaitFor = [];

	before(function () {
		return Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}
			var transaction = lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, accountFixtures.genesis.password);
			transactionsToWaitFor.push(transaction.id);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
		}))
			.then(function () {
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(function () {
				return Promise.all(Object.keys(scenarios).map(function (type) {
					var transaction = lisk.multisignature.createMultisignature(scenarios[type].account.password, null, scenarios[type].keysgroup, scenarios[type].lifetime, scenarios[type].min);
					scenarios[type].transaction = transaction;
					transactionsToWaitFor.push(transaction.id);

					return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
						expect(res).to.have.property('status').to.equal(200);
						expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					});
				}));
			})
			.then(function () {
				var signatures = [];
				Object.keys(scenarios).map(function (type) {
					scenarios[type].members.map(function (member) {
						signatures.push(apiHelpers.createSignatureObject(scenarios[type].transaction, member));
					});
				});
				return signatureEndpoint.makeRequest({signatures: signatures}, 200).then(function (res) {
					res.body.meta.status.should.be.true;
					res.body.data.message.should.be.equal('Signature Accepted');
				});
			})
			.then(function () {
				return waitFor.confirmations(transactionsToWaitFor);
			});
	});
};

function sendAndSignMultisigTransaction (type, scenario) {
	var transaction;

	switch (type) {
		case 'transfer':
			transaction = lisk.transaction.createTransaction(randomUtil.account().address, 1, scenario.account.password);
			break;
		case 'signature':
			transaction = lisk.signature.createSignature(scenario.account.password, scenario.account.secondPassword);
			break;
		case 'delegate':
			transaction = lisk.delegate.createDelegate(scenario.account.password, scenario.account.username);
			break;
		case 'votes':
			transaction = lisk.vote.createVote(scenario.account.password, ['+' + accountFixtures.existingDelegate.publicKey]);
			break;
		case 'dapp':
			transaction = lisk.dapp.createDapp(scenario.account.password, null, randomUtil.guestbookDapp);
			randomUtil.guestbookDapp.id = transaction.id;
			break;
		case 'inTransfer':
			transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, 1, scenario.account.password);
			break;
		case 'outTransfer':
			transaction = lisk.transfer.createOutTransfer(randomUtil.guestbookDapp.id, randomUtil.transaction().id, randomUtil.account().address, 1, scenario.account.password);
			break;
	};

	return apiHelpers.sendTransactionPromise(transaction)
		.then(function (res) {
			expect(res).to.have.property('status').to.equal(200);
			expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
		})
		.then(function () {
			var signatures = [];

			scenario.members.map(function (member) {
				signatures.push(apiHelpers.createSignatureObject(transaction, member));
			});

			return signatureEndpoint.makeRequest({signatures: signatures}, 200).then(function (res) {
				res.body.meta.status.should.be.true;
				res.body.data.message.should.be.equal('Signature Accepted');
			});
		})
		.then(function () {
			return transaction;
		});
}

module.exports = {
	beforeValidationPhase: beforeValidationPhase,
	sendAndSignMultisigTransaction: sendAndSignMultisigTransaction
};
