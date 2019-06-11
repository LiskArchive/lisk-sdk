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

const expect = require('chai').expect;
const {
	transfer,
	registerSecondPassphrase,
	registerDelegate,
	castVotes,
	registerMultisignature,
	createDapp,
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

// FIXME: this function was used from transactions library, but it doesn't exist
const transferIntoDapp = () => {};
const transferOutOfDapp = () => {};

describe('integration test (blocks) - chain/deleteLastBlock', () => {
	let library;
	localCommon.beforeBlock('blocks_chain', lib => {
		library = lib;
	});

	describe('deleteLastBlock', () => {
		describe('errors', () => {
			it('should fail when trying to delete genesis block', async () => {
				try {
					await library.modules.blocks.blocksChain.deleteLastBlock(
						library.modules.blocks.lastBlock
					);
				} catch (err) {
					expect(err.message).to.equal('Cannot delete genesis block');
				}
			});
		});

		describe('single transaction scenarios: create transaction, forge, delete block, forge again', () => {
			let testAccount;
			let testAccountData;
			let testAccountDataAfterBlock;
			let testReceipt;
			let testReceiptData;

			function createAccountWithFunds(done) {
				testAccount = randomUtil.account();
				const sendTransaction = transfer({
					amount: (100000000 * 100).toString(),
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: testAccount.address,
				});
				localCommon.addTransactionsAndForge(library, [sendTransaction], done);
			}

			describe('(type 0) transfer funds', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender after account creation', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
				});

				it('should create a transaction and forge a block', done => {
					testReceipt = randomUtil.account();
					const transferTransaction = transfer({
						amount: '100000000',
						passphrase: testAccount.passphrase,
						recipientId: testReceipt.address,
					});
					localCommon.addTransactionsAndForge(
						library,
						[transferTransaction],
						done
					);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
				});

				it('should get account data from receipt that is a virgin (not have publicKey assigned)', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testReceipt.address }
					);
					testReceiptData = account;
					expect(account.publicKey).to.be.null;
				});

				it('should delete last block', async () => {
					const transactions = library.modules.blocks.lastBlock.transactions;
					const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
						library.modules.blocks.lastBlock
					);
					library.modules.blocks._lastBlock = newLastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse()
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender after deleting the last block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					expect(account.balance).to.equal(testAccountData.balance);
				});

				it('should get account data from receipt that has a zero balance', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testReceipt.address }
					);
					expect(account.balance).to.equal('0');
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey
					);
				});

				it('should get account data from receipt that has a balance', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testReceipt.address }
					);
					expect(account.balance).to.equal(testReceiptData.balance);
				});
			});

			describe('(type 1) register second signature', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
					expect(account.secondPublicKey).to.be.null;
					expect(account.secondSignature).to.equal(false);
				});

				it('should forge a block', done => {
					const signatureTransaction = registerSecondPassphrase({
						passphrase: testAccount.passphrase,
						secondPassphrase: testAccount.secondPassphrase,
					});
					localCommon.addTransactionsAndForge(
						library,
						[signatureTransaction],
						done
					);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
					expect(account.secondPublicKey).to.not.be.null;
					expect(account.secondSignature).to.equal(true);
				});

				it('should delete last block', async () => {
					const transactions = library.modules.blocks.lastBlock.transactions;
					const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
						library.modules.blocks.lastBlock
					);
					library.modules.blocks._lastBlock = newLastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse()
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender after deleting the last block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					expect(account.balance).to.equal(testAccountData.balance);
					expect(account.secondPublicKey).to.be.null;
					expect(account.secondSignature).to.equal(false);
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey
					);
					expect(account.secondPublicKey).to.equal(
						testAccountDataAfterBlock.secondPublicKey
					);
					expect(account.secondSignature).to.equal(true);
				});
			});

			describe('(type 2) register delegate', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
					expect(account.isDelegate).to.equal(false);
					expect(account.username).to.be.null;
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rank).to.be.null;
					expect(account.rewards).to.equal('0');
					expect(account.vote).to.equal('0');
				});

				it('should forge a block', done => {
					const delegateTransaction = registerDelegate({
						passphrase: testAccount.passphrase,
						username: testAccount.username,
					});
					localCommon.addTransactionsAndForge(
						library,
						[delegateTransaction],
						done
					);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
					expect(account.isDelegate).to.equal(true);
					expect(account.username).to.be.equal(testAccount.username);
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rank).to.equal(null);
					expect(account.rewards).to.equal('0');
					expect(account.vote).to.equal('0');
				});

				it('should delete last block', async () => {
					const transactions = library.modules.blocks.lastBlock.transactions;
					const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
						library.modules.blocks.lastBlock
					);
					library.modules.blocks._lastBlock = newLastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse()
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender after delete the last block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					expect(account.balance).to.equal(testAccountData.balance);
					expect(account.isDelegate).to.equal(false);
					expect(account.username).to.be.null;
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rank).to.be.null;
					expect(account.rewards).to.equal('0');
					expect(account.vote).to.equal('0');
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address }
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey
					);
					expect(account.isDelegate).to.equal(true);
					expect(account.username).to.be.equal(
						testAccountDataAfterBlock.username
					);
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rank).to.equal(null);
					expect(account.rewards).to.equal('0');
					expect(account.vote).to.equal('0');
				});
			});

			describe('(type 3) votes', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender after account creation', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
					expect(account.votedDelegatesPublicKeys).to.be.null;
				});

				it('should forge a block', done => {
					const voteTransaction = castVotes({
						passphrase: testAccount.passphrase,
						votes: [accountFixtures.existingDelegate.publicKey],
					});
					localCommon.addTransactionsAndForge(library, [voteTransaction], done);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
					expect(account.votedDelegatesPublicKeys[0]).to.equal(
						accountFixtures.existingDelegate.publicKey
					);
				});

				it('should delete last block', async () => {
					const transactions = library.modules.blocks.lastBlock.transactions;
					const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
						library.modules.blocks.lastBlock
					);
					library.modules.blocks._lastBlock = newLastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse()
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender after deleting the last block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					expect(account.balance).to.equal(testAccountData.balance);
					expect(account.votedDelegatesPublicKeys).to.be.null;
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey
					);
					expect(account.votedDelegatesPublicKeys[0]).to.equal(
						accountFixtures.existingDelegate.publicKey
					);
				});
			});

			describe('(type 4) register multisignature', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender after account creation', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
					expect(account.multiLifetime).to.equal(0);
					expect(account.multiMin).to.equal(0);
					expect(account.membersPublicKeys).to.be.null;
				});

				it('should forge a block', done => {
					const multisigTransaction = registerMultisignature({
						passphrase: testAccount.passphrase,
						keysgroup: [accountFixtures.existingDelegate.publicKey],
						lifetime: 1,
						minimum: 1,
					});
					const signature = transactionUtils.multiSignTransaction(
						multisigTransaction,
						accountFixtures.existingDelegate.passphrase
					);
					multisigTransaction.signatures = [signature];
					multisigTransaction.ready = true;

					localCommon.addTransactionsAndForge(
						library,
						[multisigTransaction],
						done
					);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
					expect(account.multiLifetime).to.equal(1);
					expect(account.multiMin).to.equal(1);
					expect(account.membersPublicKeys[0]).to.equal(
						accountFixtures.existingDelegate.publicKey
					);
				});

				it('should delete last block', async () => {
					const transactions = library.modules.blocks.lastBlock.transactions;
					const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
						library.modules.blocks.lastBlock
					);
					library.modules.blocks._lastBlock = newLastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse()
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					expect(account.balance).to.equal(testAccountData.balance);
					expect(account.multiLifetime).to.equal(0);
					expect(account.multiMin).to.equal(0);
					expect(account.membersPublicKeys).to.be.null;
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				// This test will only start working after we remove the fillPool mechanism from the application
				// eslint-disable-next-line mocha/no-skipped-tests
				it.skip('[UNCONFIRMED STATE REMOVAL] should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true }
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey
					);
					expect(account.multiLifetime).to.equal(1);
					expect(account.multiMin).to.equal(1);
					expect(account.membersPublicKeys[0]).to.equal(
						accountFixtures.existingDelegate.publicKey
					);
				});
			});

			describe('dapps', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				/* eslint-disable mocha/no-skipped-tests */
				describe.skip('(type 5) register dapp', () => {
					it('should validate account data from sender after account creation', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						testAccountData = account;
						expect(account.publicKey).to.be.null;
					});

					it('should forge a block', done => {
						const dappTransaction = createDapp({
							passphrase: testAccount.passphrase,
							options: randomUtil.guestbookDapp,
						});
						randomUtil.guestbookDapp.id = dappTransaction.id;
						localCommon.addTransactionsAndForge(
							library,
							[dappTransaction],
							done
						);
					});

					it('should validate account data from sender after forging a block', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						testAccountDataAfterBlock = account;
						expect(account.publicKey).to.not.be.null;
					});

					it('should delete last block', async () => {
						const transactions = library.modules.blocks.lastBlock.transactions;
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
						library.modules.transactionPool.onDeletedTransactions(
							transactions.reverse()
						);
						expect(newLastBlock).to.be.an('object');
					});

					it('should validate account data from sender after deleting the last block', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						expect(account.balance).to.equal(testAccountData.balance);
					});

					it('should forge a block with transaction pool', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender after forging a block with transaction pool', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
						expect(account.publicKey).to.equal(
							testAccountDataAfterBlock.publicKey
						);
					});
				});

				/* eslint-disable mocha/no-skipped-tests */
				describe.skip('(type 6) inTransfer dapp', () => {
					it('should validate account data from sender after account creation', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						testAccountData = account;
						expect(account.publicKey).to.be.null;
					});

					it('should forge a block', done => {
						const inTransferTransaction = transferIntoDapp({
							passphrase: testAccount.passphrase,
							amount: (10 * 100000000).toString(),
							dappId: randomUtil.guestbookDapp.id,
						});
						localCommon.addTransactionsAndForge(
							library,
							[inTransferTransaction],
							done
						);
					});

					it('should validate account data from sender after forging a block', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						testAccountDataAfterBlock = account;
						expect(account.publicKey).to.not.be.null;
					});

					it('should delete last block', async () => {
						const transactions = library.modules.blocks.lastBlock.transactions;
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
						library.modules.transactionPool.onDeletedTransactions(
							transactions.reverse()
						);
						expect(newLastBlock).to.be.an('object');
					});

					it('should validate account data from sender after deleting the last block', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						expect(account.balance).to.equal(testAccountData.balance);
					});

					it('should forge a block with transaction pool', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender after forging a block with transaction pool', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
						expect(account.publicKey).to.equal(
							testAccountDataAfterBlock.publicKey
						);
					});
				});

				describe.skip('(type 7) outTransfer dapp', () => {
					it('should validate account data from sender after account creation', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						testAccountData = account;
						expect(account.publicKey).to.be.null;
					});

					it('should forge a block', done => {
						const outTransferTransaction = transferOutOfDapp({
							passphrase: testAccount.passphrase,
							amount: (10 * 100000000).toString(),
							dappId: randomUtil.guestbookDapp.id,
							transactionId: randomUtil.transaction().id,
							recipientId: accountFixtures.genesis.address,
						});
						localCommon.addTransactionsAndForge(
							library,
							[outTransferTransaction],
							err => {
								expect(err).to.equal('Transaction type 7 is frozen');
								done();
							}
						);
					});

					it('should validate account data from sender after forging a block', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						testAccountDataAfterBlock = account;
						expect(account.publicKey).to.not.be.null;
					});

					it('should delete last block', async () => {
						const transactions = library.modules.blocks.lastBlock.transactions;
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
						library.modules.transactionPool.onDeletedTransactions(
							transactions.reverse()
						);
						expect(newLastBlock).to.be.an('object');
					});

					it('should validate account data from sender after deleting the last block', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						expect(account.balance).to.equal(testAccountData.balance);
					});

					it('should forge a block with transaction pool', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender after forging a block with transaction pool', async () => {
						const account = await library.components.storage.entities.Account.getOne(
							{ address: testAccount.address }
						);
						expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
						expect(account.publicKey).to.equal(
							testAccountDataAfterBlock.publicKey
						);
					});
				});
				/* eslint-enable mocha/no-skipped-tests */
			});
		});

		describe('multiple transactions scenarios: create transactions, forge, delete block, forge again', () => {});
	});
});
