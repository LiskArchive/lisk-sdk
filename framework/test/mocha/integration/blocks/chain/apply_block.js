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
const { transfer, registerDelegate } = require('@liskhq/lisk-transactions');
const {
	registeredTransactions,
} = require('../../../common/registered_transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../src/modules/chain/interface_adapters');

const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');
const blocksChainModule = require('../../../../../src/modules/chain/blocks/chain');

const interfaceAdapters = {
	transactions: new TransactionInterfaceAdapter(registeredTransactions),
};

describe('integration test (blocks) - chain/applyBlock', () => {
	const transferAmount = (100000000 * 100).toString();
	let library;
	let storage;

	localCommon.beforeBlock('blocks_chain_apply_block', lib => {
		library = lib;
		storage = library.components.storage;
	});

	afterEach(async () => {
		await storage.entities.Block.begin(t => {
			return t.batch([
				storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
				storage.adapter.db.none('DELETE FROM forks_stat;'),
			]);
		});
		library.modules.blocks._lastBlock = __testContext.config.genesisBlock;
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

		const fundTrsForAccount1 = transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: blockAccount1.address,
		});

		const fundTrsForAccount2 = transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: blockAccount2.address,
		});

		const fundTrsForAccount3 = transfer({
			amount: transferAmount,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: poolAccount3.address,
		});

		const fundTrsForAccount4 = transfer({
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
			blockTransaction1 = registerDelegate({
				passphrase: blockAccount1.passphrase,
				username: blockAccount1.username,
			});
			blockTransaction2 = registerDelegate({
				passphrase: blockAccount2.passphrase,
				username: blockAccount2.username,
			});

			localCommon.createValidBlock(
				library,
				[blockTransaction1, blockTransaction2],
				(err, b) => {
					block = b;
					done(err);
				}
			);
		});

		describe('applyConfirmedStep', () => {
			const randomUsername = randomUtil.username();
			describe('after applying new block fails', () => {
				beforeEach(async () => {
					// Making mem_account invalid
					await storage.entities.Account.upsert(
						{ address: blockAccount1.address },
						{
							isDelegate: 1,
							username: randomUsername,
							address: blockAccount1.address,
							publicKey: blockTransaction1.senderPublicKey,
						}
					);
					try {
						await library.modules.blocks.blocksChain.applyBlock(block, true);
					} catch (error) {
						// this error is expected to happen
					}
				});

				it('should have pooled transactions in queued state', done => {
					async.forEach(
						[poolAccount3, poolAccount4],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(0).to.equal(accountRow.mem_accounts.secondSignature);
									eachCb();
								})
								.catch(err => eachCb(err));
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
									if (account === blockAccount1) {
										expect(accountRow.mem_accounts.username).to.equal(
											randomUsername
										);
										expect(accountRow.mem_accounts.isDelegate).to.equal(1);
									}

									if (account === blockAccount2) {
										expect(accountRow.mem_accounts.username).to.eql(null);
										expect(accountRow.mem_accounts.isDelegate).to.equal(0);
									}
									eachCb();
								});
						},
						done
					);
				});
			});

			describe('after applying a new block', () => {
				beforeEach(async () => {
					await library.modules.blocks.blocksChain.applyBlock(block, true);
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
			beforeEach(async () => {
				await storage.entities.Block.begin(t => {
					return t.batch([
						storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
						storage.adapter.db.none('DELETE FROM forks_stat;'),
					]);
				});
				library.modules.blocks._lastBlock = __testContext.config.genesisBlock;
			});

			describe('when block contains invalid transaction - timestamp out of postgres integer range', () => {
				const auxBlock = {
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
							amount: '10000000000000000',
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
					].map(transaction =>
						interfaceAdapters.transactions.fromJson(transaction)
					),
					version: 0,
					id: '884740302254229983',
				};

				it('should call a callback with proper error', async () => {
					try {
						await blocksChainModule.saveBlock(
							library.components.storage,
							auxBlock
						);
					} catch (error) {
						expect(error.message).to.equal('integer out of range');
					}
				});
			});

			describe('when block is invalid - previousBlockId not exists', () => {
				const auxBlock = {
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

				it('should call a callback with proper error', async () => {
					try {
						await blocksChainModule.saveBlock(
							library.components.storage,
							auxBlock
						);
					} catch (error) {
						expect(error.message).to.equal(
							'insert or update on table "blocks" violates foreign key constraint "blocks_previousBlock_fkey"'
						);
					}
				});
			});
		});

		describe('saveBlockStep', () => {
			describe('after applying new block fails', () => {
				let blockId;
				beforeEach(async () => {
					blockId = block.id;
					// Make block invalid
					block.id = null;
					try {
						await library.modules.blocks.blocksChain.applyBlock(block, true);
					} catch (error) {
						// this error is expected
					}
				});

				it('should have pooled transactions in queued state', done => {
					async.forEach(
						[poolAccount3, poolAccount4],
						(account, eachCb) => {
							localCommon
								.getAccountFromDb(library, account.address)
								.then(accountRow => {
									expect(0).to.equal(accountRow.mem_accounts.secondSignature);
									eachCb();
								})
								.catch(err => eachCb(err));
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
				beforeEach(async () => {
					await library.modules.blocks.blocksChain.applyBlock(block, true);
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
