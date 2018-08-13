/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

require('../../functional.js');
var lisk = require('lisk-elements').default;
var phases = require('../../../common/phases');
var Scenarios = require('../../../common/scenarios');
var accountFixtures = require('../../../fixtures/accounts');
var apiCodes = require('../../../../helpers/api_codes');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var elements = require('../../../common/utils/elements');
var swaggerEndpoint = require('../../../common/swagger_spec');
var apiHelpers = require('../../../common/helpers/api');
var errorCodes = require('../../../../helpers/api_codes');
var common = require('./common');

const constants = global.constants;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 4) register multisignature', () => {
	var scenarios = {
		no_funds: new Scenarios.Multisig({
			amount: 0,
		}),
		minimal_funds: new Scenarios.Multisig({
			amount: constants.fees.multisignature * 3,
		}),
		max_members: new Scenarios.Multisig({
			members: constants.multisigConstraints.keysgroup.maxItems + 1,
			minimum: 2,
		}),
		max_members_max_min: new Scenarios.Multisig({
			members: constants.multisigConstraints.keysgroup.maxItems + 1,
			minimum: constants.multisigConstraints.min.maximum,
		}),
		more_than_max_members: new Scenarios.Multisig({
			members: constants.multisigConstraints.keysgroup.maxItems + 2,
		}),
		unsigned: new Scenarios.Multisig(),
		regular: new Scenarios.Multisig(),
		regular_with_second_signature: new Scenarios.Multisig(),
	};

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var pendingMultisignatures = [];
	var signatureEndpoint = new swaggerEndpoint('POST /signatures');

	before(() => {
		var transactions = [];

		Object.keys(scenarios).map(type => {
			if (type !== 'no_funds') {
				transactions.push(scenarios[type].creditTransaction);
			}
		});

		return apiHelpers.sendTransactionsPromise(transactions).then(responses => {
			responses.map(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
			});
			transactionsToWaitFor = transactionsToWaitFor.concat(
				_.map(transactions, 'id')
			);

			return waitFor.confirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', () => {
		common.invalidAssets('multisignature', badTransactions);

		describe('keysgroup', () => {
			it('using empty array should fail', () => {
				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: 1,
					minimum: 2,
				});
				transaction.asset.multisignature.keysgroup = [];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate multisignature schema: Array is too short (0), minimum ${
							constants.multisigConstraints.keysgroup.minItems
						}`
					);
					badTransactions.push(transaction);
				});
			});

			it('using empty member should fail', () => {
				var keysgroup = [
					`${accountFixtures.existingDelegate.publicKey}`,
					`${scenarios.no_funds.account.publicKey}`,
					`${scenarios.minimal_funds.account.publicKey}`,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup.push(null);
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal('Invalid member in keysgroup');
					badTransactions.push(transaction);
				});
			});

			it('including sender should fail', () => {
				var keysgroup = [
					`${accountFixtures.existingDelegate.publicKey}`,
					`${scenarios.regular.account.publicKey}`,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid multisignature keysgroup. Can not contain sender'
					);
					badTransactions.push(transaction);
				});
			});

			it('using same member twice should fail', () => {
				var keysgroup = [
					randomUtil.account().publicKey,
					randomUtil.account().publicKey,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup = [
					`+${accountFixtures.existingDelegate.publicKey}`,
					`+${accountFixtures.existingDelegate.publicKey}`,
				];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Encountered duplicate public key in multisignature keysgroup'
					);
					badTransactions.push(transaction);
				});
			});

			it('using invalid publicKey should fail', () => {
				var keysgroup = [
					scenarios.no_funds.account.publicKey,
					accountFixtures.existingDelegate.publicKey,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup = [
					`+${scenarios.no_funds.account.publicKey}`,
					`+L${accountFixtures.existingDelegate.publicKey.slice(0, -1)}`,
				];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid public key in multisignature keysgroup'
					);
					badTransactions.push(transaction);
				});
			});

			it('using no math operator (just publicKey) should fail', () => {
				var keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					scenarios.no_funds.account.publicKey,
					scenarios.minimal_funds.account.publicKey,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup[0] = transaction.asset.multisignature.keysgroup[0].replace(
					'+',
					''
				);
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid math operator in multisignature keysgroup'
					);
					badTransactions.push(transaction);
				});
			});

			it('using just math operator should fail', () => {
				var keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					randomUtil.account().publicKey,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup = ['+', '+'];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid public key in multisignature keysgroup'
					);
					badTransactions.push(transaction);
				});
			});

			it('using invalid math operator should fail', () => {
				var keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					scenarios.no_funds.account.publicKey,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup = [
					`-${accountFixtures.existingDelegate.publicKey}`,
					`+${scenarios.no_funds.account.publicKey}`,
				];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid math operator in multisignature keysgroup'
					);
					badTransactions.push(transaction);
				});
			});

			it('using duplicated correct operator should fail', () => {
				var keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					scenarios.no_funds.account.publicKey,
				];

				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup = [
					`++${accountFixtures.existingDelegate.publicKey}`,
					`+${scenarios.no_funds.account.publicKey}`,
				];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid public key in multisignature keysgroup'
					);
					badTransactions.push(transaction);
				});
			});

			it(`using more_than_max_members scenario(${constants.multisigConstraints
				.keysgroup.maxItems + 2},2) should fail`, () => {
				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.more_than_max_members.account.passphrase,
					keysgroup: scenarios.more_than_max_members.keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate multisignature schema: Array is too long (${constants
							.multisigConstraints.keysgroup.maxItems + 1}), maximum ${
							constants.multisigConstraints.keysgroup.maxItems
						}`
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('min', () => {
			it('using bigger than keysgroup size plus 1 should fail', () => {
				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: [accountFixtures.existingDelegate.publicKey],
					lifetime: 1,
					minimum: 2,
				});

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid multisignature min. Must be less than or equal to keysgroup size'
					);
					badTransactions.push(transaction);
				});
			});

			it(`using min greater than maximum(${
				constants.multisigConstraints.min.maximum
			}) should fail`, () => {
				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.max_members_max_min.account.passphrase,
					keysgroup: scenarios.max_members_max_min.keysgroup,
					lifetime: 1,
					minimum: constants.multisigConstraints.min.maximum + 1,
				});

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate multisignature schema: Value ${constants
							.multisigConstraints.min.maximum + 1} is greater than maximum ${
							constants.multisigConstraints.min.maximum
						}`
					);
					badTransactions.push(transaction);
				});
			});

			it(`using min less than minimum(${
				constants.multisigConstraints.min.minimum
			}) should fail`, () => {
				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.max_members.account.passphrase,
					keysgroup: scenarios.max_members.keysgroup,
					lifetime: 1,
					minimum: constants.multisigConstraints.min.minimum - 1,
				});

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate multisignature schema: Value ${constants
							.multisigConstraints.min.minimum - 1} is less than minimum ${
							constants.multisigConstraints.min.minimum
						}`
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('lifetime', () => {
			it(`using greater than maximum(${
				constants.multisigConstraints.lifetime.maximum
			}) should fail`, () => {
				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: constants.multisigConstraints.lifetime.maximum + 1,
					minimum: 2,
				});

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate multisignature schema: Value ${constants
							.multisigConstraints.lifetime.maximum +
							1} is greater than maximum ${
							constants.multisigConstraints.lifetime.maximum
						}`
					);
					badTransactions.push(transaction);
				});
			});

			it(`using less than minimum(${
				constants.multisigConstraints.lifetime.minimum
			}) should fail`, () => {
				transaction = lisk.transaction.registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: constants.multisigConstraints.lifetime.minimum - 1,
					minimum: 2,
				});

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate multisignature schema: Value ${constants
							.multisigConstraints.lifetime.minimum - 1} is less than minimum ${
							constants.multisigConstraints.lifetime.minimum
						}`
					);
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', () => {
		it('with no_funds scenario should fail', () => {
			var scenario = scenarios.no_funds;

			return sendTransactionPromise(
				scenario.multiSigTransaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Account does not have enough LSK: ${
						scenarios.no_funds.account.address
					} balance: 0`
				);
				badTransactions.push(scenario.multiSigTransaction);
			});
		});

		it('with minimal_funds scenario should be ok', () => {
			var scenario = scenarios.minimal_funds;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
			});
		});

		it('using valid params regular scenario should be ok', () => {
			var scenario = scenarios.regular;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				var signatureRequests = _.map(scenario.members, member => {
					return {
						signature: apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member
						),
					};
				});

				return signatureEndpoint
					.makeRequests(signatureRequests, 200)
					.then(results => {
						results.forEach(res => {
							expect(res.body.meta.status).to.be.true;
							expect(res.body.data.message).to.be.equal('Signature Accepted');
						});

						goodTransactions.push(scenario.multiSigTransaction);
					});
			});
		});

		it('using valid params regular_with_second_signature scenario should be ok', () => {
			var scenario = scenarios.regular_with_second_signature;
			var multiSigSecondPassphraseTransaction = lisk.transaction.registerMultisignature(
				{
					passphrase: scenario.account.passphrase,
					secondPassphrase: scenario.account.secondPassphrase,
					keysgroup: scenario.keysgroup,
					lifetime: 1,
					minimum: 2,
				}
			);

			return sendTransactionPromise(scenario.secondSignatureTransaction)
				.then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

					return waitFor.confirmations([
						scenario.secondSignatureTransaction.id,
					]);
				})
				.then(() => {
					return sendTransactionPromise(multiSigSecondPassphraseTransaction);
				})
				.then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

					var signatureRequests = _.map(scenario.members, member => {
						return {
							signature: apiHelpers.createSignatureObject(
								multiSigSecondPassphraseTransaction,
								member
							),
						};
					});

					return signatureEndpoint
						.makeRequests(signatureRequests, 200)
						.then(results => {
							results.forEach(res => {
								expect(res.body.meta.status).to.be.true;
								expect(res.body.data.message).to.be.equal('Signature Accepted');
							});

							goodTransactions.push(multiSigSecondPassphraseTransaction);
						});
				});
		});

		it('using valid params unsigned scenario should be ok and remain in pending queue', () => {
			var scenario = scenarios.unsigned;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				pendingMultisignatures.push(scenario.multiSigTransaction);
			});
		});

		it('using valid params max_members scenario should be ok', () => {
			var scenario = scenarios.max_members;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				var signatureRequests = _.map(scenario.members, member => {
					return {
						signature: apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member
						),
					};
				});

				return signatureEndpoint
					.makeRequests(signatureRequests, 200)
					.then(results => {
						results.forEach(res => {
							expect(res.body.meta.status).to.be.true;
							expect(res.body.data.message).to.be.equal('Signature Accepted');
						});

						goodTransactions.push(scenario.multiSigTransaction);
					});
			});
		});

		it('using valid params max_members_max_min scenario should be ok', () => {
			var scenario = scenarios.max_members_max_min;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				var signatureRequests = _.map(scenario.members, member => {
					return {
						signature: apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member
						),
					};
				});

				return signatureEndpoint
					.makeRequests(signatureRequests, 200)
					.then(results => {
						results.forEach(res => {
							expect(res.body.meta.status).to.be.true;
							expect(res.body.data.message).to.be.equal('Signature Accepted');
						});

						goodTransactions.push(scenario.multiSigTransaction);
					});
			});
		});

		describe('signing transactions', () => {
			it('twice with the same account should fail', () => {
				var scenario = scenarios.unsigned;
				var signature = apiHelpers.createSignatureObject(
					scenario.multiSigTransaction,
					scenario.members[0]
				);

				return signatureEndpoint
					.makeRequest({ signature }, 200)
					.then(res => {
						expect(res.body.meta.status).to.be.true;
						expect(res.body.data.message).to.be.equal('Signature Accepted');

						return signatureEndpoint.makeRequest(
							{ signature },
							apiCodes.PROCESSING_ERROR
						);
					})
					.then(res => {
						expect(res)
							.to.have.nested.property('body.message')
							.to.equal(
								'Error processing signature: Unable to process signature, signature already exists'
							);
					});
			});

			it('with not requested account should fail', () => {
				var signature = apiHelpers.createSignatureObject(
					scenarios.unsigned.multiSigTransaction,
					randomUtil.account()
				);

				return signatureEndpoint
					.makeRequest({ signature }, apiCodes.PROCESSING_ERROR)
					.then(res => {
						expect(res)
							.to.have.nested.property('body.message')
							.to.equal(
								'Error processing signature: Unable to process signature, verification failed'
							);
					});
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(
			goodTransactions,
			badTransactions,
			pendingMultisignatures
		);
	});
});
