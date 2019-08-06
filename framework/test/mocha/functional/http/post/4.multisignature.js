/*
 * Copyright © 2019 Lisk Foundation
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

require('../../functional');
const { registerMultisignature } = require('@liskhq/lisk-transactions');
const phases = require('../../../common/phases');
const Scenarios = require('../../../common/scenarios');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const elements = require('../../../common/utils/elements');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const apiHelpers = require('../../../common/helpers/api');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');
const common = require('./common');
const {
	createInvalidRegisterMultisignatureTransaction,
} = require('../../../common/utils/elements');

const { FEES } = global.constants;
const { MULTISIG_CONSTRAINTS } = __testContext.config;
const sendTransactionPromise = apiHelpers.sendTransactionPromise;
describe('POST /api/transactions (type 4) register multisignature', () => {
	const scenarios = {
		no_funds: new Scenarios.Multisig({
			amount: 0,
		}),
		minimal_funds: new Scenarios.Multisig({
			amount: FEES.MULTISIGNATURE * 3,
		}),
		max_members: new Scenarios.Multisig({
			members: MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS + 1,
			minimum: 2,
		}),
		max_members_max_min: new Scenarios.Multisig({
			members: MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS + 1,
			minimum: MULTISIG_CONSTRAINTS.MIN.MAXIMUM,
		}),
		more_than_max_members: new Scenarios.Multisig({
			members: MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS + 2,
		}),
		unsigned: new Scenarios.Multisig(),
		regular: new Scenarios.Multisig(),
		regular_with_second_signature: new Scenarios.Multisig(),
	};

	let transaction;
	let transactionsToWaitFor = [];
	const badTransactions = [];
	const goodTransactions = [];
	const pendingMultisignatures = [];
	const signatureEndpoint = new SwaggerEndpoint('POST /signatures');

	before(() => {
		const transactions = [];

		Object.keys(scenarios)
			.filter(type => type !== 'no_funds')
			.map(type => transactions.push(scenarios[type].creditTransaction));

		return apiHelpers.sendTransactionsPromise(transactions).then(responses => {
			responses.map(res => {
				return expect(res.body.data.message).to.be.equal(
					'Transaction(s) accepted',
				);
			});
			transactionsToWaitFor = transactionsToWaitFor.concat(
				_.map(transactions, 'id'),
			);

			return waitFor.confirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', () => {
		common.invalidAssets('multisignature', badTransactions);

		describe('keysgroup', () => {
			it('using empty array should fail', async () => {
				transaction = registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: 1,
					minimum: 2,
				});
				transaction.asset.multisignature.keysgroup = [];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.keysgroup' should NOT have fewer than 1 items",
					);
					badTransactions.push(transaction);
				});
			});

			it('using empty member should fail', async () => {
				const keysgroup = [
					`${accountFixtures.existingDelegate.publicKey}`,
					`${scenarios.no_funds.account.publicKey}`,
					`${scenarios.minimal_funds.account.publicKey}`,
				];

				transaction = registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup.push(null);
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.keysgroup[3]' should be string",
					);
					badTransactions.push(transaction);
				});
			});

			it('including sender should fail', async () => {
				const keysgroup = [
					`${accountFixtures.existingDelegate.publicKey}`,
					`${scenarios.regular.account.publicKey}`,
				];

				transaction = registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[1].message).to.be.equal(
						'Invalid multisignature keysgroup. Can not contain sender',
					);
					badTransactions.push(transaction);
				});
			});

			it('using same member twice should fail', async () => {
				const keysgroup = [
					randomUtil.account().publicKey,
					randomUtil.account().publicKey,
				];

				transaction = registerMultisignature({
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
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.keysgroup' should NOT have duplicate items (items ## 1 and 0 are identical)",
					);
					badTransactions.push(transaction);
				});
			});

			it('using invalid publicKey should fail', async () => {
				const keysgroup = [
					scenarios.no_funds.account.publicKey,
					accountFixtures.existingDelegate.publicKey,
				];

				transaction = registerMultisignature({
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
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.multisignature.keysgroup[1]\' should match format "additionPublicKey"',
					);
					badTransactions.push(transaction);
				});
			});

			it('using no math operator (just publicKey) should fail', async () => {
				const keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					scenarios.no_funds.account.publicKey,
					scenarios.minimal_funds.account.publicKey,
				];

				transaction = registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup[0] = transaction.asset.multisignature.keysgroup[0].replace(
					'+',
					'',
				);
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.multisignature.keysgroup[0]\' should match format "additionPublicKey"',
					);
					badTransactions.push(transaction);
				});
			});

			it('using just math operator should fail', async () => {
				const keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					randomUtil.account().publicKey,
				];

				transaction = registerMultisignature({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});

				transaction.asset.multisignature.keysgroup = ['+', '+'];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.multisignature.keysgroup[0]\' should match format "additionPublicKey"',
					);
					badTransactions.push(transaction);
				});
			});

			it('using invalid math operator should fail', async () => {
				const keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					scenarios.no_funds.account.publicKey,
				];

				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
					baseFee: FEES.MULTISIGNATURE,
				});

				transaction.asset.multisignature.keysgroup = [
					`-${accountFixtures.existingDelegate.publicKey}`,
					`+${scenarios.no_funds.account.publicKey}`,
				];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.multisignature.keysgroup[0]\' should match format "additionPublicKey"',
					);
					badTransactions.push(transaction);
				});
			});

			it('using duplicated correct operator should fail', async () => {
				const keysgroup = [
					accountFixtures.existingDelegate.publicKey,
					scenarios.no_funds.account.publicKey,
				];

				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
					baseFee: FEES.MULTISIGNATURE,
				});

				transaction.asset.multisignature.keysgroup = [
					`++${accountFixtures.existingDelegate.publicKey}`,
					`+${scenarios.no_funds.account.publicKey}`,
				];
				transaction = elements.redoSignature(
					transaction,
					scenarios.regular.account.passphrase,
				);

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.multisignature.keysgroup[0]\' should match format "additionPublicKey"',
					);
					badTransactions.push(transaction);
				});
			});

			it(`using more_than_max_members scenario(${MULTISIG_CONSTRAINTS.KEYSGROUP
				.MAX_ITEMS + 2}, 2) should fail`, async () => {
				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.more_than_max_members.account.passphrase,
					keysgroup: scenarios.more_than_max_members.keysgroup,
					lifetime: 1,
					minimum: 2,
					baseFee: FEES.MULTISIGNATURE,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.keysgroup' should NOT have more than 15 items",
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('min', () => {
			it('using bigger than keysgroup size plus 1 should fail', async () => {
				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: [accountFixtures.existingDelegate.publicKey],
					lifetime: 1,
					minimum: 2,
					baseFee: FEES.MULTISIGNATURE,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'Invalid multisignature min. Must be less than or equal to keysgroup size',
					);
					badTransactions.push(transaction);
				});
			});

			it(`using min greater than maximum(${
				MULTISIG_CONSTRAINTS.MIN.MAXIMUM
			}) should fail`, async () => {
				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.max_members_max_min.account.passphrase,
					keysgroup: scenarios.max_members_max_min.keysgroup,
					lifetime: 1,
					minimum: MULTISIG_CONSTRAINTS.MIN.MAXIMUM + 1,
					baseFee: FEES.MULTISIGNATURE,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.min' should be <= 15",
					);
					badTransactions.push(transaction);
				});
			});

			it(`using min less than minimum(${
				MULTISIG_CONSTRAINTS.MIN.MINIMUM
			}) should fail`, async () => {
				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.max_members.account.passphrase,
					keysgroup: scenarios.max_members.keysgroup,
					lifetime: 1,
					minimum: MULTISIG_CONSTRAINTS.MIN.MINIMUM - 1,
					baseFee: FEES.MULTISIGNATURE,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.min' should be >= 1",
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('lifetime', () => {
			it(`using greater than maximum(${
				MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM
			}) should fail`, async () => {
				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM + 1,
					minimum: 2,
					baseFee: FEES.MULTISIGNATURE,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.lifetime' should be <= 72",
					);
					badTransactions.push(transaction);
				});
			});

			it(`using less than minimum(${
				MULTISIG_CONSTRAINTS.LIFETIME.MINIMUM
			}) should fail`, async () => {
				transaction = createInvalidRegisterMultisignatureTransaction({
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: MULTISIG_CONSTRAINTS.LIFETIME.MINIMUM - 1,
					minimum: 2,
					baseFee: FEES.MULTISIGNATURE,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.eql(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.multisignature.lifetime' should be >= 1",
					);
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', () => {
		it('with no_funds scenario should fail', async () => {
			const scenario = scenarios.no_funds;

			return sendTransactionPromise(
				scenario.multiSigTransaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Account does not have enough LSK: ${
						scenarios.no_funds.account.address
					}, balance: 0`,
				);
				badTransactions.push(scenario.multiSigTransaction);
			});
		});

		it('with minimal_funds scenario should be ok', async () => {
			const scenario = scenarios.minimal_funds;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
			});
		});

		it('using valid params regular scenario should be ok', async () => {
			const scenario = scenarios.regular;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				const signatureRequests = _.map(scenario.members, member => {
					return {
						signature: apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member,
						),
					};
				});

				return signatureEndpoint
					.makeRequests(signatureRequests, 200)
					.then(results => {
						results.forEach(makeRequestsRes => {
							expect(makeRequestsRes.body.meta.status).to.be.true;
							expect(makeRequestsRes.body.data.message).to.be.equal(
								'Signature Accepted',
							);
						});

						goodTransactions.push(scenario.multiSigTransaction);
					});
			});
		});

		it('using valid params regular_with_second_signature scenario should be ok', async () => {
			const scenario = scenarios.regular_with_second_signature;
			const multiSigSecondPassphraseTransaction = registerMultisignature({
				passphrase: scenario.account.passphrase,
				secondPassphrase: scenario.account.secondPassphrase,
				keysgroup: scenario.keysgroup,
				lifetime: 1,
				minimum: 2,
			});

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

					const signatureRequests = _.map(scenario.members, member => {
						return {
							signature: apiHelpers.createSignatureObject(
								multiSigSecondPassphraseTransaction,
								member,
							),
						};
					});

					return signatureEndpoint
						.makeRequests(signatureRequests, 200)
						.then(results => {
							results.forEach(makeRequestsRes => {
								expect(makeRequestsRes.body.meta.status).to.be.true;
								expect(makeRequestsRes.body.data.message).to.be.equal(
									'Signature Accepted',
								);
							});

							goodTransactions.push(multiSigSecondPassphraseTransaction);
						});
				});
		});

		it('using valid params unsigned scenario should be ok and remain in pending queue', async () => {
			const scenario = scenarios.unsigned;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				pendingMultisignatures.push(scenario.multiSigTransaction);
			});
		});

		it('using valid params max_members scenario should be ok', async () => {
			const scenario = scenarios.max_members;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				const signatureRequests = _.map(scenario.members, member => {
					return {
						signature: apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member,
						),
					};
				});

				return signatureEndpoint
					.makeRequests(signatureRequests, 200)
					.then(results => {
						results.forEach(eachRes => {
							expect(eachRes.body.meta.status).to.be.true;
							expect(eachRes.body.data.message).to.be.equal(
								'Signature Accepted',
							);
						});

						goodTransactions.push(scenario.multiSigTransaction);
					});
			});
		});

		it('using valid params max_members_max_min scenario should be ok', async () => {
			const scenario = scenarios.max_members_max_min;

			return sendTransactionPromise(scenario.multiSigTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				const signatureRequests = _.map(scenario.members, member => {
					return {
						signature: apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member,
						),
					};
				});

				return signatureEndpoint
					.makeRequests(signatureRequests, 200)
					.then(results => {
						results.forEach(eachRes => {
							expect(eachRes.body.meta.status).to.be.true;
							expect(eachRes.body.data.message).to.be.equal(
								'Signature Accepted',
							);
						});

						goodTransactions.push(scenario.multiSigTransaction);
					});
			});
		});

		describe('signing transactions', () => {
			it('twice with the same account should fail', async () => {
				const scenario = scenarios.unsigned;
				const signature = apiHelpers.createSignatureObject(
					scenario.multiSigTransaction,
					scenario.members[0],
				);

				return signatureEndpoint
					.makeRequest({ signature }, 200)
					.then(res => {
						expect(res.body.meta.status).to.be.true;
						expect(res.body.data.message).to.be.equal('Signature Accepted');

						return signatureEndpoint.makeRequest(
							{ signature },
							apiCodes.PROCESSING_ERROR,
						);
					})
					.then(res => {
						expect(res.body.message).to.be.equal('Error processing signature');
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.be.equal(
							'Encountered duplicate signature in transaction',
						);
					});
			});

			it('with not requested account should fail', async () => {
				const account = randomUtil.account();
				const signature = apiHelpers.createSignatureObject(
					scenarios.unsigned.multiSigTransaction,
					account,
				);

				return signatureEndpoint
					.makeRequest({ signature }, apiCodes.PROCESSING_ERROR)
					.then(res => {
						expect(res.body.message).to.be.equal('Error processing signature');
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.be.equal(
							`Public Key '${signature.publicKey}' is not a member.`,
						);
					});
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(
			goodTransactions,
			badTransactions,
			pendingMultisignatures,
		);
	});
});
