'use strict';

var lisk = require('lisk-js');
var expect = require('chai').expect;

var test = require('../../../../test');
var shared = require('../../../shared');
var accountFixtures = require('../../../../fixtures/accounts');

var apiCodes = require('../../../../../helpers/apiCodes');

var swaggerEndpoint = require('../../../../common/swaggerSpec');
var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../../common/apiHelpers').waitForConfirmations;
var createSignatureObject = require('../../../../common/apiHelpers').createSignatureObject;

var signatureEndpoint = new swaggerEndpoint('POST /signatures');

var randomUtil = require('../../../../common/utils/random');

function beforeValidationPhase (scenarios) {
	var transactionsToWaitFor = [];

	before(function () {
		return test.Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}
			var transaction = lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, accountFixtures.genesis.password);
			transactionsToWaitFor.push(transaction.id);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
		}))
			.then(function () {
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function () {
				return test.Promise.all(Object.keys(scenarios).map(function (type) {
					var transaction = lisk.multisignature.createMultisignature(scenarios[type].account.password, null, scenarios[type].keysgroup, scenarios[type].lifetime, scenarios[type].min);
					scenarios[type].transaction = transaction;
					transactionsToWaitFor.push(transaction.id);

					return sendTransactionPromise(transaction).then(function (res) {
						expect(res).to.have.property('status').to.equal(200);
						expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					});
				}));
			})
			.then(function () {
				var signatures = [];
				Object.keys(scenarios).map(function (type) {
					scenarios[type].members.map(function (member) {
						signatures.push(createSignatureObject(scenarios[type].transaction, member));
					});
				});
				return signatureEndpoint.makeRequest({signatures: signatures}, 200).then(function (res) {
					res.body.meta.status.should.be.true;
					res.body.data.message.should.be.equal('Signature Accepted');
				});
			})
			.then(function () {
				return waitForConfirmations(transactionsToWaitFor);
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

	return sendTransactionPromise(transaction)
		.then(function (res) {
			expect(res).to.have.property('status').to.equal(200);
			expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
		})
		.then(function () {
			var signatures = [];

			scenario.members.map(function (member) {
				signatures.push(createSignatureObject(transaction, member));
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
