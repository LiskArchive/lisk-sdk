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

/* eslint-disable mocha/no-skipped-tests */
const lisk = require('lisk-elements').default;
const expect = require('chai').expect;
const accountFixtures = require('../../../fixtures/accounts');
const localCommon = require('../../common.js');
const randomUtil = require('../../../common/utils/random');
const Bignum = require('../../../../helpers/bignum.js');

const { NORMALIZER } = global.constants;

describe('system test (type 1) - second signature transactions from pool and peer', () => {
	let library;
	let db;

	localCommon.beforeBlock('system_1_1_second_sign_from_pool_and_peer', lib => {
		library = lib;
		db = lib.db;
	});

	afterEach(done => {
		db
			.task(t => {
				return t.batch([
					db.none('DELETE FROM blocks WHERE "height" > 1;'),
					db.none('DELETE FROM forks_stat;'),
				]);
			})
			.then(() => {
				library.modules.blocks.lastBlock.set(__testContext.config.genesisBlock);
				done();
			});
	});

	describe('with funds inside account', () => {
		let signatureAccount;

		beforeEach('send funds to signature account', done => {
			signatureAccount = randomUtil.account();
			const sendTransaction = lisk.transaction.transfer({
				amount: 1000 * NORMALIZER,
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: signatureAccount.address,
			});
			sendTransaction.amount = new Bignum(sendTransaction.amount);
			sendTransaction.fee = new Bignum(sendTransaction.fee);
			localCommon.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('with signature transaction in unconfirmed state', () => {
			let signatureTransaction;

			beforeEach(done => {
				signatureTransaction = lisk.transaction.registerSecondPassphrase({
					passphrase: signatureAccount.passphrase,
					secondPassphrase: signatureAccount.secondPassphrase,
				});
				signatureTransaction.amount = new Bignum(signatureTransaction.amount);
				signatureTransaction.fee = new Bignum(signatureTransaction.fee);
				localCommon.addTransactionToUnconfirmedQueue(
					library,
					signatureTransaction,
					done
				);
			});

			describe('when receiving block with same transaction', () => {
				beforeEach(done => {
					localCommon.createValidBlock(
						library,
						[signatureTransaction],
						(err, block) => {
							expect(err).to.not.exist;

							library.modules.blocks.process.onReceiveBlock(block);
							done();
						}
					);
				});

				describe('unconfirmed state', () => {
					it('should update unconfirmed columns related to signature', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, signatureAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.u_secondSignature).to.equal(1);
									seqCb();
									done();
								});
						});
					});
				});

				describe('confirmed state', () => {
					it('should update confirmed columns related to signature', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, signatureAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.secondSignature).to.equal(1);
									expect(
										account.mem_accounts.secondPublicKey.toString('hex')
									).to.equal(signatureTransaction.asset.signature.publicKey);
									seqCb();
									done();
								});
						});
					});
				});
			});

			describe('when receiving block with signature transaction with different id', () => {
				let signatureTransaction2;

				beforeEach(done => {
					signatureTransaction2 = lisk.transaction.registerSecondPassphrase({
						passphrase: signatureAccount.passphrase,
						secondPassphrase: randomUtil.password(),
					});
					signatureTransaction2.senderId = signatureAccount.address;
					signatureTransaction2.amount = new Bignum(
						signatureTransaction2.amount
					);
					signatureTransaction2.fee = new Bignum(signatureTransaction2.fee);
					localCommon.createValidBlock(
						library,
						[signatureTransaction2],
						(err, block) => {
							expect(err).to.not.exist;
							library.modules.blocks.process.onReceiveBlock(block);
							done();
						}
					);
				});

				describe('unconfirmed state', () => {
					it('should update unconfirmed columns related to signature', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, signatureAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.u_secondSignature).to.equal(1);
									seqCb();
									done();
								});
						});
					});
				});

				describe('confirmed state', () => {
					it('should update confirmed columns related to signature', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, signatureAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.secondSignature).to.equal(1);
									expect(
										account.mem_accounts.secondPublicKey.toString('hex')
									).to.equal(signatureTransaction2.asset.signature.publicKey);
									seqCb();
									done();
								});
						});
					});
				});

				// TODO: This tests will be unskipped as part of #1652
				describe.skip('when receiving block with multiple signature transaction with different id for same account', () => {
					let signatureTransaction2;
					let signatureTransaction3;
					let blockId;

					beforeEach(done => {
						signatureTransaction2 = lisk.transaction.registerSecondPassphrase({
							passphrase: signatureAccount.passphrase,
							secondPassphrase: randomUtil.password(),
						});
						signatureTransaction2.senderId = signatureAccount.address;

						signatureTransaction3 = lisk.transaction.registerSecondPassphrase({
							passphrase: signatureAccount.passphrase,
							secondPassphrase: randomUtil.password(),
						});
						signatureTransaction3.senderId = signatureAccount.address;
						localCommon.createValidBlock(
							library,
							[signatureTransaction2, signatureTransaction3],
							(err, block) => {
								blockId = block.id;
								expect(err).to.not.exist;
								library.modules.blocks.process.onReceiveBlock(block);
								done();
							}
						);
					});

					describe('should reject block', () => {
						it('should not save block to the database', done => {
							localCommon.getBlocks(library, (err, ids) => {
								expect(ids).to.not.include(blockId);
								expect(ids).to.have.length(2);
								done();
							});
						});
					});

					describe('unconfirmed state', () => {
						it('should not update unconfirmed columns related to signature', done => {
							library.sequence.add(seqCb => {
								localCommon
									.getAccountFromDb(library, signatureAccount.address)
									.then(account => {
										expect(account).to.exist;
										expect(account.mem_accounts.u_secondSignature).to.equal(0);
										seqCb();
										done();
									});
							});
						});
					});

					describe('confirmed state', () => {
						it('should not update confirmed columns related to signature', done => {
							library.sequence.add(seqCb => {
								localCommon
									.getAccountFromDb(library, signatureAccount.address)
									.then(account => {
										expect(account).to.exist;
										expect(account.mem_accounts.secondSignature).to.equal(0);
										expect(account.mem_accounts.secondPublicKey).to.equal(null);
										seqCb();
										done();
									});
							});
						});
					});
				});
			});
		});
	});
});
