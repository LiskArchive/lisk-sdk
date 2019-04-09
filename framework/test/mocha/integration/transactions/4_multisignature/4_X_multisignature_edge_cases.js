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

const async = require('async');
const {
	transfer,
	registerMultisignature,
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

const { NORMALIZER } = global.constants;

describe('integration test - multi signature edge cases', () => {
	let library;
	const multisigAccount = randomUtil.account();
	let multisigTransaction;
	const creditTransaction = transfer({
		amount: (65 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: multisigAccount.address,
	});
	const signer1 = randomUtil.account();
	const signer2 = randomUtil.account();

	localCommon.beforeBlock('multisignature_edge_cases', lib => {
		library = lib;
	});

	before(
		'forge new block crediting and registering multisignature transaction',
		done => {
			localCommon.addTransactionsAndForge(
				library,
				[creditTransaction],
				0,
				async () => {
					const keysgroup = [signer1.publicKey, signer2.publicKey];

					multisigTransaction = registerMultisignature({
						passphrase: multisigAccount.passphrase,
						keysgroup,
						lifetime: 4,
						minimum: 2,
					});
					const sign1 = transactionUtils.multiSignTransaction(
						multisigTransaction,
						signer1.passphrase
					);
					const sign2 = transactionUtils.multiSignTransaction(
						multisigTransaction,
						signer2.passphrase
					);

					multisigTransaction.signatures = [sign1, sign2];
					multisigTransaction.ready = true;
					localCommon.addTransactionsAndForge(
						library,
						[multisigTransaction],
						done
					);
				}
			);
		}
	);

	describe('try to register more dapps than balance will allow from a multisignature account', () => {
		const transactionIds = [];
		const transactions = [];
		before('Create more transactions than available funds can cover', done => {
			for (let i = 0; i < 3; i++) {
				const dappTransaction = randomUtil.multisigDappRegistrationMaxiumData(
					multisigAccount,
					[signer1, signer2]
				);

				transactions.push(dappTransaction);
				transactionIds.push(dappTransaction.id);
			}

			async.map(
				transactions,
				(transaction, eachCb) => {
					localCommon.addTransaction(library, transaction, err => {
						expect(err).to.not.exist;
						eachCb();
					});
				},
				err => {
					expect(err).to.not.exist;
					done();
				}
			);
		});

		it('all transactions should have been added to the pool', async () => {
			const allTransactionsInPool =
				transactionIds.filter(
					trs => localCommon.transactionInPool(library, trs) === true
				).length === transactions.length;
			return expect(allTransactionsInPool).to.be.true;
		});

		it('once account balance is not enough transactions should be removed from the queue', async () => {
			return localCommon.forge(library, async () => {
				localCommon.getMultisignatureTransactions(
					library,
					{},
					(err, queueStatusRes) => {
						return expect(queueStatusRes.count).to.eql(0);
					}
				);
			});
		});

		it('invalid transaction should not be confirmed', async () => {
			/* 	First transaction in the array is the one that gets rejected in this scenario
				the reason why this is valid is that the transaction pool gets pooled
				transaction in the reverse order */
			return localCommon.getTransactionFromModule(
				library,
				{ id: transactionIds[0] },
				(err, res) => {
					return expect(res.transactions.lenght > 0).to.be.false;
				}
			);
		});

		it('valid transactions should be confirmed', done => {
			localCommon.forge(library, async () => {
				const found = [];
				const validTransactions = transactionIds.slice(1);
				async.map(
					validTransactions,
					(transactionId, eachCb) => {
						localCommon.getTransactionFromModule(
							library,
							{ id: transactionId },
							(err, res) => {
								found.push(res.transactions[0].id);
								eachCb();
							}
						);
					},
					async () => {
						expect(found).to.have.members(validTransactions);
						done();
					}
				);
			});
		});
	});
});
