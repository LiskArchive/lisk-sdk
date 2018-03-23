/* eslint-disable mocha/no-skipped-tests */
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
const expect = require('chai').expect;
const lisk = require('lisk-js').default;
const accountFixtures = require('../../../../fixtures/accounts');
const randomUtil = require('../../../../common/utils/random');
const localCommon = require('../../common');
const genesisBlock = require('../../../../data/genesis_block.json');

describe('system test (blocks) - chain/applyBlock', () => {
	const transferAmount = 100000000 * 100;
	let library;
	let db;

	localCommon.beforeBlock('system_blocks_chain_apply_block', lib => {
		library = lib;
		db = library.db;
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
				library.modules.blocks.lastBlock.set(genesisBlock);
				done();
			})
			.catch(err => {
				__testContext.debug(err.stack);
				done();
			});
	});

	let blockAccount1;
	let blockAccount2;
	let poolAccount3;
	let poolAccount4;

	beforeEach('send funds to accounts', done => {
		blockAccount1 = randomUtil.account();
		blockAccount2 = randomUtil.account();
		poolAccount3 = randomUtil.account();
		poolAccount4 = randomUtil.account();

		const fundTrsForAccount1 = lisk.transaction.transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.password,
			recipientId: blockAccount1.address,
		});

		const fundTrsForAccount2 = lisk.transaction.transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.password,
			recipientId: blockAccount2.address,
		});

		const fundTrsForAccount3 = lisk.transaction.transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.password,
			recipientId: poolAccount3.address,
		});

		const fundTrsForAccount4 = lisk.transaction.transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.password,
			recipientId: poolAccount4.address,
		});

		localCommon.addTransactionsAndForge(
			library,
			[
				fundTrsForAccount1,
				fundTrsForAccount2,
				fundTrsForAccount3,
				fundTrsForAccount4,
			],
			err => {
				expect(err).to.not.exist;
				done();
			}
		);
	});

	describe('applyBlock', () => {
		let block;
		let blockTransaction1;
		let blockTransaction2;

		beforeEach('create block', done => {
			blockTransaction1 = lisk.transaction.registerDelegate({
				passphrase: blockAccount1.password,
				username: blockAccount1.username,
			});
			blockTransaction1.amount = parseInt(blockTransaction1.amount);
			blockTransaction1.fee = parseInt(blockTransaction1.fee);
			blockTransaction2 = lisk.transaction.registerDelegate({
				passphrase: blockAccount2.password,
				username: blockAccount2.username,
			});
			blockTransaction2.amount = parseInt(blockTransaction2.amount);
			blockTransaction2.fee = parseInt(blockTransaction2.fee);
			blockTransaction1.senderId = blockAccount1.address;
			blockTransaction2.senderId = blockAccount2.address;
			localCommon.createValidBlock(
				library,
				[blockTransaction1, blockTransaction2],
				(err, b) => {
					block = b;
					done(err);
				}
			);
		});

		describe('undoUnconfirmedList', () => {
			let transaction3;
			let transaction4;

			beforeEach('with transactions in unconfirmed queue', done => {
				transaction3 = lisk.transaction.registerSecondPassphrase({
					passphrase: poolAccount3.password,
					secondPassphrase: poolAccount3.secondPassword,
				});

				transaction4 = lisk.transaction.registerSecondPassphrase({
					passphrase: poolAccount4.password,
					secondPassphrase: poolAccount4.secondPassword,
				});

				transaction3.senderId = poolAccount3.address;
				transaction4.senderId = poolAccount4.address;

				async.map(
					[transaction3, transaction4],
					(transaction, eachCb) => {
						localCommon.addTransaction(library, transaction, err => {
							expect(err).to.not.exist;
							eachCb();
						});
					},
					err => {
						expect(err).to.not.exist;
						localCommon.fillPool(library, done);
					}
				);
			});

			it('should have transactions from pool in unconfirmed state', done => {
				async.forEach(
					[poolAccount3, poolAccount4],
					(account, eachCb) => {
						localCommon
							.getAccountFromDb(library, account.address)
							.then(accountRow => {
								expect(1).to.equal(accountRow.mem_accounts.u_secondSignature);
								eachCb();
							});
					},
					done
				);
			});

			describe('after applying a new block', () => {
				beforeEach(done => {
					library.modules.blocks.chain.applyBlock(block, true, done);
				});

				it('should undo unconfirmed transactions', done => {
					async.forEach(
						[poolAccount3, poolAccount4],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(0).to.equal(accountRow.mem_accounts.u_secondSignature);
									eachCb();
								});
						},
						done
					);
				});
			});
		});

		describe('applyUnconfirmedStep', () => {
			describe('after applying new block fails on applyUnconfirmedStep', () => {
				beforeEach(done => {
					// Making block invalid
					block.transactions[0].asset.delegate.username =
						block.transactions[1].asset.delegate.username;
					library.modules.blocks.chain.applyBlock(block, true, () => done());
				});

				it('should have pooled transactions in queued state', done => {
					async.forEach(
						[poolAccount3, poolAccount4],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(0).to.equal(accountRow.mem_accounts.u_secondSignature);
									eachCb();
								});
						},
						done
					);
				});

				it('should not applyUnconfirmedStep on block transactions', done => {
					async.forEach(
						[blockAccount1, blockAccount2],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(accountRow.mem_accounts.u_username).to.eql(null);
									expect(accountRow.mem_accounts.u_isDelegate).to.equal(0);
									eachCb();
								});
						},
						done
					);
				});
			});

			describe('after applying new block passes', () => {
				beforeEach(done => {
					library.modules.blocks.chain.applyBlock(block, true, done);
				});

				it('should applyUnconfirmedStep for block transactions', done => {
					async.forEach(
						[blockAccount1, blockAccount2],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(accountRow.mem_accounts.u_username).to.equal(
										account.username
									);
									expect(accountRow.mem_accounts.u_isDelegate).to.equal(1);
									eachCb();
								});
						},
						done
					);
				});
			});
		});

		describe('applyConfirmedStep', () => {
			const randomUsername = randomUtil.username();
			describe('after applying new block fails', () => {
				beforeEach(done => {
					// Making mem_account invalid
					library.logic.account.set(
						blockAccount1.address,
						{
							isDelegate: 1,
							username: randomUsername,
							publicKey: blockTransaction1.senderPublicKey,
						},
						err => {
							expect(err).to.not.exist;
							library.modules.blocks.chain.applyBlock(block, true, () =>
								done()
							);
						}
					);
				});

				it('should have pooled transactions in queued state', done => {
					async.forEach(
						[poolAccount3, poolAccount4],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(0).to.equal(accountRow.mem_accounts.u_secondSignature);
									eachCb();
								});
						},
						done
					);
				});

				// Should be unskipped once transaction
				it.skip('should revert applyconfirmedStep on block transactions', done => {
					async.forEach(
						[blockAccount1, blockAccount2],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									// the transaction will fail, so we will have the username, isDelegate we initially set
									if (account == blockAccount1) {
										expect(accountRow.mem_accounts.username).to.equal(
											randomUsername
										);
										expect(accountRow.mem_accounts.isDelegate).to.equal(1);
									}

									if (account == blockAccount2) {
										expect(accountRow.mem_accounts.username).to.eql(null);
										expect(accountRow.mem_accounts.isDelegate).to.equal(0);
									}

									expect(accountRow.mem_accounts.u_username).to.equal(null);
									expect(accountRow.mem_accounts.u_isDelegate).to.equal(0);
									eachCb();
								});
						},
						done
					);
				});
			});

			describe('after applying a new block', () => {
				beforeEach(done => {
					library.modules.blocks.chain.applyBlock(block, true, done);
				});

				it('should applyConfirmedStep', done => {
					async.forEach(
						[blockAccount1, blockAccount2],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(accountRow.mem_accounts.username).to.equal(
										account.username
									);
									expect(accountRow.mem_accounts.isDelegate).to.equal(1);
									eachCb();
								});
						},
						done
					);
				});
			});
		});

		describe('saveBlockStep', () => {
			describe('after applying new block fails', () => {
				let blockId;
				beforeEach(done => {
					blockId = block.id;
					// Make block invalid
					block.id = null;
					library.modules.blocks.chain.applyBlock(block, true, () => done());
				});

				it('should have pooled transactions in queued state', done => {
					async.forEach(
						[poolAccount3, poolAccount4],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(0).to.equal(accountRow.mem_accounts.u_secondSignature);
									eachCb();
								});
						},
						done
					);
				});

				it('should not save block in the blocks table', done => {
					localCommon.getBlocks(library, (err, ids) => {
						expect(ids).to.not.include(blockId);
						return done();
					});
				});

				it('should not save transactions in the trs table', done => {
					async.forEach(
						[blockTransaction1, blockTransaction2],
						(transaction, eachCb) => {
							const filter = {
								id: transaction.id,
							};
							localCommon.getTransactionFromModule(
								library,
								filter,
								(err, res) => {
									expect(err).to.be.null;
									expect(res)
										.to.have.property('transactions')
										.which.is.an('Array')
										.to.have.length(0);
									eachCb();
								}
							);
						},
						done
					);
				});
			});

			describe('after applying a new block', () => {
				beforeEach(done => {
					library.modules.blocks.chain.applyBlock(block, true, done);
				});

				it('should save block in the blocks table', done => {
					localCommon.getBlocks(library, (err, ids) => {
						expect(ids).to.include(block.id);
						return done();
					});
				});

				it('should save transactions in the trs table', done => {
					async.forEach(
						[blockTransaction1, blockTransaction2],
						(transaction, eachCb) => {
							const filter = {
								id: transaction.id,
							};
							localCommon.getTransactionFromModule(
								library,
								filter,
								(err, res) => {
									expect(err).to.be.null;
									expect(res)
										.to.have.property('transactions')
										.which.is.an('Array');
									expect(res.transactions[0].id).to.equal(transaction.id);
									eachCb();
								}
							);
						},
						done
					);
				});
			});
		});
	});
});
