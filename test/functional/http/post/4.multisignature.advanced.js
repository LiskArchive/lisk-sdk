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
var waitFor = require('../../../common/utils/wait_for');
var randomUtil = require('../../../common/utils/random');
var apiHelpers = require('../../../common/helpers/api');
var errorCodes = require('../../../../helpers/api_codes');

const { NORMALIZER } = global.constants;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 4) register multisignature', () => {
	var scenarios = {
		incorrectly_offline_signed: new Scenarios.Multisig(),
		offline_signed_empty_signatures: new Scenarios.Multisig(),
		offline_signed_without_ready: new Scenarios.Multisig(),
		offline_signed_with_ready_false: new Scenarios.Multisig(),
		offline_signed_with_ready_true: new Scenarios.Multisig(),
		duplicated_signature: new Scenarios.Multisig(),
		extra_signature: new Scenarios.Multisig(),
		unknown_signature: new Scenarios.Multisig(),
		requesterPublicKey: new Scenarios.Multisig(),
	};

	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var pendingMultisignatures = [];

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

	describe('transactions processing', () => {
		describe('signatures property', () => {
			describe('correctly offline signed transaction', () => {
				it('using ready should be ok but never confirmed', () => {
					var scenario = scenarios.offline_signed_without_ready;

					scenario.multiSigTransaction.signatures = _.map(
						scenario.members,
						member => {
							var signatureObject = apiHelpers.createSignatureObject(
								scenario.multiSigTransaction,
								member
							);
							return signatureObject.signature;
						}
					);

					return sendTransactionPromise(scenario.multiSigTransaction).then(
						res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							badTransactions.push(scenario.multiSigTransaction);
							pendingMultisignatures.push(scenario.multiSigTransaction);
						}
					);
				});

				it('using ready false should be ok but never confirmed', () => {
					var scenario = scenarios.offline_signed_with_ready_false;

					scenario.multiSigTransaction.signatures = _.map(
						scenario.members,
						member => {
							var signatureObject = apiHelpers.createSignatureObject(
								scenario.multiSigTransaction,
								member
							);
							return signatureObject.signature;
						}
					);

					scenario.multiSigTransaction.ready = false;

					return sendTransactionPromise(scenario.multiSigTransaction).then(
						res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							badTransactions.push(scenario.multiSigTransaction);
							pendingMultisignatures.push(scenario.multiSigTransaction);
						}
					);
				});

				it('using ready true should be ok', () => {
					var scenario = scenarios.offline_signed_with_ready_true;

					scenario.multiSigTransaction.signatures = _.map(
						scenario.members,
						member => {
							var signatureObject = apiHelpers.createSignatureObject(
								scenario.multiSigTransaction,
								member
							);
							return signatureObject.signature;
						}
					);

					scenario.multiSigTransaction.ready = true;

					return sendTransactionPromise(scenario.multiSigTransaction).then(
						res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							goodTransactions.push(scenario.multiSigTransaction);
						}
					);
				});
			});

			describe('incorrectly offline signed transaction', () => {
				it('using null inside array should fail', () => {
					var scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [null];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using undefined inside array should fail', () => {
					var scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [undefined];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using integer inside array should fail', () => {
					var scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [1];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using empty object inside array should fail', () => {
					var scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [{}];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using non empty object inside array should fail', () => {
					var scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [new Buffer.from('Duppa')];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using empty string inside array should fail', () => {
					var scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [''];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.be.equal(
							'Failed to verify multisignature'
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using invalid signature inside array should fail', () => {
					var scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = ['x'];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using empty array should be ok but not confirmed', () => {
					var scenario = scenarios.offline_signed_empty_signatures;
					scenario.multiSigTransaction.signatures = [];

					return sendTransactionPromise(scenario.multiSigTransaction).then(
						res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							badTransactions.push(scenario.multiSigTransaction);
							pendingMultisignatures.push(scenario.multiSigTransaction);
						}
					);
				});

				it('using unknown signature should fail', () => {
					var scenario = scenarios.unknown_signature;

					var signatureObject = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						scenario.members[0]
					);

					var signatureFromunknown = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						randomUtil.account()
					);

					scenario.multiSigTransaction.signatures = [];
					scenario.multiSigTransaction.signatures.push(
						signatureObject.signature,
						signatureFromunknown.signature
					);

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.equal(
							'Failed to verify multisignature'
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using duplicate signature should fail', () => {
					var scenario = scenarios.duplicated_signature;

					var signatureObject = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						scenario.members[0]
					);
					scenario.multiSigTransaction.signatures = [];
					scenario.multiSigTransaction.signatures.push(
						signatureObject.signature,
						signatureObject.signature
					);

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.match(
							/^Invalid transaction body - Failed to validate transaction schema: Array items are not unique \(indexes/
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using extra signature should fail', () => {
					var scenario = scenarios.extra_signature;

					var signatureObject0 = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						randomUtil.account()
					);

					var signatureObject1 = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						scenario.members[1]
					);

					scenario.multiSigTransaction.signatures = [];
					scenario.multiSigTransaction.signatures.push(
						signatureObject0.signature,
						signatureObject1.signature,
						signatureObject0.signature
					);

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						errorCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.match(
							/^Invalid transaction body - Failed to validate transaction schema: Array items are not unique \(indexes/
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});
			});
		});

		describe('requesterPublicKey property', () => {
			it('sending multisig transaction offline signed should be ok and confirmed', () => {
				var scenario = scenarios.requesterPublicKey;

				scenario.multiSigTransaction.signatures = _.map(
					scenario.members,
					member => {
						var signatureObject = apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member
						);
						return signatureObject.signature;
					}
				);

				scenario.multiSigTransaction.ready = true;

				return sendTransactionPromise(scenario.multiSigTransaction).then(
					res => {
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);

						transactionsToWaitFor.push(scenario.multiSigTransaction.id);
						return waitFor.confirmations(transactionsToWaitFor);
					}
				);
			});

			it('requesting multisig group transaction from non author account', () => {
				var scenario = scenarios.requesterPublicKey;

				var transaction = lisk.transaction.transfer({
					amount: 1 * NORMALIZER,
					passphrase: scenario.members[0].passphrase,
					recipientId: randomUtil.account().address,
				});
				transaction.requesterPublicKey = scenario.account.publicKey;
				transaction.id = lisk.transaction.utils.getTransactionId(transaction);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.equal('Multisig request is not allowed');
					badTransactions.push(transaction);
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
