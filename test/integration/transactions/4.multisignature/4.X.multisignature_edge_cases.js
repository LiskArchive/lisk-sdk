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
const lisk = require('lisk-elements').default;
const randomstring = require('randomstring');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

const { NORMALIZER } = global.constants;

describe('system test - multi signature edge cases', () => {
	let library;
	const multisigAccount = randomUtil.account();
	let multisigTransaction;
	const creditTransaction = lisk.transaction.transfer({
		amount: 65 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: multisigAccount.address,
	});
	const signer1 = randomUtil.account();
	const signer2 = randomUtil.account();

	localCommon.beforeBlock('system_multisignature_edge_cases', lib => {
		library = lib;
	});

	before(
		'forge new block crediting and registering multisignature transaction',
		done => {
			localCommon.addTransactionsAndForge(
				library,
				[creditTransaction],
				0,
				() => {
					const keysgroup = [signer1.publicKey, signer2.publicKey];

					multisigTransaction = lisk.transaction.registerMultisignature({
						passphrase: multisigAccount.passphrase,
						keysgroup,
						lifetime: 4,
						minimum: 2,
					});
					const sign1 = lisk.transaction.utils.multiSignTransaction(
						multisigTransaction,
						signer1.passphrase
					);
					const sign2 = lisk.transaction.utils.multiSignTransaction(
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
		let queueStatus;
		const transactionIds = [];
		let allTransactionsInPool = false;
		let isInvalidTransactionConfirmed = true;
		before('Create more transactions than available funds can cover', done => {
			const transactions = [];
			const memberPassphrases = [signer1.passphrase, signer2.passphrase];
			const charset =
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			for (let i = 0; i < 3; i++) {
				const dappName = randomstring.generate({
					length: 32,
					charset,
				});

				const string160 = randomstring.generate({
					length: 160,
					charset,
				});

				const string1KB = randomstring.generate({
					length: 20,
					charset,
				});

				const application = {
					category: randomUtil.number(0, 9),
					name: dappName,
					description: string160,
					tags: string160,
					type: 0,
					link: `https://${string1KB}.zip`,
					icon: `https://${string1KB}.png`,
				};

				const dappTransaction = lisk.transaction.createDapp({
					passphrase: multisigAccount.passphrase,
					options: application,
				});

				const signatures = memberPassphrases.map(memberPassphrase => {
					const sigObj = lisk.transaction.createSignatureObject(
						dappTransaction,
						memberPassphrase
					).signature;
					return sigObj;
				});

				dappTransaction.signatures = signatures;

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
					allTransactionsInPool =
						transactionIds.filter(
							trs => localCommon.transactionInPool(library, trs) === true
						).length === transactions.length;
					localCommon.forge(library, () => {
						localCommon.getMultisignatureTransactions(
							library,
							{},
							(err, queueStatusRes) => {
								queueStatus = queueStatusRes;
								/* First transaction in the array is the one that gets rejected in this scenario
										the reason why this is valid is that the transaction pool gets pooled
										transaction in the reverse order
									*/
								localCommon.getTransactionFromModule(
									library,
									{ id: transactionIds[0] },
									(err, res) => {
										isInvalidTransactionConfirmed = res.transactions.lenght > 0;
										done();
									}
								);
							}
						);
					});
				}
			);
		});

		it('all transactions should have been added to the pool', () => {
			return expect(allTransactionsInPool).to.be.true;
		});

		it('once account balance is not enough transactions should be removed from the queue', () => {
			return expect(queueStatus.count).to.eql(0);
		});

		it('invalid transaction should not be confirmed', () => {
			return expect(isInvalidTransactionConfirmed).to.be.false;
		});
	});
});
