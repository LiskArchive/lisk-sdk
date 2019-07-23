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
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

const { NORMALIZER } = global.__testContext.config;

describe('integration test (type 4) - effect of multisignature registration on memory tables', () => {
	let library;

	const multisigAccount = randomUtil.account();
	let multisigTransaction;
	const creditTransaction = transfer({
		amount: (1000 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: multisigAccount.address,
	});
	const signer1 = randomUtil.account();
	const signer2 = randomUtil.account();

	localCommon.beforeBlock('4_multisig_account', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(
			library,
			[creditTransaction],
			async () => {
				library.logic.account.get({ address: multisigAccount.address }, done);
			}
		);
	});

	describe('forge block with multisignature transaction', () => {
		before('forge block with multisignature transaction', done => {
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
			localCommon.addTransactionsAndForge(library, [multisigTransaction], done);
		});

		describe('check sender db rows', () => {
			let accountRow;

			before('get mem_account, mem_account2multisignature rows', async () => {
				return localCommon
					.getAccountFromDb(library, multisigAccount.address)
					.then(res => {
						accountRow = res;
					});
			});

			it('should include rows in mem_accounts2multisignatures', async () => {
				const signKeysInDb = _.map(
					accountRow.mem_accounts2multisignatures,
					row => {
						return row.dependentId;
					}
				);
				return expect(signKeysInDb).to.include(
					signer1.publicKey,
					signer2.publicKey
				);
			});

			it('should set multimin field set on mem_accounts', async () => {
				return expect(accountRow.mem_accounts.multimin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should set multilifetime field set on mem_accounts', async () => {
				return expect(accountRow.mem_accounts.multilifetime).to.eql(
					multisigTransaction.asset.multisignature.lifetime
				);
			});
		});

		describe('check sender account', () => {
			let account;

			before('get multisignature account', done => {
				library.logic.account.get(
					{ address: multisigAccount.address },
					(err, res) => {
						expect(err).to.be.null;
						account = res;
						done();
					}
				);
			});

			it('should have multisignatures field set on account', async () => {
				return expect(account.membersPublicKeys).to.include(
					signer1.publicKey,
					signer2.publicKey
				);
			});

			it('should have multimin field set on account', async () => {
				return expect(account.multiMin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should have multilifetime field set on account', async () => {
				return expect(account.multiLifetime).to.eql(
					multisigTransaction.asset.multisignature.lifetime
				);
			});
		});

		describe('after deleting block', () => {
			before('delete last block', done => {
				library.modules.blocks.lastBlock.get();
				library.modules.blocks.chain.deleteLastBlock(done);
			});

			describe('sender db rows', () => {
				let accountRow;

				before('get mem_account, mem_account2multisignature rows', async () => {
					return localCommon
						.getAccountFromDb(library, multisigAccount.address)
						.then(res => {
							accountRow = res;
						});
				});

				it('should have no rows in mem_accounts2multisignatures', async () => {
					return expect(accountRow.mem_accounts2multisignatures).to.eql([]);
				});

				it('should have multimin field set to 0 on mem_accounts', async () => {
					return expect(accountRow.mem_accounts.multimin).to.eql(0);
				});

				it('should have multilifetime field set to 0 on mem_accounts', async () => {
					return expect(accountRow.mem_accounts.multilifetime).to.eql(0);
				});
			});

			describe('sender account', () => {
				let account;

				before('get multisignature account', done => {
					library.logic.account.get(
						{ address: multisigAccount.address },
						(err, res) => {
							expect(err).to.be.null;
							account = res;
							done();
						}
					);
				});

				it('should set multisignatures field to null on account', async () => {
					return expect(account.membersPublicKeys).to.be.null;
				});

				it('should set multimin field to 0 on account', async () => {
					return expect(account.multiMin).to.eql(0);
				});

				it('should set multilifetime field to 0 on account', async () => {
					return expect(account.multiLifetime).to.eql(0);
				});
			});
		});
	});
});
