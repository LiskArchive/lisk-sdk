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

const {
	transfer,
	registerMultisignature,
	createSignatureObject,
} = require('@liskhq/lisk-transactions');
const randomUtil = require('../../../common/utils/random');
const Scenarios = require('../../../common/scenarios');
const localCommon = require('../../common');
const { getNetworkIdentifier } = require('../../../common/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const { TRANSACTION_TYPES } = global.constants;

describe('integration test (type 4) - checking registered multisignature transaction against other transaction types', () => {
	let library;

	const scenarios = {
		regular: new Scenarios.Multisig(),
	};

	scenarios.regular.dapp = randomUtil.application();
	const dappTransaction = transfer({
		networkIdentifier,
		passphrase: scenarios.regular.account.passphrase,
		amount: '1',
		recipientId: '123L',
	});
	scenarios.regular.dapp.id = dappTransaction.id;

	scenarios.regular.multiSigTransaction.ready = true;
	scenarios.regular.multiSigTransaction.signatures = [];

	scenarios.regular.members.map(member => {
		const sigObject = createSignatureObject({
			transaction: scenarios.regular.multiSigTransaction,
			passphrase: member.passphrase,
			networkIdentifier,
		});
		return scenarios.regular.multiSigTransaction.signatures.push(
			sigObject.signature,
		);
	});

	localCommon.beforeBlock('4_X_multisig_validated', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(
			library,
			[scenarios.regular.creditTransaction],
			async () => {
				localCommon.addTransactionsAndForge(
					library,
					[dappTransaction],
					async () => {
						done();
					},
				);
			},
		);
	});

	it('adding to pool multisignature registration should be ok', done => {
		localCommon.addTransaction(
			library,
			scenarios.regular.multiSigTransaction,
			(err, res) => {
				expect(res).to.equal(scenarios.regular.multiSigTransaction.id);
				done();
			},
		);
	});

	describe('after forging one block', () => {
		before(done => {
			localCommon.forge(library, async () => {
				done();
			});
		});

		it('transaction should be included', done => {
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
					scenarios.regular.multiSigTransaction.id,
				);
				done();
			});
		});

		it('adding to pool multisignature registration for same account should fail', done => {
			const multiSignatureToSameAccount = registerMultisignature({
				networkIdentifier,
				passphrase: scenarios.regular.account.passphrase,
				keysgroup: scenarios.regular.keysgroup,
				lifetime: scenarios.regular.lifetime,
				minimum: scenarios.regular.minimum,
				timeOffset: -10000,
			});
			localCommon.addTransaction(library, multiSignatureToSameAccount, err => {
				const expectedErrors = [
					`Transaction: ${multiSignatureToSameAccount.id} failed at .signatures: Missing signatures `,
					`Transaction: ${multiSignatureToSameAccount.id} failed at .signatures: Register multisignature only allowed once per account.`,
				];
				expect(err).to.equal(expectedErrors.join(','));
				done();
			});
		});

		describe('adding to pool other transaction types from the same account', () => {
			Object.keys(TRANSACTION_TYPES).forEach((key, index) => {
				if (key === 'DAPP' || key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
					return true;
				}
				if (key !== 'MULTI') {
					it(`type ${index}: ${key} should be ok`, done => {
						localCommon.loadTransactionType(
							key,
							scenarios.regular.account,
							scenarios.regular.dapp,
							true,
							transaction => {
								localCommon.addTransaction(library, transaction, (err, res) => {
									expect(res).to.equal(transaction.id);
									done();
								});
							},
						);
					});
				}
				return true;
			});
		});
	});
});
