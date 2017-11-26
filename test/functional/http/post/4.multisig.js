'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var apiCodes = require('../../../../helpers/apiCodes');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var sendSignaturePromise = require('../../../common/apiHelpers').sendSignaturePromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('POST /api/transactions (type 4) register multisignature', function () {

	var scenarios = {
		'no_funds': new shared.MultisigScenario(
			{ 
				'amount' : 0 
			}
		),
		'minimal_funds': new shared.MultisigScenario(
			{ 
				'amount': constants.fees.multisignature * 3 
			}
		),
		'max_members': new shared.MultisigScenario(
			{
				'members' : constants.multisigConstraints.keysgroup.maxItems + 1,
				'min' : 2
			}
		),
		'max_members_max_min': new shared.MultisigScenario(
			{
				'members': constants.multisigConstraints.keysgroup.maxItems + 1,
				'min': constants.multisigConstraints.min.maximum
			}
		),
		'more_than_max_members': new shared.MultisigScenario(
			{
				'members': constants.multisigConstraints.keysgroup.maxItems + 2
			}
		),
		'unsigned': new shared.MultisigScenario(),
		'regular': new shared.MultisigScenario(),
		'regular_with_second_signature': new shared.MultisigScenario(),
	};

	var transaction, signature;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];
	var pendingMultisignatures = [];

	before(function () {
		return node.Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}

			var transaction = node.lisk.transaction.createTransaction(scenarios[type].account.address, scenarios[type].amount, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				transactionsToWaitFor.push(transaction.id);
			});
		})).then(function () {
			return waitForConfirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', function () {

		shared.invalidAssets('multisignature', badTransactions);

		describe('keysgroup', function () {

			it('using empty array should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Array is too short (0), minimum ' + constants.multisigConstraints.keysgroup.minItems);
					badTransactions.push(transaction);
				});
			});

			it('using empty member should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + node.eAccount.publicKey, '+' + scenarios.no_funds.account.publicKey, '+' + scenarios.minimal_funds.account.publicKey, null], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid member in keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('including sender should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + node.eAccount.publicKey, '+' + scenarios.regular.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid multisignature keysgroup. Can not contain sender');
					badTransactions.push(transaction);
				});
			});

			it('using same member twice should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + node.eAccount.publicKey, '+' + node.eAccount.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Encountered duplicate public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using invalid publicKey should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+L' + node.eAccount.publicKey.slice(0, -1), '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using no math operator (just publicKey) should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [node.eAccount.publicKey, scenarios.no_funds.account.publicKey, scenarios.minimal_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid math operator in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using just math operator should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+', '+'], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using invalid math operator should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['-' + node.eAccount.publicKey, '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid math operator in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using duplicated correct operator should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['++' + node.eAccount.publicKey, '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using more_than_max_members scenario(' + (constants.multisigConstraints.keysgroup.maxItems + 2) + ',2) should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.more_than_max_members.account.password, null, scenarios.more_than_max_members.keysgroup, 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Array is too long (' + (constants.multisigConstraints.keysgroup.maxItems + 1) + '), maximum ' + constants.multisigConstraints.keysgroup.maxItems);
					badTransactions.push(transaction);
				});
			});	
		});

		describe('min', function () {

			it('using bigger than keysgroup size plus 1 should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [node.eAccount.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid multisignature min. Must be less than or equal to keysgroup size');
					badTransactions.push(transaction);
				});
			});

			it('using min greater than maximum(' + constants.multisigConstraints.min.maximum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.max_members_max_min.account.password, null, scenarios.max_members_max_min.keysgroup, 1, constants.multisigConstraints.min.maximum + 1);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.min.maximum + 1) + ' is greater than maximum ' + constants.multisigConstraints.min.maximum);
					badTransactions.push(transaction);
				});
			});

			it('using min less than minimum(' + constants.multisigConstraints.min.minimum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.max_members.account.password, null, scenarios.max_members.keysgroup, 1, constants.multisigConstraints.min.minimum - 1);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.min.minimum - 1) + ' is less than minimum ' + constants.multisigConstraints.min.minimum);
					badTransactions.push(transaction);
				});
			});
		});

		describe('lifetime', function () {

			it('using greater than maximum(' + constants.multisigConstraints.lifetime.maximum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, constants.multisigConstraints.lifetime.maximum + 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.lifetime.maximum + 1) + ' is greater than maximum ' + constants.multisigConstraints.lifetime.maximum);
					badTransactions.push(transaction);
				});
			});

			it('using less than minimum(' + constants.multisigConstraints.lifetime.minimum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, constants.multisigConstraints.lifetime.minimum - 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.lifetime.minimum - 1) + ' is less than minimum ' + constants.multisigConstraints.lifetime.minimum);
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', function () {

		it('with no_funds scenario should fail', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.no_funds.account.password, null, scenarios.no_funds.keysgroup, scenarios.no_funds.lifetime, scenarios.no_funds.min);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Account does not have enough LSK: ' + scenarios.no_funds.account.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal_funds scenario should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.minimal_funds.account.password, null, scenarios.minimal_funds.keysgroup, scenarios.minimal_funds.lifetime, scenarios.minimal_funds.min);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				scenarios.minimal_funds.transaction = transaction;
			});
		});

		it('using valid params regular scenario should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, scenarios.regular.lifetime, scenarios.regular.min);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					
					scenarios.regular.transaction = transaction;

					return node.Promise.map(scenarios.regular.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					});
				})
				.then(function () {
					goodTransactions.push(scenarios.regular.transaction);
				});
		});

		it('using valid params regular_with_second_signature scenario should be ok', function () {
			transaction = node.lisk.signature.createSignature(scenarios.regular_with_second_signature.account.password, scenarios.regular_with_second_signature.account.secondPassword);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					
					return waitForConfirmations([transaction.id]);
				})
				.then(function () {				
					transaction = node.lisk.multisignature.createMultisignature(scenarios.regular_with_second_signature.account.password, scenarios.regular_with_second_signature.account.secondPassword, scenarios.regular_with_second_signature.keysgroup, 1, 2);

					return sendTransactionPromise(transaction);
				})	
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					
					scenarios.regular_with_second_signature.transaction = transaction;

					return node.Promise.all(node.Promise.map(scenarios.regular_with_second_signature.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.regular_with_second_signature.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.regular_with_second_signature.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					}));
				})
				.then(function () {
					goodTransactions.push(scenarios.regular_with_second_signature.transaction);
				});
		});

		it('using valid params unsigned scenario should be ok and remain in pending queue', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.unsigned.account.password, null, scenarios.unsigned.keysgroup, scenarios.unsigned.lifetime, scenarios.unsigned.min);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				
				scenarios.unsigned.transaction = transaction;
				pendingMultisignatures.push(scenarios.unsigned.transaction);
			});
		});

		it('using valid params max_members scenario should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.max_members.account.password, null, scenarios.max_members.keysgroup, scenarios.max_members.lifetime, scenarios.max_members.min);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

					scenarios.max_members.transaction = transaction;

					return node.Promise.map(scenarios.max_members.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.max_members.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.max_members.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					});
				})
				.then(function () {
					goodTransactions.push(scenarios.max_members.transaction);
				});
		});

		it('using valid params max_members_max_min scenario should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.max_members_max_min.account.password, null, scenarios.max_members_max_min.keysgroup, scenarios.max_members_max_min.lifetime, scenarios.max_members_max_min.min);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

					scenarios.max_members_max_min.transaction = transaction;

					return node.Promise.map(scenarios.max_members_max_min.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.max_members_max_min.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.max_members_max_min.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					});
				})
				.then(function () {
					goodTransactions.push(scenarios.max_members_max_min.transaction);
				});
		});

		describe('signing transactions', function () {

			it('twice with the same account should fail', function () {
				signature = node.lisk.multisignature.signTransaction(scenarios.unsigned.transaction, scenarios.unsigned.members[0].password);

				return sendSignaturePromise(signature, scenarios.unsigned.transaction)
					.then(function (res) {
						node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
						node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
					})
					.then(function (res) {
						signature = node.lisk.multisignature.signTransaction(scenarios.unsigned.transaction, scenarios.unsigned.members[0].password);

						return sendSignaturePromise(signature, scenarios.unsigned.transaction);
					})
					.then(function (res) {
						node.expect(res).to.have.property('statusCode').to.equal(apiCodes.INTERNAL_SERVER_ERROR);
						node.expect(res).to.have.nested.property('body.message').to.equal('Error processing signature: Permission to sign transaction denied');
					});
			});

			it('with not requested account should fail', function () {
				signature = node.lisk.multisignature.signTransaction(scenarios.unsigned.transaction, node.randomAccount().password);

				return sendSignaturePromise(signature, scenarios.unsigned.transaction).then(function (res) {
					node.expect(res).to.have.property('statusCode').to.equal(apiCodes.INTERNAL_SERVER_ERROR);
					node.expect(res).to.have.nested.property('body.message').to.equal('Error processing signature: Failed to verify signature');
				});
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions, pendingMultisignatures);
	});
});
