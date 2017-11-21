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

	console.log(scenarios);
	
	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];
	var pendingMultisignatures = [];

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
			return localShared.sendAndSignMultisigTransaction('transfer', scenarios.regular)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});

		it('max_mebers_max_min scenario should be ok', function () {
			return localShared.sendAndSignMultisigTransaction('transfer', scenarios.max_mebers_max_min)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
