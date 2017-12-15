'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var _ = test._;
var common = require('./common');
var phases = require('../../common/phases');
var Scenarios = require('../../common/scenarios');
var accountFixtures = require('../../../fixtures/accounts');

var apiCodes = require('../../../../helpers/apiCodes');
var constants = require('../../../../helpers/constants');

var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/waitFor');
var swaggerEndpoint = require('../../../common/swaggerSpec');
var apiHelpers = require('../../../common/helpers/api');
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var errorCodes = require('../../../../helpers/apiCodes');

describe('POST /api/transactions (type 4) register multisignature', function () {

	var scenarios = {
		no_funds: new Scenarios.Multisig({
			amount: 0
		}),
		minimal_funds: new Scenarios.Multisig({
			amount: constants.fees.multisignature * 3
		}),
		max_members: new Scenarios.Multisig({
			members: constants.multisigConstraints.keysgroup.maxItems + 1,
			min: 2
		}),
		max_members_max_min: new Scenarios.Multisig({
			members: constants.multisigConstraints.keysgroup.maxItems + 1,
			min: constants.multisigConstraints.min.maximum
		}),
		more_than_max_members: new Scenarios.Multisig({
			members: constants.multisigConstraints.keysgroup.maxItems + 2
		}),
		unsigned: new Scenarios.Multisig(),
		regular: new Scenarios.Multisig(),
		regular_with_second_signature: new Scenarios.Multisig(),
	};

	var transaction, signature;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];
	var pendingMultisignatures = [];
	var signatureEndpoint = new swaggerEndpoint('POST /signatures');

	before(function () {
		var transactions = [];

		Object.keys(scenarios).map(function (type) {
			if (type !== 'no_funds') {
				transactions.push(scenarios[type].creditTransaction);
			}
		});

		return apiHelpers.sendTransactionsPromise(transactions).then(function (res) {
			res.body.data.message.should.be.equal('Transaction(s) accepted');
			transactionsToWaitFor = transactionsToWaitFor.concat(_.map(transactions, 'id'));

			return waitFor.confirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', function () {

		common.invalidAssets('multisignature', badTransactions);

		describe('keysgroup', function () {

			it('using empty array should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate multisignature schema: Array is too short (0), minimum ' + constants.multisigConstraints.keysgroup.minItems);
					badTransactions.push(transaction);
				});
			});

			it('using empty member should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + accountFixtures.existingDelegate.publicKey, '+' + scenarios.no_funds.account.publicKey, '+' + scenarios.minimal_funds.account.publicKey, null], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid member in keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('including sender should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + accountFixtures.existingDelegate.publicKey, '+' + scenarios.regular.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid multisignature keysgroup. Can not contain sender');
					badTransactions.push(transaction);
				});
			});

			it('using same member twice should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + accountFixtures.existingDelegate.publicKey, '+' + accountFixtures.existingDelegate.publicKey], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Encountered duplicate public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using invalid publicKey should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+L' + accountFixtures.existingDelegate.publicKey.slice(0, -1), '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using no math operator (just publicKey) should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [accountFixtures.existingDelegate.publicKey, scenarios.no_funds.account.publicKey, scenarios.minimal_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid math operator in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using just math operator should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+', '+'], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using invalid math operator should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['-' + accountFixtures.existingDelegate.publicKey, '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid math operator in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using duplicated correct operator should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['++' + accountFixtures.existingDelegate.publicKey, '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using more_than_max_members scenario(' + (constants.multisigConstraints.keysgroup.maxItems + 2) + ',2) should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.more_than_max_members.account.password, null, scenarios.more_than_max_members.keysgroup, 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate multisignature schema: Array is too long (' + (constants.multisigConstraints.keysgroup.maxItems + 1) + '), maximum ' + constants.multisigConstraints.keysgroup.maxItems);
					badTransactions.push(transaction);
				});
			});
		});

		describe('min', function () {

			it('using bigger than keysgroup size plus 1 should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [accountFixtures.existingDelegate.publicKey], 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid multisignature min. Must be less than or equal to keysgroup size');
					badTransactions.push(transaction);
				});
			});

			it('using min greater than maximum(' + constants.multisigConstraints.min.maximum + ') should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.max_members_max_min.account.password, null, scenarios.max_members_max_min.keysgroup, 1, constants.multisigConstraints.min.maximum + 1);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.min.maximum + 1) + ' is greater than maximum ' + constants.multisigConstraints.min.maximum);
					badTransactions.push(transaction);
				});
			});

			it('using min less than minimum(' + constants.multisigConstraints.min.minimum + ') should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.max_members.account.password, null, scenarios.max_members.keysgroup, 1, constants.multisigConstraints.min.minimum - 1);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.min.minimum - 1) + ' is less than minimum ' + constants.multisigConstraints.min.minimum);
					badTransactions.push(transaction);
				});
			});
		});

		describe('lifetime', function () {

			it('using greater than maximum(' + constants.multisigConstraints.lifetime.maximum + ') should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, constants.multisigConstraints.lifetime.maximum + 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.lifetime.maximum + 1) + ' is greater than maximum ' + constants.multisigConstraints.lifetime.maximum);
					badTransactions.push(transaction);
				});
			});

			it('using less than minimum(' + constants.multisigConstraints.lifetime.minimum + ') should fail', function () {
				transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, constants.multisigConstraints.lifetime.minimum - 1, 2);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.lifetime.minimum - 1) + ' is less than minimum ' + constants.multisigConstraints.lifetime.minimum);
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', function () {

		it('with no_funds scenario should fail', function () {
			var scenario = scenarios.no_funds;

			return sendTransactionPromise(scenario.multiSigTransaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Account does not have enough LSK: ' + scenarios.no_funds.account.address + ' balance: 0');
				badTransactions.push(scenario.multiSigTransaction);
			});
		});

		it('with minimal_funds scenario should be ok', function () {
			var scenario = scenarios.minimal_funds;

			return sendTransactionPromise(scenario.multiSigTransaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
			});
		});

		it('using valid params regular scenario should be ok', function () {
			var scenario = scenarios.regular;

			return sendTransactionPromise(scenario.multiSigTransaction)
				.then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					var signatures = _.map(scenario.members, function (member) {
						return apiHelpers.createSignatureObject(scenario.multiSigTransaction, member);
					});

					return signatureEndpoint.makeRequest({signatures: signatures}, 200).then(function (res) {
						res.body.meta.status.should.be.true;
						res.body.data.message.should.be.equal('Signature Accepted');

						goodTransactions.push(scenario.multiSigTransaction);
					});
				});
		});

		it('using valid params regular_with_second_signature scenario should be ok', function () {
			var scenario = scenarios.regular_with_second_signature;
			var multiSigSecondPasswordTransaction = lisk.multisignature.createMultisignature(scenario.account.password, scenario.account.secondPassword, scenario.keysgroup, 1, 2);

			return sendTransactionPromise(scenario.secondSignatureTransaction)
				.then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					return waitFor.confirmations([scenario.secondSignatureTransaction.id]);
				})
				.then(function () {
					return sendTransactionPromise(multiSigSecondPasswordTransaction);
				})
				.then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					var signatures = _.map(scenario.members, function (member) {
						return apiHelpers.createSignatureObject(multiSigSecondPasswordTransaction, member);
					});

					return signatureEndpoint.makeRequest({signatures: signatures}, 200).then(function (res) {
						res.body.meta.status.should.be.true;
						res.body.data.message.should.be.equal('Signature Accepted');

						goodTransactions.push(multiSigSecondPasswordTransaction);
					});
				});
		});

		it('using valid params unsigned scenario should be ok and remain in pending queue', function () {
			var scenario = scenarios.unsigned;

			return sendTransactionPromise(scenario.multiSigTransaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');

				pendingMultisignatures.push(scenario.multiSigTransaction);
			});
		});

		it('using valid params max_members scenario should be ok', function () {
			var scenario = scenarios.max_members;

			return sendTransactionPromise(scenario.multiSigTransaction)
				.then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					var signatures = _.map(scenario.members, function (member) {
						return apiHelpers.createSignatureObject(scenario.multiSigTransaction, member);
					});

					return signatureEndpoint.makeRequest({signatures: signatures}, 200).then(function (res) {
						res.body.meta.status.should.be.true;
						res.body.data.message.should.be.equal('Signature Accepted');

						goodTransactions.push(scenario.multiSigTransaction);
					});
				});
		});

		it('using valid params max_members_max_min scenario should be ok', function () {
			var scenario = scenarios.max_members_max_min;

			return sendTransactionPromise(scenario.multiSigTransaction)
				.then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					var signatures = _.map(scenario.members, function (member) {
						return apiHelpers.createSignatureObject(scenario.multiSigTransaction, member);
					});

					return signatureEndpoint.makeRequest({signatures: signatures}, 200).then(function (res) {
						res.body.meta.status.should.be.true;
						res.body.data.message.should.be.equal('Signature Accepted');

						goodTransactions.push(scenario.multiSigTransaction);
					});
				});
		});

		describe('signing transactions', function () {

			it('twice with the same account should fail', function () {
				var scenario = scenarios.unsigned;
				var signature = apiHelpers.createSignatureObject(scenario.multiSigTransaction, scenario.members[0]);

				return signatureEndpoint.makeRequest({signatures: [signature]}, 200).then(function (res) {
					res.body.meta.status.should.be.true;
					res.body.data.message.should.be.equal('Signature Accepted');

					return signatureEndpoint.makeRequest({signatures: [signature]}, apiCodes.PROCESSING_ERROR);
				}).then(function (res) {
					expect(res).to.have.nested.property('body.message').to.equal('Error processing signature: Permission to sign transaction denied');
				});
			});

			it('with not requested account should fail', function () {
				var signature = apiHelpers.createSignatureObject(scenarios.unsigned.multiSigTransaction, randomUtil.account());

				return signatureEndpoint.makeRequest({signatures: [signature]}, apiCodes.PROCESSING_ERROR).then(function (res) {
					expect(res).to.have.nested.property('body.message').to.equal('Error processing signature: Failed to verify signature');
				});
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
