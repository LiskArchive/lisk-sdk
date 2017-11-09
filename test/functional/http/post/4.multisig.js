'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var apiCodes = require('../../../../helpers/apiCodes');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendSignaturePromise = require('../../../common/apiHelpers').sendSignaturePromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('POST /api/transactions (type 4) register multisignature', function () {

	var scenarios = {
		'no_funds': new shared.MultisigScenario(3, 0),
		'minimal_funds': new shared.MultisigScenario(3, constants.fees.multisignature * 3),
		'minimum_not_reached': new shared.MultisigScenario(4), //4 members 2 min signatures required
		'regular': new shared.MultisigScenario(3), //3 members 2 min signatures required
		'max_signatures': new shared.MultisigScenario(constants.multisigConstraints.keysgroup.maxItems + 1), //16 members 2 min signatures required 
		'max_signatures_max_min': new shared.MultisigScenario(constants.multisigConstraints.keysgroup.maxItems + 1), //16 members 16 min signatures required
		'more_than_max_signatures': new shared.MultisigScenario(constants.multisigConstraints.keysgroup.maxItems + 2) //17 members 2 min signatures required
	};

	var transaction, signature;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];
	var pendingMultisignatures = [];

	before(function () {
		//Crediting accounts
		return node.Promise.all(Object.keys(scenarios).map(function (type) {
			if (type === 'no_funds') {
				return;
			}
			return creditAccountPromise(scenarios[type].account.address, scenarios[type].amount).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
				transactionsToWaitFor.push(res.transactionId);
			});
		})).then(function () {
			return waitForConfirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', function () {

		shared.invalidAssets(scenarios.regular.account, 'multisignature', badTransactions);

		describe('keysgroup', function () {

			it('using empty array should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Array is too short (0), minimum ' + constants.multisigConstraints.keysgroup.minItems);
					badTransactions.push(transaction);
				});
			});

			it('using empty member should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + node.eAccount.publicKey, '+' + scenarios.no_funds.account.publicKey, '+' + scenarios.minimal_funds.account.publicKey, null], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid member in keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('including sender should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + node.eAccount.publicKey, '+' + scenarios.regular.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid multisignature keysgroup. Can not contain sender');
					badTransactions.push(transaction);
				});
			});

			it('using same member twice should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+' + node.eAccount.publicKey, '+' + node.eAccount.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Encountered duplicate public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using invalid publicKey should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+L' + node.eAccount.publicKey.slice(0, -1), '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using no math operator (just publicKey) should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [node.eAccount.publicKey, scenarios.no_funds.account.publicKey, scenarios.minimal_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid math operator in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('just math operator should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['+', '+'], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using invalid math operator should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['-' + node.eAccount.publicKey, '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid math operator in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using duplicated correct operator should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, ['++' + node.eAccount.publicKey, '+' + scenarios.no_funds.account.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid public key in multisignature keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('using more_than_max_signatures scenario(' + (constants.multisigConstraints.keysgroup.maxItems + 2) + ',2) should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.more_than_max_signatures.account.password, null, scenarios.more_than_max_signatures.keysgroup, 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Array is too long (' + (constants.multisigConstraints.keysgroup.maxItems + 1) + '), maximum ' + constants.multisigConstraints.keysgroup.maxItems);
					badTransactions.push(transaction);
				});
			});	
		});

		describe('min', function () {

			it('using bigger than keysgroup size plus 1 should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, [node.eAccount.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid multisignature min. Must be less than or equal to keysgroup size');
					badTransactions.push(transaction);
				});
			});

			it('using min greater than maximum(' + constants.multisigConstraints.min.maximum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.max_signatures_max_min.account.password, null, scenarios.max_signatures_max_min.keysgroup, 1, constants.multisigConstraints.min.maximum + 1);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.min.maximum + 1) + ' is greater than maximum ' + constants.multisigConstraints.min.maximum);
					badTransactions.push(transaction);
				});
			});

			it('using min less than minimum(' + constants.multisigConstraints.min.minimum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.max_signatures.account.password, null, scenarios.max_signatures.keysgroup, 1, constants.multisigConstraints.min.minimum - 1);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.min.minimum - 1) + ' is less than minimum ' + constants.multisigConstraints.min.minimum);
					badTransactions.push(transaction);
				});
			});
		});

		describe('lifetime', function () {

			it('using greater than maximum(' + constants.multisigConstraints.lifetime.maximum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, constants.multisigConstraints.lifetime.maximum + 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.lifetime.maximum + 1) + ' is greater than maximum ' + constants.multisigConstraints.lifetime.maximum);
					badTransactions.push(transaction);
				});
			});

			it('using less than minimum(' + constants.multisigConstraints.lifetime.minimum + ') should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, constants.multisigConstraints.lifetime.minimum - 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate multisignature schema: Value ' + (constants.multisigConstraints.lifetime.minimum - 1) + ' is less than minimum ' + constants.multisigConstraints.lifetime.minimum);
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', function () {

		it('with no_funds scenario should fail', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.no_funds.account.password, null, scenarios.no_funds.keysgroup, 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + scenarios.no_funds.account.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal_funds scenario should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.minimal_funds.account.password, null, scenarios.minimal_funds.keysgroup, 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				scenarios.minimal_funds.transaction = transaction;
			});
		});

		it('using valid params regular scenario (3,2) should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				scenarios.regular.transaction = transaction;
			});
		});

		it('using valid params minimum_not_reached scenario (4,2) should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.minimum_not_reached.account.password, null, scenarios.minimum_not_reached.keysgroup, 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				scenarios.minimum_not_reached.transaction = transaction;
			});
		});

		it('using valid params max_signatures scenario (16,2) should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.max_signatures.account.password, null, scenarios.max_signatures.keysgroup, 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				scenarios.max_signatures.transaction = transaction;
			});
		});

		it('using valid params max_signatures_max_min scenario (16,16) should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(scenarios.max_signatures_max_min.account.password, null, scenarios.max_signatures_max_min.keysgroup, 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				scenarios.max_signatures_max_min.transaction = transaction;
			});
		});

		describe('signing transactions', function () {

			it('with not all the signatures minimum_not_reached scenario (4,2) should be ok but never confirmed', function () {
				signature = node.lisk.multisignature.signTransaction(scenarios.minimum_not_reached.transaction, scenarios.minimum_not_reached.members[0].password);

				return sendSignaturePromise(signature, scenarios.minimum_not_reached.transaction).then(function (res) {
					node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
					pendingMultisignatures.push(scenarios.minimum_not_reached.transaction);
				});
			});

			it('twice with the same account should fail', function () {
				signature = node.lisk.multisignature.signTransaction(scenarios.minimum_not_reached.transaction, scenarios.minimum_not_reached.members[0].password);

				return sendSignaturePromise(signature, scenarios.minimum_not_reached.transaction).then(function (res) {
					node.expect(res).to.have.property('statusCode').to.equal(apiCodes.INTERNAL_SERVER_ERROR);
					node.expect(res).to.have.nested.property('body.message').to.equal('Error processing signature: Permission to sign transaction denied');
				});
			});

			it('with not requested account should fail', function () {
				signature = node.lisk.multisignature.signTransaction(scenarios.minimum_not_reached.transaction, node.randomAccount().password);

				return sendSignaturePromise(signature, scenarios.minimum_not_reached.transaction).then(function (res) {
					node.expect(res).to.have.property('statusCode').to.equal(apiCodes.INTERNAL_SERVER_ERROR);
					node.expect(res).to.have.nested.property('body.message').to.equal('Error processing signature: Failed to verify signature');
				});
			});

			it('with all the signatures regular scenario (3,2) should be ok and confirmed', function () {
				return node.Promise.all(node.Promise.map(scenarios.regular.members, function (member) {
					signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, member.password);

					return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
						node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
						node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
					});
				})).then(function () {
					goodTransactions.push(scenarios.regular.transaction);
				});
			});

			it('with all the signatures already in place regular scenario (3,2) should fail', function () {
				signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, scenarios.regular.members[0].password);

				return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
					node.expect(res).to.have.property('statusCode').to.equal(apiCodes.INTERNAL_SERVER_ERROR);
					node.expect(res).to.have.nested.property('body.message').to.equal('Error processing signature: Permission to sign transaction denied');
				});
			});

			it('with all the signatures max_signatures scenario (16,2) should be ok and confirmed', function () {
				return node.Promise.all(node.Promise.map(scenarios.max_signatures.members, function (member) {
					signature = node.lisk.multisignature.signTransaction(scenarios.max_signatures.transaction, member.password);

					return sendSignaturePromise(signature, scenarios.max_signatures.transaction).then(function (res) {
						node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
						node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
					});
				})).then(function () {
					goodTransactions.push(scenarios.max_signatures.transaction);
				});
			});

			it('with all the signatures max_signatures_max_min scenario (16,16) should be ok and confirmed', function () {
				return node.Promise.all(node.Promise.map(scenarios.max_signatures_max_min.members, function (member) {
					signature = node.lisk.multisignature.signTransaction(scenarios.max_signatures_max_min.transaction, member.password);

					return sendSignaturePromise(signature, scenarios.max_signatures_max_min.transaction).then(function (res) {
						node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
						node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
					});
				})).then(function () {
					goodTransactions.push(scenarios.max_signatures_max_min.transaction);
				});
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions, pendingMultisignatures);
	});

	describe('validation', function () {

		describe('type 0 - sending funds', function () {

			it('minimum_not_reached scenario(4,2) should be ok and confirmed without member signatures', function () {
				transaction = node.lisk.transaction.createTransaction(scenarios.regular.account.address, 1, scenarios.minimum_not_reached.account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});

			it('regular scenario(3,2) should be ok', function () {
				transaction = node.lisk.transaction.createTransaction(scenarios.max_signatures.account.address, 1, scenarios.regular.account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					scenarios.regular.transaction = transaction;
				});
			});

			it('max_signatures scenario(16,2) should be ok but never confirmed without the minimum signatures', function () {
				transaction = node.lisk.transaction.createTransaction(scenarios.regular.account.address, 1, scenarios.max_signatures.account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					pendingMultisignatures.push(transaction);
				});
			});

			it('max_signatures_max_min scenario(16,16) should be ok', function () {
				transaction = node.lisk.transaction.createTransaction(scenarios.regular.account.address, 1, scenarios.max_signatures_max_min.account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					scenarios.max_signatures_max_min.transaction = transaction;
				});
			});

			describe('signing transactions', function () {

				it('with min required signatures regular scenario(3,2) should be ok and confirmed', function () {
					return node.Promise.all(node.Promise.map(scenarios.regular.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					})).then(function () {
						goodTransactionsEnforcement.push(scenarios.regular.transaction);
					});
				});

				it('with min required signatures max_signatures_max_min scenario(16,16) should be ok and confirmed', function () {
					return node.Promise.all(node.Promise.map(scenarios.max_signatures_max_min.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.max_signatures_max_min.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.max_signatures_max_min.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					})).then(function () {
						goodTransactionsEnforcement.push(scenarios.max_signatures_max_min.transaction);
					});
				});
			});
		});

		describe('type 1 - second secret', function () {

			it('regular scenario(3,2) should be ok', function () {
				transaction = node.lisk.signature.createSignature(scenarios.regular.account.password, scenarios.regular.account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					scenarios.regular.transaction = transaction;
				});
			});

			describe('signing transactions', function () {

				it('with min required signatures regular scenario(3,2) should be ok and confirmed', function () {
					return node.Promise.all(node.Promise.map(scenarios.regular.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					})).then(function () {
						goodTransactionsEnforcement.push(scenarios.regular.transaction);
					});
				});
			});
		});

		describe('type 2 - registering delegate', function () {

			it('regular scenario(3,2) should be ok', function () {
				transaction = node.lisk.delegate.createDelegate(scenarios.regular.account.password, scenarios.regular.account.username);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					scenarios.regular.transaction = transaction;
				});
			});

			describe('signing transactions', function () {

				it('with min required signatures regular scenario(3,2) should be ok and confirmed', function () {
					return node.Promise.all(node.Promise.map(scenarios.regular.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					})).then(function (res) {
						goodTransactionsEnforcement.push(scenarios.regular.transaction);
					});
				});
			});
		});

		describe('type 3 - voting delegate', function () {

			it('regular scenario(3,2) should be ok', function () {
				transaction = node.lisk.vote.createVote(scenarios.regular.account.password, ['+' + node.eAccount.publicKey]);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					scenarios.regular.transaction = transaction;
				});
			});

			describe('signing transactions', function () {

				it('with min required signatures regular scenario(3,2) should be ok and confirmed', function () {
					return node.Promise.all(node.Promise.map(scenarios.regular.members, function (member) {
						signature = node.lisk.multisignature.signTransaction(scenarios.regular.transaction, member.password);

						return sendSignaturePromise(signature, scenarios.regular.transaction).then(function (res) {
							node.expect(res).to.have.property('statusCode').to.equal(apiCodes.OK);
							node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');
						});
					})).then(function () {
						goodTransactionsEnforcement.push(scenarios.regular.transaction);
					});
				});
			});
		});

		describe('type 4 - registering multisignature account', function () {

			it('with an account already registered should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Account already has multisignatures enabled');
					badTransactionsEnforcement.push(transaction);
				});
			});
		});
	});

	describe('confirm validation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement, pendingMultisignatures);
	});
});
