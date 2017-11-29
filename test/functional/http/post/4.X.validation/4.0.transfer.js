'use strict';

require('../../../functional.js');

var node = require('../../../../node');
var shared = require('../../../shared');
var localShared = require('./shared');
var constants = require('../../../../../helpers/constants');
var swaggerEndpoint = require('../../../../common/swaggerSpec');
var apiHelpers = require('../../../../common/apiHelpers');

var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var createSignatureObject = apiHelpers.createSignatureObject;

var signatureEndpoint = new swaggerEndpoint('POST /signatures');

describe('POST /api/transactions (validate type 0 on top of type 4)', function () {

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
		'max_members_max_min': new shared.MultisigScenario(
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
					signature = createSignatureObject(scenarios.minimum_not_reached.transaction, scenarios.minimum_not_reached.members[0]);

					return signatureEndpoint.makeRequest({signatures: [signature]}, 200).then(function (res) {
						res.body.meta.status.should.be.true;
						res.body.data.message.should.be.equal('Signature Accepted');
					});
				});
		});

		it('regular scenario should be ok', function () {
			return localShared.sendAndSignMultisigTransaction('transfer', scenarios.regular)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});

		it('max_members_max_min scenario should be ok', function () {
			return localShared.sendAndSignMultisigTransaction('transfer', scenarios.max_members_max_min)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
