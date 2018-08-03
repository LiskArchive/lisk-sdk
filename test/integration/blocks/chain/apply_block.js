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
const lisk = require('lisk-elements').default;
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

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
				library.modules.blocks.lastBlock.set(__testContext.config.genesisBlock);
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
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: blockAccount1.address,
		});

		const fundTrsForAccount2 = lisk.transaction.transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: blockAccount2.address,
		});

		const fundTrsForAccount3 = lisk.transaction.transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: poolAccount3.address,
		});

		const fundTrsForAccount4 = lisk.transaction.transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.passphrase,
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
				passphrase: blockAccount1.passphrase,
				username: blockAccount1.username,
			});
			blockTransaction2 = lisk.transaction.registerDelegate({
				passphrase: blockAccount2.passphrase,
				username: blockAccount2.username,
			});
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
					passphrase: poolAccount3.passphrase,
					secondPassphrase: poolAccount3.secondPassphrase,
				});

				transaction4 = lisk.transaction.registerSecondPassphrase({
					passphrase: poolAccount4.passphrase,
					secondPassphrase: poolAccount4.secondPassphrase,
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

				it('should revert applyconfirmedStep on block transactions', done => {
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

		describe('saveBlock', () => {
			describe('when block contains invalid transaction - timestamp out of postgres integer range', () => {
				const block = {
					blockSignature:
						'56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
					generatorPublicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					numberOfTransactions: 2,
					payloadHash:
						'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
					payloadLength: 494,
					previousBlock: __testContext.config.genesisBlock.id,
					height: 2,
					reward: 0,
					timestamp: 32578370,
					totalAmount: 10000000000000000,
					totalFee: 0,
					transactions: [
						{
							type: 0,
							amount: 10000000000000000,
							fee: 0,
							timestamp: -3704634000,
							recipientId: '16313739661670634666L',
							senderId: '1085993630748340485L',
							senderPublicKey:
								'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
							signature:
								'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
							id: '1465651642158264048',
						},
					],
					version: 0,
					id: '884740302254229983',
				};

				it('should call a callback with proper error', done => {
					library.modules.blocks.chain.saveBlock(block, err => {
						expect(err).to.eql('Blocks#saveBlock error');
						done();
					});
				});
			});

			describe('when block is invalid - previousBlockId not exists', () => {
				const block = {
					blockSignature:
						'56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
					generatorPublicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					numberOfTransactions: 2,
					payloadHash:
						'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
					payloadLength: 494,
					previousBlock: '123',
					height: 2,
					reward: 0,
					timestamp: 32578370,
					totalAmount: 10000000000000000,
					totalFee: 0,
					version: 0,
					id: '884740302254229983',
					transactions: [],
				};

				it('should call a callback with proper error', done => {
					library.modules.blocks.chain.saveBlock(block, err => {
						expect(err).to.eql('Blocks#saveBlock error');
						done();
					});
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
