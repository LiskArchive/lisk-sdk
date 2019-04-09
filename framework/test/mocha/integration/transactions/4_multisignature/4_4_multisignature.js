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

const {
	registerMultisignature,
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const Scenarios = require('../../../common/scenarios');
const localCommon = require('../../common');

describe('integration test (type 4) - double multisignature registrations', () => {
	let library;

	const scenarios = {
		regular: new Scenarios.Multisig(),
	};

	const transactionToBeNotConfirmed = registerMultisignature({
		passphrase: scenarios.regular.account.passphrase,
		keysgroup: scenarios.regular.keysgroup,
		lifetime: scenarios.regular.lifetime,
		minimum: scenarios.regular.minimum,
		timeOffset: -10000,
	});

	scenarios.regular.multiSigTransaction.ready = true;
	scenarios.regular.multiSigTransaction.signatures = [];
	transactionToBeNotConfirmed.ready = true;
	transactionToBeNotConfirmed.signatures = [];

	scenarios.regular.members.map(member => {
		const signatureToBeNotconfirmed = transactionUtils.multiSignTransaction(
			transactionToBeNotConfirmed,
			member.passphrase
		);
		transactionToBeNotConfirmed.signatures.push(signatureToBeNotconfirmed);
		const signature = transactionUtils.multiSignTransaction(
			scenarios.regular.multiSigTransaction,
			member.passphrase
		);
		return scenarios.regular.multiSigTransaction.signatures.push(signature);
	});

	localCommon.beforeBlock('4_4_multisig', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(
			library,
			[scenarios.regular.creditTransaction],
			async () => {
				done();
			}
		);
	});

	it('adding to pool multisig registration should be ok', done => {
		localCommon.addTransaction(
			library,
			transactionToBeNotConfirmed,
			(err, res) => {
				expect(res).to.equal(transactionToBeNotConfirmed.id);
				done();
			}
		);
	});

	it('adding to pool same transaction with different timestamp should be ok', done => {
		localCommon.addTransaction(
			library,
			scenarios.regular.multiSigTransaction,
			(err, res) => {
				expect(res).to.equal(scenarios.regular.multiSigTransaction.id);
				done();
			}
		);
	});

	describe('after forging one block', () => {
		before(done => {
			localCommon.forge(library, async () => {
				done();
			});
		});

		it('first transaction to arrive should not be included', done => {
			const filter = {
				id: transactionToBeNotConfirmed.id,
			};
			localCommon.getTransactionFromModule(library, filter, (err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				expect(res.transactions.length).to.equal(0);
				done();
			});
		});

		it('last transaction to arrive should be included', done => {
			const filter = {
				id: scenarios.regular.multiSigTransaction.id,
			};
			localCommon.getTransactionFromModule(library, filter, (err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				expect(res.transactions.length).to.equal(1);
				expect(res.transactions[0].id).to.equal(
					scenarios.regular.multiSigTransaction.id
				);
				done();
			});
		});

		it('adding to pool multisignature registration for same account should fail', done => {
			const multiSignatureToSameAccount = registerMultisignature({
				passphrase: scenarios.regular.account.passphrase,
				keysgroup: scenarios.regular.keysgroup,
				lifetime: scenarios.regular.lifetime,
				minimum: scenarios.regular.minimum,
				timeOffset: -10000,
			});
			localCommon.addTransaction(library, multiSignatureToSameAccount, err => {
				expect(err).to.equal('Account already has multisignatures enabled');
				done();
			});
		});
	});
});
