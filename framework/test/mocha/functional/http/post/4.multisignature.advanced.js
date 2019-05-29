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

require('../../functional');

const phases = require('../../../common/phases');
const Scenarios = require('../../../common/scenarios');
const waitFor = require('../../../common/utils/wait_for');
const randomUtil = require('../../../common/utils/random');
const apiHelpers = require('../../../common/helpers/api');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');

const sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 4) register multisignature', () => {
	const scenarios = {
		incorrectly_offline_signed: new Scenarios.Multisig(),
		offline_signed_empty_signatures: new Scenarios.Multisig(),
		offline_signed_without_ready: new Scenarios.Multisig(),
		offline_not_signed_with_ready_false: new Scenarios.Multisig(),
		offline_signed_with_ready_true: new Scenarios.Multisig(),
		duplicated_signature: new Scenarios.Multisig(),
		extra_signature: new Scenarios.Multisig(),
		unknown_signature: new Scenarios.Multisig(),
		requesterPublicKey: new Scenarios.Multisig(),
		all_signatures_ready_false: new Scenarios.Multisig(),
		no_signatures_ready_true: new Scenarios.Multisig(),
		offline_partly_signed_with_ready_true: new Scenarios.Multisig(),
	};

	let transactionsToWaitFor = [];
	const badTransactions = [];
	const goodTransactions = [];
	const pendingMultisignatures = [];

	before(() => {
		const transactions = [];

		Object.keys(scenarios)
			.filter(type => type !== 'no_funds')
			.map(type => transactions.push(scenarios[type].creditTransaction));

		return apiHelpers.sendTransactionsPromise(transactions).then(responses => {
			responses.map(res => {
				return expect(res.body.data.message).to.be.equal(
					'Transaction(s) accepted'
				);
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
				it('Parameter ready set to false, no signatures present, should be ok', async () => {
					const scenario = scenarios.offline_not_signed_with_ready_false;

					scenario.multiSigTransaction.ready = false;

					return sendTransactionPromise(scenario.multiSigTransaction).then(
						res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							pendingMultisignatures.push(scenario.multiSigTransaction);
						}
					);
				});

				it('Parameter ready set to true, all signatures present, should be ok', async () => {
					const scenario = scenarios.offline_signed_with_ready_true;

					scenario.multiSigTransaction.signatures = _.map(
						scenario.members,
						member => {
							const signatureObject = apiHelpers.createSignatureObject(
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
				it('using null inside array should fail', async () => {
					const scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [null];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						apiCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using undefined inside array should fail', async () => {
					const scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [undefined];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						apiCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using integer inside array should fail', async () => {
					const scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [1];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						apiCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using empty object inside array should fail', async () => {
					const scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [{}];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						apiCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using non empty object inside array should fail', async () => {
					const scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [Buffer.from('Duppa')];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						apiCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using empty string inside array should fail', async () => {
					const scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = [''];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						apiCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.eql(
							'Transaction was rejected with errors'
						);
						expect(res.body.code).to.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.be.equal(
							'\'.signatures[0]\' should match format "signature"'
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using invalid signature inside array should fail', async () => {
					const scenario = scenarios.incorrectly_offline_signed;
					scenario.multiSigTransaction.signatures = ['x'];

					return sendTransactionPromise(
						scenario.multiSigTransaction,
						apiCodes.BAD_REQUEST
					).then(res => {
						expect(res.body.message).to.equal('Validation errors');
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using empty array should be ok but not confirmed', async () => {
					const scenario = scenarios.offline_signed_empty_signatures;
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

				it('using unknown signature should fail', async () => {
					const scenario = scenarios.unknown_signature;

					const signatureObject = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						scenario.members[0]
					);

					const signatureFromunknown = apiHelpers.createSignatureObject(
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
						apiCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.be.equal(
							'Transaction was rejected with errors'
						);
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.be.equal(
							`Failed to validate signature ${signatureFromunknown.signature}`
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using duplicate signature should fail', async () => {
					const scenario = scenarios.duplicated_signature;

					const signatureObject = apiHelpers.createSignatureObject(
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
						apiCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.be.equal(
							'Transaction was rejected with errors'
						);
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.eql(
							"'.signatures' should NOT have duplicate items (items ## 1 and 0 are identical)"
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using extra signature should fail', async () => {
					const scenario = scenarios.extra_signature;

					const signatureObject0 = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						randomUtil.account()
					);

					const signatureObject1 = apiHelpers.createSignatureObject(
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
						apiCodes.PROCESSING_ERROR
					).then(res => {
						expect(res.body.message).to.be.equal(
							'Transaction was rejected with errors'
						);
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.eql(
							"'.signatures' should NOT have duplicate items (items ## 2 and 0 are identical)"
						);
						badTransactions.push(scenario.multiSigTransaction);
					});
				});

				it('using all signatures, setting ready to false, should be corrected and processed', async () => {
					const scenario = scenarios.all_signatures_ready_false;

					scenario.multiSigTransaction.signatures = _.map(
						scenario.members,
						member => {
							const signatureObject = apiHelpers.createSignatureObject(
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
							goodTransactions.push(scenario.multiSigTransaction);
						}
					);
				});

				it('using no signatures, setting ready to true, should be corrected and remain pending', async () => {
					const scenario = scenarios.no_signatures_ready_true;

					scenario.multiSigTransaction.ready = true;

					return sendTransactionPromise(scenario.multiSigTransaction).then(
						res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							pendingMultisignatures.push(scenario.multiSigTransaction);
						}
					);
				});

				it('using some signatures, setting ready to true, should be corrected and remain pending', async () => {
					const scenario = scenarios.offline_partly_signed_with_ready_true;

					const signatureObj = apiHelpers.createSignatureObject(
						scenario.multiSigTransaction,
						scenario.members[0]
					);

					scenario.multiSigTransaction.signatures = [signatureObj.signature];

					scenario.multiSigTransaction.ready = true;

					return sendTransactionPromise(scenario.multiSigTransaction).then(
						res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							pendingMultisignatures.push(scenario.multiSigTransaction);
						}
					);
				});
			});
		});

		// Deprecated: requesterPublicKeyProperty no longer in use
		// eslint-disable-next-line
		describe('requesterPublicKey property', () => {
			it('sending multisig transaction offline signed should be ok and confirmed', async () => {
				const scenario = scenarios.requesterPublicKey;

				scenario.multiSigTransaction.signatures = _.map(
					scenario.members,
					member => {
						const signatureObject = apiHelpers.createSignatureObject(
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
