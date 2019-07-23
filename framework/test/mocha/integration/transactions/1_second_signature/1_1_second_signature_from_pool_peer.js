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
	registerSecondPassphrase,
} = require('@liskhq/lisk-transactions');
const expect = require('chai').expect;
const accountFixtures = require('../../../fixtures/accounts');
const localCommon = require('../../common');
const randomUtil = require('../../../common/utils/random');

const { NORMALIZER } = global.__testContext.config;
// eslint-disable-next-line
describe('integration test (type 1) - second signature transactions from pool and peer', () => {
	let library;
	let storage;

	localCommon.beforeBlock('1_1_second_sign_from_pool_and_peer', lib => {
		library = lib;
		storage = lib.components.storage;
	});

	afterEach(done => {
		storage.entities.Block.begin(t => {
			return t.batch([
				storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
				storage.adapter.db.none('DELETE FROM forks_stat;'),
			]);
		}).then(() => {
			library.modules.blocks.lastBlock.set(__testContext.config.genesisBlock);
			done();
		});
	});

	describe('with funds inside account', () => {
		let signatureAccount;

		beforeEach('send funds to signature account', done => {
			signatureAccount = randomUtil.account();
			const sendTransaction = transfer({
				amount: (1000 * NORMALIZER).toString(),
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: signatureAccount.address,
			});
			localCommon.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('with signature transaction in unconfirmed state', () => {
			let signatureTransaction;

			beforeEach(done => {
				signatureTransaction = registerSecondPassphrase({
					passphrase: signatureAccount.passphrase,
					secondPassphrase: signatureAccount.secondPassphrase,
				});
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
					signatureTransaction2 = registerSecondPassphrase({
						passphrase: signatureAccount.passphrase,
						secondPassphrase: randomUtil.password(),
					});
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
			});

			describe('when receiving block with multiple signature transaction with different id for same account', () => {
				let signatureTransaction3;
				let signatureTransaction4;
				let blockId;

				beforeEach(done => {
					signatureTransaction3 = registerSecondPassphrase({
						passphrase: signatureAccount.passphrase,
						secondPassphrase: randomUtil.password(),
					});

					signatureTransaction4 = registerSecondPassphrase({
						passphrase: signatureAccount.passphrase,
						secondPassphrase: randomUtil.password(),
					});
					localCommon.createValidBlock(
						library,
						[signatureTransaction3, signatureTransaction4],
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
