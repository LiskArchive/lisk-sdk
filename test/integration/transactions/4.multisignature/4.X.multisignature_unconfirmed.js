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

describe('system test (type 4) - sending transactions on top of unconfirmed multisignature registration', () => {
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

	localCommon.beforeBlock('system_4_X_multisig_unconfirmed', lib => {
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

	it('adding to pool multisig registration should be ok', done => {
		localCommon.addTransaction(
			library,
			scenarios.regular.multiSigTransaction,
			(err, res) => {
				expect(res).to.equal(scenarios.regular.multiSigTransaction.id);
				done();
			}
		);
	});

	describe('adding to pool other transactions from same account', () => {
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
