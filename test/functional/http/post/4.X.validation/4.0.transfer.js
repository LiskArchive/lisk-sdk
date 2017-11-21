'use strict';

var node = require('../../../../node');
var shared = require('../../../shared');
var localShared = require('./shared');
var apiCodes = require('../../../../../helpers/apiCodes');
var constants = require('../../../../../helpers/constants');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var sendSignaturePromise = require('../../../../common/apiHelpers').sendSignaturePromise;

describe('POST /api/transactions (type 0 on top of type 4)', function () {

	var scenarios = {
		'without_signatures': new shared.MultisigScenario(
			{
				'members': 4
			}
		),
		'minimum_not_reached': new shared.MultisigScenario(
			{
				'members': 4
			}
		),
		'max_mebers_max_min': new shared.MultisigScenario(
			{
				'members': constants.multisigConstraints.keysgroup.maxItems + 1,
				'min': constants.multisigConstraints.min.maximum
			}
		),
		'regular': new shared.MultisigScenario(),
	};
	
	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];
	var pendingMultisignatures = [];

	var account = node.randomAccount();

	localShared.beforeValidationPhase(scenarios);

	describe('sending funds', function () {

		it('without_signatures scenario should be ok and never confirmed', function () {
			transaction = node.lisk.transaction.createTransaction(node.randomAccount().address, 1, scenarios.without_signatures.account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				pendingMultisignatures.push(transaction);
			});
		});

		it('minimum_not_reached scenario should be ok and never confirmed without minimum required signatures', function () {
			transaction = node.lisk.transaction.createTransaction(node.randomAccount().address, 1, scenarios.minimum_not_reached.account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				scenarios.minimum_not_reached.transaction = transaction;
				pendingMultisignatures.push(transaction);
			})
				.then(function () {
					signature = node.lisk.multisignature.signTransaction(scenarios.minimum_not_reached.transaction, scenarios.minimum_not_reached.members[0].password);

					return sendSignaturePromise(signature, scenarios.minimum_not_reached.transaction).then(function (res) {
						node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
						node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
					});
				});
		});

		it('regular scenario should be ok', function () {
			transaction = node.lisk.transaction.createTransaction(node.randomAccount().address, 1, scenarios.regular.account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				scenarios.regular.transaction = transaction;
			})
				.then(function () {
					return node.Promise.all(node.Promise.map(scenarios.regular.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					}))
						.then(function () {
							goodTransactions.push(scenarios.regular.transaction);
						});
				});
		});

		it('max_mebers_max_min scenario should be ok', function () {
			transaction = node.lisk.transaction.createTransaction(node.randomAccount().address, 1, scenarios.max_mebers_max_min.account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				scenarios.max_mebers_max_min.transaction = transaction;
			})
				.then(function () {
					return node.Promise.all(node.Promise.map(scenarios.max_mebers_max_min.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.max_mebers_max_min.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.max_mebers_max_min.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					}))
						.then(function () {
							goodTransactions.push(scenarios.max_mebers_max_min.transaction);
						});
				});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
