'use strict';

var node = require('../../../../node');
var shared = require('../../../shared');

var swaggerEndpoint = require('../../../../common/swaggerSpec');
var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../../common/apiHelpers').waitForConfirmations;
var createSignatureObject = require('../../../../common/apiHelpers').createSignatureObject;

var signatureEndpoint = new swaggerEndpoint('POST /signatures');

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
			transaction = node.lisk.transaction.createTransaction(node.randomAccount().address, 1, scenario.account.password);
			break;
		case 'signature':
			transaction = node.lisk.signature.createSignature(scenario.account.password, scenario.account.secondPassword);
			break;
		case 'delegate':
			transaction = node.lisk.delegate.createDelegate(scenario.account.password, scenario.account.username);
			break;
		case 'votes':
			transaction = node.lisk.vote.createVote(scenario.account.password, ['+' + node.eAccount.publicKey]);
			break;
		case 'dapp':
			transaction = node.lisk.dapp.createDapp(scenario.account.password, null, node.guestbookDapp);
			node.guestbookDapp.id = transaction.id;
			break;
		case 'inTransfer':
			transaction = node.lisk.transfer.createInTransfer(node.guestbookDapp.id, 1, scenario.account.password);
			break;
		case 'outTransfer':
			transaction = node.lisk.transfer.createOutTransfer(node.guestbookDapp.id, node.randomTransaction().id, node.randomAccount().address, 1, scenario.account.password);
			break;
	};

	return sendTransactionPromise(transaction)
		.then(function (res) {
			node.expect(res).to.have.property('status').to.equal(200);
			node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
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
