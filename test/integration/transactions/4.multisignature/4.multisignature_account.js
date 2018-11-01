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
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('../../common');
const Bignum = require('../../../../helpers/bignum.js');

const { NORMALIZER } = global.constants;

describe('system test (type 4) - effect of multisignature registration on memory tables', () => {
	var library;
	var multisigSender;

	var multisigAccount = randomUtil.account();
	var multisigTransaction;
	var creditTransaction = lisk.transaction.transfer({
		amount: 1000 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: multisigAccount.address,
	});
	var signer1 = randomUtil.account();
	var signer2 = randomUtil.account();

	localCommon.beforeBlock('system_4_multisig_account', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [creditTransaction], () => {
			library.logic.account.get(
				{ address: multisigAccount.address },
				(err, sender) => {
					multisigSender = sender;
					done();
				}
			);
		});
	});

	describe('forge block with multisignature transaction', () => {
		before('forge block with multisignature transaction', done => {
			var keysgroup = [signer1.publicKey, signer2.publicKey];

			multisigTransaction = lisk.transaction.registerMultisignature({
				passphrase: multisigAccount.passphrase,
				keysgroup,
				lifetime: 4,
				minimum: 2,
			});
			var sign1 = lisk.transaction.utils.multiSignTransaction(
				multisigTransaction,
				signer1.passphrase
			);
			var sign2 = lisk.transaction.utils.multiSignTransaction(
				multisigTransaction,
				signer2.passphrase
			);

			multisigTransaction.signatures = [sign1, sign2];
			multisigTransaction.ready = true;
			localCommon.addTransactionsAndForge(library, [multisigTransaction], done);
		});

		describe('check sender db rows', () => {
			var accountRow;

			before(
				'get mem_account, mem_account2multisignature and mem_account2u_multisignature rows',
				() => {
					return localCommon
						.getAccountFromDb(library, multisigAccount.address)
						.then(res => {
							accountRow = res;
						});
				}
			);

			it('should include rows in mem_accounts2multisignatures', () => {
				var signKeysInDb = _.map(
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

			it('should set multimin field set on mem_accounts', () => {
				return expect(accountRow.mem_accounts.multimin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should set multilifetime field set on mem_accounts', () => {
				return expect(accountRow.mem_accounts.multilifetime).to.eql(
					multisigTransaction.asset.multisignature.lifetime
				);
			});

			it('should include rows in mem_accounts2u_multisignatures', () => {
				var signKeysInDb = _.map(
					accountRow.mem_accounts2u_multisignatures,
					row => {
						return row.dependentId;
					}
				);
				return expect(signKeysInDb).to.include(
					signer1.publicKey,
					signer2.publicKey
				);
			});

			it('should set u_multimin field set on mem_accounts', () => {
				return expect(accountRow.mem_accounts.u_multimin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should set u_multilifetime field set on mem_accounts', () => {
				return expect(accountRow.mem_accounts.u_multilifetime).to.eql(
					multisigTransaction.asset.multisignature.lifetime
				);
			});
		});

		describe('check sender account', () => {
			var account;

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

			it('should have multisignatures field set on account', () => {
				return expect(account.multisignatures).to.include(
					signer1.publicKey,
					signer2.publicKey
				);
			});

			it('should have multimin field set on account', () => {
				return expect(account.multimin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should have multilifetime field set on account', () => {
				return expect(account.multilifetime).to.eql(
					multisigTransaction.asset.multisignature.lifetime
				);
			});

			it('should have u_multisignatures field set on account', () => {
				return expect(account.u_multisignatures).to.include(
					signer1.publicKey,
					signer2.publicKey
				);
			});

			it('should have u_multimin field set on account', () => {
				return expect(account.u_multimin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should have u_multilifetime field set on account', () => {
				return expect(account.u_multilifetime).to.eql(
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
				var accountRow;

				before(
					'get mem_account, mem_account2multisignature and mem_account2u_multisignature rows',
					() => {
						return localCommon
							.getAccountFromDb(library, multisigAccount.address)
							.then(res => {
								accountRow = res;
							});
					}
				);

				it('should have no rows in mem_accounts2multisignatures', () => {
					return expect(accountRow.mem_accounts2multisignatures).to.eql([]);
				});

				it('should have multimin field set to 0 on mem_accounts', () => {
					return expect(accountRow.mem_accounts.multimin).to.eql(0);
				});

				it('should have multilifetime field set to 0 on mem_accounts', () => {
					return expect(accountRow.mem_accounts.multilifetime).to.eql(0);
				});

				it('should have no rows in mem_accounts2u_multisignatures', () => {
					return expect(accountRow.mem_accounts2u_multisignatures).to.eql([]);
				});

				it('should have u_multimin field set to 0 on mem_accounts', () => {
					return expect(accountRow.mem_accounts.u_multimin).to.eql(0);
				});

				it('should have multilifetime field to 0 on mem_accounts', () => {
					return expect(accountRow.mem_accounts.u_multilifetime).to.eql(0);
				});
			});

			describe('sender account', () => {
				var account;

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

				it('should set multisignatures field to null on account', () => {
					return expect(account.multisignatures).to.be.null;
				});

				it('should set multimin field to 0 on account', () => {
					return expect(account.multimin).to.eql(0);
				});

				it('should set multilifetime field to 0 on account', () => {
					return expect(account.multilifetime).to.eql(0);
				});

				it('should set u_multisignatures field to null on account', () => {
					return expect(account.u_multisignatures).to.be.null;
				});

				it('should set u_multimin field to null on account', () => {
					return expect(account.u_multimin).to.eql(0);
				});

				it('should set u_multilifetime field to null on account', () => {
					return expect(account.u_multilifetime).to.eql(0);
				});
			});
		});
	});

	describe('apply unconfirmed transaction', () => {
		before('apply unconfirmed multisig transaction', done => {
			var keysgroup = [signer1.publicKey, signer2.publicKey];
			multisigTransaction = lisk.transaction.registerMultisignature({
				passphrase: multisigAccount.passphrase,
				keysgroup,
				lifetime: 4,
				minimum: 2,
			});
			var sign1 = lisk.transaction.utils.multiSignTransaction(
				multisigTransaction,
				signer1.passphrase
			);
			var sign2 = lisk.transaction.utils.multiSignTransaction(
				multisigTransaction,
				signer2.passphrase
			);
			multisigTransaction.signatures = [sign1, sign2];
			multisigTransaction.ready = true;

			multisigTransaction.amount = new Bignum(multisigTransaction.amount);
			multisigTransaction.fee = new Bignum(multisigTransaction.fee);

			library.logic.transaction.applyUnconfirmed(
				multisigTransaction,
				multisigSender,
				done
			);
		});

		describe('check sender db rows', () => {
			var accountRow;

			before(
				'get mem_account, mem_account2multisignature and mem_account2u_multisignature rows',
				() => {
					return localCommon
						.getAccountFromDb(library, multisigAccount.address)
						.then(res => {
							accountRow = res;
						});
				}
			);

			it('should have no rows in mem_accounts2multisignatures', () => {
				return expect(accountRow.mem_accounts2multisignatures).to.eql([]);
			});

			it('should have multimin field set to 0 on mem_accounts', () => {
				return expect(accountRow.mem_accounts.multimin).to.eql(0);
			});

			it('should have multilifetime field set to 0 on mem_accounts', () => {
				return expect(accountRow.mem_accounts.multilifetime).to.eql(0);
			});

			it('should include rows in mem_accounts2u_multisignatures', () => {
				var signKeysInDb = _.map(
					accountRow.mem_accounts2u_multisignatures,
					row => {
						return row.dependentId;
					}
				);
				return expect(signKeysInDb).to.include(
					signer1.publicKey,
					signer2.publicKey
				);
			});

			it('should set u_multimin field set on mem_accounts', () => {
				return expect(accountRow.mem_accounts.u_multimin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should set u_multilifetime field set on mem_accounts', () => {
				return expect(accountRow.mem_accounts.u_multilifetime).to.eql(
					multisigTransaction.asset.multisignature.lifetime
				);
			});
		});

		describe('check sender account', () => {
			var account;

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

			it('should have u_multisignatures field set on account', () => {
				return expect(account.u_multisignatures).to.include(
					signer1.publicKey,
					signer2.publicKey
				);
			});

			it('should have multimin field set on account', () => {
				return expect(account.u_multimin).to.eql(
					multisigTransaction.asset.multisignature.min
				);
			});

			it('should have multilifetime field set on account', () => {
				return expect(account.u_multilifetime).to.eql(
					multisigTransaction.asset.multisignature.lifetime
				);
			});
		});

		describe('with another multisig transaction', () => {
			var multisigTransaction2;
			var signer3 = randomUtil.account();
			var signer4 = randomUtil.account();

			before('process multisignature transaction', done => {
				var keysgroup = [signer3.publicKey, signer4.publicKey];
				multisigTransaction2 = lisk.transaction.registerMultisignature({
					passphrase: multisigAccount.passphrase,
					keysgroup,
					lifetime: 4,
					minimum: 2,
				});
				multisigTransaction2.amount = new Bignum(multisigTransaction2.amount);
				multisigTransaction2.fee = new Bignum(multisigTransaction2.fee);
				var sign3 = lisk.transaction.utils.multiSignTransaction(
					multisigTransaction2,
					signer3.passphrase
				);
				var sign4 = lisk.transaction.utils.multiSignTransaction(
					multisigTransaction2,
					signer4.passphrase
				);
				multisigTransaction2.signatures = [sign3, sign4];
				library.logic.transaction.process(
					multisigTransaction2,
					multisigSender,
					null,
					done
				);
			});

			describe('from the same account', () => {
				before('get multisignature account', done => {
					library.logic.account.get(
						{ address: multisigAccount.address },
						(err, res) => {
							multisigSender = res;
							done();
						}
					);
				});

				it('should verify transaction', done => {
					library.logic.transaction.verify(
						multisigTransaction2,
						multisigSender,
						null,
						true,
						done
					);
				});
			});
		});
	});
});
