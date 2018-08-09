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

var lisk = require('lisk-elements').default;
var randomUtil = require('../../../common/utils/random');
var Scenarios = require('../../../common/scenarios');
var transactionTypes = require('../../../../helpers/transaction_types.js');
var localCommon = require('../../common');

describe('system test (type 4) - checking registered multisignature transaction against other transaction types', () => {
	var library;

	var scenarios = {
		regular: new Scenarios.Multisig(),
	};

	scenarios.regular.dapp = randomUtil.application();
	var dappTransaction = lisk.transaction.createDapp({
		passphrase: scenarios.regular.account.passphrase,
		options: scenarios.regular.dapp,
	});
	scenarios.regular.dapp.id = dappTransaction.id;

	scenarios.regular.multiSigTransaction.ready = true;
	scenarios.regular.multiSigTransaction.signatures = [];

	scenarios.regular.members.map(member => {
		var signature = lisk.transaction.utils.multiSignTransaction(
			scenarios.regular.multiSigTransaction,
			member.passphrase
		);
		scenarios.regular.multiSigTransaction.signatures.push(signature);
	});

	localCommon.beforeBlock('system_4_X_multisig_validated', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(
			library,
			[scenarios.regular.creditTransaction],
			() => {
				localCommon.addTransactionsAndForge(library, [dappTransaction], () => {
					done();
				});
			}
		);
	});

	it('adding to pool multisignature registration should be ok', done => {
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
			localCommon.forge(library, () => {
				done();
			});
		});

		it('transaction should be included', done => {
			var filter = {
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
			const multiSignatureToSameAccount = lisk.transaction.registerMultisignature(
				{
					passphrase: scenarios.regular.account.passphrase,
					keysgroup: scenarios.regular.keysgroup,
					lifetime: scenarios.regular.lifetime,
					minimum: scenarios.regular.minimum,
					timeOffset: -10000,
				}
			);
			localCommon.addTransaction(library, multiSignatureToSameAccount, err => {
				expect(err).to.equal('Account already has multisignatures enabled');
				done();
			});
		});

		describe('adding to pool other transaction types from the same account', () => {
			Object.keys(transactionTypes).forEach((key, index) => {
				if (key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
					return true;
				} else if (key != 'MULTI') {
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
							}
						);
					});
				}
			});
		});
	});
});
