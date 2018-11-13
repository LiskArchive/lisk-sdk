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

const phases = require('../../../common/phases');
const Scenarios = require('../../../common/scenarios');
const waitFor = require('../../../common/utils/wait_for');
const randomUtil = require('../../../common/utils/random');
const apiHelpers = require('../../../common/helpers/api');

var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 0) transfer from multisignature account', () => {
	const scenarios = {
		register_multisignature: new Scenarios.Multisig(),
	};

	let transactionsToWaitFor = [];
	let registerMultisignature = [];
	const goodTransactions = [];
	const pendingMultisignatures = [];
	let multiSigAccount;

	before(() => {
		var transactions = [];

		Object.keys(scenarios).map(type => {
			if (type !== 'no_funds') {
				transactions.push(scenarios[type].creditTransaction);
			}
		});

		return apiHelpers
			.sendTransactionsPromise(transactions)
			.then(responses => {
				responses.map(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				});
				transactionsToWaitFor = transactionsToWaitFor.concat(
					_.map(transactions, 'id')
				);
			})
			.then(() => waitFor.confirmations(transactionsToWaitFor))
			.then(() => {
				transactionsToWaitFor = [];
				multiSigAccount = scenarios.register_multisignature;

				multiSigAccount.multiSigTransaction.signatures = _.map(
					multiSigAccount.members,
					member => {
						var signatureObject = apiHelpers.createSignatureObject(
							multiSigAccount.multiSigTransaction,
							member
						);
						return signatureObject.signature;
					}
				);

				return apiHelpers
					.sendTransactionsPromise([multiSigAccount.multiSigTransaction])
					.then(responses => {
						responses.map(res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
						});
						registerMultisignature = transactionsToWaitFor.concat(
							_.map([multiSigAccount.multiSigTransaction], 'id')
						);
					});
			})
			.then(() => waitFor.confirmations(registerMultisignature));
	});

	describe('Transfers processing', () => {
		it('with no signatures present it should remain pending', () => {
			const targetAccount = randomUtil.account();
			const trs = multiSigAccount.transfer(
				targetAccount.address,
				multiSigAccount.account.passphrase,
				1
			);

			return sendTransactionPromise(trs).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				pendingMultisignatures.push(trs);
			});
		});

		it('with some signatures present it should remain pending', () => {
			const targetAccount = randomUtil.account();
			const trs = multiSigAccount.transfer(
				targetAccount.address,
				multiSigAccount.account.passphrase,
				1
			);

			const signature = multiSigAccount.signTransaction(
				[multiSigAccount.members[0].passphrase],
				trs
			);
			trs.signatures = signature;

			return sendTransactionPromise(trs).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				pendingMultisignatures.push(trs);
			});
		});

		it('with all signatures present it should be confirmed', () => {
			const targetAccount = randomUtil.account();
			const trs = multiSigAccount.transfer(
				targetAccount.address,
				multiSigAccount.account.passphrase,
				1
			);
			const signatures = multiSigAccount.signTransaction(
				[...multiSigAccount.members.map(anAccount => anAccount.passphrase)],
				trs
			);
			trs.signatures = signatures;

			return sendTransactionPromise(trs).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(trs);
			});
		});

		it('with no signatures present, ready set to true, it should remain pending', () => {
			const targetAccount = randomUtil.account();
			const trs = multiSigAccount.transfer(
				targetAccount.address,
				multiSigAccount.account.passphrase,
				1
			);
			trs.ready = true;

			return sendTransactionPromise(trs).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				pendingMultisignatures.push(trs);
			});
		});

		it('with some signatures present, ready set to true, it should remain pending', () => {
			const targetAccount = randomUtil.account();
			const trs = multiSigAccount.transfer(
				targetAccount.address,
				multiSigAccount.account.passphrase,
				1
			);

			const signature = multiSigAccount.signTransaction(
				[multiSigAccount.members[0].passphrase],
				trs
			);
			trs.signatures = signature;
			trs.ready = true;

			return sendTransactionPromise(trs).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				pendingMultisignatures.push(trs);
			});
		});

		it('with all signatures present, ready set to false, it should be confirmed', () => {
			const targetAccount = randomUtil.account();
			const trs = multiSigAccount.transfer(
				targetAccount.address,
				multiSigAccount.account.passphrase,
				1
			);
			const signatures = multiSigAccount.signTransaction(
				[...multiSigAccount.members.map(anAccount => anAccount.passphrase)],
				trs
			);
			trs.signatures = signatures;
			trs.ready = false;

			return sendTransactionPromise(trs).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(trs);
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, pendingMultisignatures);
	});
});
