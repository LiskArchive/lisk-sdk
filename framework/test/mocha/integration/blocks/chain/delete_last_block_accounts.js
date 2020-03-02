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

const expect = require('chai').expect;
const {
	transfer,
	registerDelegate,
	castVotes,
	registerMultisignature,
	createSignatureObject,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../../fixtures/accounts');
const randomUtil = require('../../../../utils/random');
const localCommon = require('../../common');
const {
	getNetworkIdentifier,
} = require('../../../../utils/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

describe('integration test (blocks) - chain/deleteLastBlock', () => {
	let library;
	localCommon.beforeBlock('blocks_chain', lib => {
		library = lib;
		// Chain now emits events for block deletion/addition so we just over write emit here as this tests depends on the event not being fired
		library.modules.chain.events.emit = sinonSandbox.stub();
	});

	describe('deleteLastBlock', () => {
		describe('errors', () => {
			it('should fail when trying to delete genesis block', async () => {
				try {
					await library.modules.processor.deleteLastBlock();
				} catch (err) {
					expect(err.message).to.equal('Cannot undo genesis block');
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
					networkIdentifier,
					nonce: '0',
					fee: '10000000',
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
						{ address: testAccount.address },
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
				});

				it('should create a transaction and forge a block', done => {
					testReceipt = randomUtil.account();
					const transferTransaction = transfer({
						nonce: '0',
						fee: '10000000',
						networkIdentifier,
						amount: '100000000',
						passphrase: testAccount.passphrase,
						recipientId: testReceipt.address,
					});
					localCommon.addTransactionsAndForge(
						library,
						[transferTransaction],
						done,
					);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
				});

				it('should get account data from receipt that is a virgin (not have publicKey assigned)', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testReceipt.address },
					);
					testReceiptData = account;
					expect(account.publicKey).to.be.null;
				});

				it('should delete last block', async () => {
					const transactions = library.modules.chain.lastBlock.transactions;
					await library.modules.processor.deleteLastBlock();
					const newLastBlock = library.modules.chain.lastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse(),
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender after deleting the last block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
					);
					expect(account.balance).to.equal(testAccountData.balance);
				});

				it('should get account data from receipt that has a zero balance', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testReceipt.address },
					);
					expect(account.balance).to.equal('0');
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey,
					);
				});

				it('should get account data from receipt that has a balance', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testReceipt.address },
					);
					expect(account.balance).to.equal(testReceiptData.balance);
				});
			});

			describe('(type 2) register delegate', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
					expect(account.isDelegate).to.equal(false);
					expect(account.username).to.be.null;
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rewards).to.equal('0');
					expect(account.voteWeight).to.equal('0');
				});

				it('should forge a block', done => {
					const delegateTransaction = registerDelegate({
						networkIdentifier,
						nonce: '0',
						fee: '5000000000',
						passphrase: testAccount.passphrase,
						username: testAccount.username,
					});
					localCommon.addTransactionsAndForge(
						library,
						[delegateTransaction],
						done,
					);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
					expect(account.isDelegate).to.equal(true);
					expect(account.username).to.be.equal(testAccount.username);
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rewards).to.equal('0');
					expect(account.voteWeight).to.equal('0');
				});

				it('should delete last block', async () => {
					const transactions = library.modules.chain.lastBlock.transactions;
					await library.modules.processor.deleteLastBlock();
					const newLastBlock = library.modules.chain.lastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse(),
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender after delete the last block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
					);
					expect(account.balance).to.equal(testAccountData.balance);
					expect(account.isDelegate).to.equal(false);
					expect(account.username).to.be.null;
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rewards).to.equal('0');
					expect(account.voteWeight).to.equal('0');
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey,
					);
					expect(account.isDelegate).to.equal(true);
					expect(account.username).to.be.equal(
						testAccountDataAfterBlock.username,
					);
					expect(account.missedBlocks).to.equal(0);
					expect(account.producedBlocks).to.equal(0);
					expect(account.rewards).to.equal('0');
					expect(account.voteWeight).to.equal('0');
				});
			});

			describe('(type 3) votes', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender after account creation', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true },
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
					expect(account.votedDelegatesPublicKeys).eql(null);
				});

				it('should forge a block', done => {
					const voteTransaction = castVotes({
						networkIdentifier,
						nonce: '0',
						fee: '10000000',
						passphrase: testAccount.passphrase,
						votes: [accountFixtures.existingDelegate.publicKey],
					});
					localCommon.addTransactionsAndForge(library, [voteTransaction], done);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true },
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
					expect(account.votedDelegatesPublicKeys[0]).to.equal(
						accountFixtures.existingDelegate.publicKey,
					);
				});

				it('should delete last block', async () => {
					const transactions = library.modules.chain.lastBlock.transactions;
					await library.modules.processor.deleteLastBlock();
					const newLastBlock = library.modules.chain.lastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse(),
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender after deleting the last block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true },
					);
					expect(account.balance).to.equal(testAccountData.balance);
					expect(account.votedDelegatesPublicKeys).to.eql(null);
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true },
					);
					expect(account.balance).to.equal(testAccountDataAfterBlock.balance);
					expect(account.publicKey).to.equal(
						testAccountDataAfterBlock.publicKey,
					);
					expect(account.votedDelegatesPublicKeys[0]).to.equal(
						accountFixtures.existingDelegate.publicKey,
					);
				});
			});

			// TODO: Unskip this test while fixing registerMultisignature keysgroups issue.
			// eslint-disable-next-line mocha/no-skipped-tests
			describe.skip('(type 4) register multisignature', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
				});

				it('should validate account data from sender after account creation', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true },
					);
					testAccountData = account;
					expect(account.publicKey).to.be.null;
					expect(account.keys).eql({
						optionalKeys: [],
						mandatoryKeys: [],
						numberOfSignatures: 0,
					});
				});

				it('should forge a block', done => {
					const multisigTransaction = registerMultisignature({
						networkIdentifier,
						nonce: '0',
						fee: '10000000',
						passphrase: testAccount.passphrase,
						keysgroup: [accountFixtures.existingDelegate.publicKey],
						lifetime: 1,
						minimum: 1,
					});
					const signatureObject = createSignatureObject({
						networkIdentifier,
						transaction: multisigTransaction,
						passphrase: accountFixtures.existingDelegate.passphrase,
					});
					multisigTransaction.signatures = [signatureObject.signature];
					multisigTransaction.ready = true;

					localCommon.addTransactionsAndForge(
						library,
						[multisigTransaction],
						done,
					);
				});

				it('should validate account data from sender after forging a block', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true },
					);
					testAccountDataAfterBlock = account;
					expect(account.publicKey).to.not.be.null;
					expect(account.keys[0]).to.equal(
						accountFixtures.existingDelegate.publicKey,
					);
				});

				it('should delete last block', async () => {
					const transactions = library.modules.chain.lastBlock.transactions;
					await library.modules.processor.deleteLastBlock();
					const newLastBlock = library.modules.chain.lastBlock;
					library.modules.transactionPool.onDeletedTransactions(
						transactions.reverse(),
					);
					expect(newLastBlock).to.be.an('object');
				});

				it('should validate account data from sender', async () => {
					const account = await library.components.storage.entities.Account.getOne(
						{ address: testAccount.address },
						{ extended: true },
					);
					expect(account.balance).to.equal(testAccountData.balance);
					expect(account.keys).to.eql(null);
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});
			});
		});

		describe('multiple transactions scenarios: create transactions, forge, delete block, forge again', () => {});
	});
});
