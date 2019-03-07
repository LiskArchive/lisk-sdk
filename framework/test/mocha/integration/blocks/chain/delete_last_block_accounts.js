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
const lisk = require('lisk-elements').default;
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

describe('system test (blocks) - chain/deleteLastBlock', () => {
	let library;
	localCommon.beforeBlock('system_blocks_chain', lib => {
		library = lib;
	});

	describe('deleteLastBlock', () => {
		describe('errors', () => {
			it('should fail when trying to delete genesis block', done => {
				library.modules.blocks.chain.deleteLastBlock((err, res) => {
					expect(err).to.equal('Cannot delete genesis block');
					expect(res).to.not.exist;
					done();
				});
			});
		});

		describe('single transaction scenarios: create transaction, forge, delete block, forge again', () => {
			let testAccount;
			let testAccountData;
			let testAccountDataAfterBlock;
			let testReceipt;
			let testReceiptData;
			let fieldsToCompare;

			function createAccountWithFunds(done) {
				testAccount = randomUtil.account();
				const sendTransaction = lisk.transaction.transfer({
					amount: 100000000 * 100,
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: testAccount.address,
				});
				localCommon.addTransactionsAndForge(library, [sendTransaction], done);
			}

			describe('(type 0) transfer funds', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = ['balance', 'publicKey'];
				});

				it('should validate account data from sender after account creation', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.publicKey).to.be.null;
							done();
						}
					);
				});

				it('should create a transaction and forge a block', done => {
					testReceipt = randomUtil.account();
					const transferTransaction = lisk.transaction.transfer({
						amount: 100000000,
						passphrase: testAccount.passphrase,
						recipientId: testReceipt.address,
					});
					localCommon.addTransactionsAndForge(
						library,
						[transferTransaction],
						done
					);
				});

				it('should validate account data from sender after forging a block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.publicKey).to.not.be.null;
							done();
						}
					);
				});

				it('should get account data from receipt that is a virgin (not have publicKey assigned)', done => {
					library.logic.account.get(
						{ address: testReceipt.address },
						fieldsToCompare,
						(err, res) => {
							testReceiptData = res;
							expect(res.publicKey).to.be.null;
							done();
						}
					);
				});

				it('should delete last block', done => {
					library.modules.blocks.chain.deleteLastBlock((err, res) => {
						expect(err).to.not.exist;
						expect(res).to.be.an('object');
						done();
					});
				});

				it('should validate account data from sender after deleting the last block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountData.balance);
							// CHECKME: publicKey should be null
							done();
						}
					);
				});

				it('should get account data from receipt that has a zero balance', done => {
					library.logic.account.get(
						{ address: testReceipt.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal('0');
							// FIXME: Maybe this address should not be inserted into mem_accounts
							done();
						}
					);
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							done();
						}
					);
				});

				it('should get account data from receipt that has a balance', done => {
					library.logic.account.get(
						{ address: testReceipt.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testReceiptData.balance);
							done();
						}
					);
				});
			});

			describe('(type 1) register second signature', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = [
						'balance',
						'publicKey',
						'secondPublicKey',
						'secondSignature',
					];
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.publicKey).to.be.null;
							expect(res.secondPublicKey).to.be.null;
							expect(res.secondSignature).to.equal(false);
							done();
						}
					);
				});

				it('should forge a block', done => {
					const signatureTransaction = lisk.transaction.registerSecondPassphrase(
						{
							passphrase: testAccount.passphrase,
							secondPassphrase: testAccount.secondPassphrase,
						}
					);
					localCommon.addTransactionsAndForge(
						library,
						[signatureTransaction],
						done
					);
				});

				it('should validate account data from sender after forging a block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.publicKey).to.not.be.null;
							expect(res.secondPublicKey).to.not.be.null;
							expect(res.secondSignature).to.equal(true);
							done();
						}
					);
				});

				it('should delete last block', done => {
					library.modules.blocks.chain.deleteLastBlock((err, res) => {
						expect(err).to.not.exist;
						expect(res).to.be.an('object');
						done();
					});
				});

				it('should validate account data from sender after deleting the last block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountData.balance);
							expect(res.secondPublicKey).to.be.null;
							expect(res.secondSignature).to.equal(false);
							// CHECKME: publicKey should be null
							done();
						}
					);
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							expect(res.secondPublicKey).to.equal(
								testAccountDataAfterBlock.secondPublicKey
							);
							expect(res.secondSignature).to.equal(true);
							done();
						}
					);
				});
			});

			describe('(type 2) register delegate', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = [
						'balance',
						'publicKey',
						'isDelegate',
						'username',
						'missedBlocks',
						'producedBlocks',
						'rank',
						'rewards',
						'vote',
					];
					// CHECKME: When are nameexist and u_nameexist used?
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.publicKey).to.be.null;
							expect(res.isDelegate).to.equal(false);
							expect(res.username).to.be.null;
							expect(res.missedBlocks).to.equal(0);
							expect(res.producedBlocks).to.equal(0);
							expect(res.rank).to.be.null;
							expect(res.rewards).to.equal('0');
							expect(res.vote).to.equal('0');
							done();
						}
					);
				});

				it('should forge a block', done => {
					const delegateTransaction = lisk.transaction.registerDelegate({
						passphrase: testAccount.passphrase,
						username: testAccount.username,
					});
					localCommon.addTransactionsAndForge(
						library,
						[delegateTransaction],
						done
					);
				});

				it('should validate account data from sender after forging a block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.publicKey).to.not.be.null;
							expect(res.isDelegate).to.equal(true);
							expect(res.username).to.be.equal(testAccount.username);
							expect(res.missedBlocks).to.equal(0);
							expect(res.producedBlocks).to.equal(0);
							expect(res.rank).to.equal(null);
							expect(res.rewards).to.equal('0');
							expect(res.vote).to.equal('0');
							done();
						}
					);
				});

				it('should delete last block', done => {
					library.modules.blocks.chain.deleteLastBlock((err, res) => {
						expect(err).to.not.exist;
						expect(res).to.be.an('object');
						done();
					});
				});

				it('should validate account data from sender after delete the last block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountData.balance);
							expect(res.isDelegate).to.equal(false);
							expect(res.username).to.be.null;
							expect(res.missedBlocks).to.equal(0);
							expect(res.producedBlocks).to.equal(0);
							expect(res.rank).to.be.null;
							expect(res.rewards).to.equal('0');
							expect(res.vote).to.equal('0');
							// CHECKME: publicKey should be null
							done();
						}
					);
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							expect(res.isDelegate).to.equal(true);
							expect(res.username).to.be.equal(
								testAccountDataAfterBlock.username
							);
							expect(res.missedBlocks).to.equal(0);
							expect(res.producedBlocks).to.equal(0);
							expect(res.rank).to.equal(null);
							expect(res.rewards).to.equal('0');
							expect(res.vote).to.equal('0');
							done();
						}
					);
				});
			});

			describe('(type 3) votes', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = [
						'balance',
						'publicKey',
						'votedDelegatesPublicKeys',
					];
				});

				it('should validate account data from sender after account creation', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.publicKey).to.be.null;
							expect(res.votedDelegatesPublicKeys).to.be.null;
							done();
						}
					);
				});

				it('should forge a block', done => {
					const voteTransaction = lisk.transaction.castVotes({
						passphrase: testAccount.passphrase,
						votes: [accountFixtures.existingDelegate.publicKey],
					});
					localCommon.addTransactionsAndForge(library, [voteTransaction], done);
				});

				it('should validate account data from sender after forging a block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.publicKey).to.not.be.null;
							expect(res.votedDelegatesPublicKeys[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							done();
						}
					);
				});

				it('should delete last block', done => {
					library.modules.blocks.chain.deleteLastBlock((err, res) => {
						expect(err).to.not.exist;
						expect(res).to.be.an('object');
						done();
					});
				});

				it('should validate account data from sender after deleting the last block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountData.balance);
							expect(res.votedDelegatesPublicKeys).to.be.null;
							// CHECKME: publicKey should be null
							done();
						}
					);
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender after forging a block with transaction pool', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							expect(res.votedDelegatesPublicKeys[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							done();
						}
					);
				});
			});

			describe('(type 4) register multisignature', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = [
						'balance',
						'publicKey',
						'multiLifetime',
						'multiMin',
						'membersPublicKeys',
					];
				});

				it('should validate account data from sender after account creation', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.publicKey).to.be.null;
							expect(res.multiLifetime).to.equal(0);
							expect(res.multiMin).to.equal(0);
							expect(res.membersPublicKeys).to.be.null;
							done();
						}
					);
				});

				it('should forge a block', done => {
					const multisigTransaction = lisk.transaction.registerMultisignature({
						passphrase: testAccount.passphrase,
						keysgroup: [accountFixtures.existingDelegate.publicKey],
						lifetime: 1,
						minimum: 1,
					});
					const signature = lisk.transaction.utils.multiSignTransaction(
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

				it('should validate account data from sender after forging a block', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.publicKey).to.not.be.null;
							expect(res.multiLifetime).to.equal(1);
							expect(res.multiMin).to.equal(1);
							expect(res.membersPublicKeys[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							done();
						}
					);
				});

				it('should delete last block', done => {
					library.modules.blocks.chain.deleteLastBlock((err, res) => {
						expect(err).to.not.exist;
						expect(res).to.be.an('object');
						done();
					});
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountData.balance);
							expect(res.multiLifetime).to.equal(0);
							expect(res.multiMin).to.equal(0);
							expect(res.membersPublicKeys).to.be.null;
							// CHECKME: publicKey should be null
							done();
						}
					);
				});

				it('should forge a block with transaction pool', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				// This test will only start working after we remove the fillPool mechanism from the application
				// eslint-disable-next-line mocha/no-skipped-tests
				it.skip('[feature/improve_transactions_processing_efficiency]should validate account data from sender after forging a block with transaction pool', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							expect(res.multiLifetime).to.equal(1);
							expect(res.multiMin).to.equal(1);
							expect(res.membersPublicKeys[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							done();
						}
					);
				});
			});

			describe('dapps', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = ['balance', 'publicKey'];
				});

				describe('(type 5) register dapp', () => {
					it('should validate account data from sender after account creation', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountData = res;
								expect(res.publicKey).to.be.null;
								done();
							}
						);
					});

					it('should forge a block', done => {
						const dappTransaction = lisk.transaction.createDapp({
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

					it('should validate account data from sender after forging a block', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountDataAfterBlock = res;
								expect(res.publicKey).to.not.be.null;
								done();
							}
						);
					});

					it('should delete last block', done => {
						library.modules.blocks.chain.deleteLastBlock((err, res) => {
							expect(err).to.not.exist;
							expect(res).to.be.an('object');
							done();
						});
					});

					it('should validate account data from sender after deleting the last block', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountData.balance);
								// CHECKME: publicKey should be null
								done();
							}
						);
					});

					it('should forge a block with transaction pool', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender after forging a block with transaction pool', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
								expect(res.publicKey).to.equal(
									testAccountDataAfterBlock.publicKey
								);
								done();
							}
						);
					});
				});

				/* eslint-disable mocha/no-skipped-tests */
				describe.skip('(type 6) inTransfer dapp', () => {
					it('should validate account data from sender after account creation', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountData = res;
								// expect(res.publicKey).to.be.null;
								done();
							}
						);
					});

					it('should forge a block', done => {
						const inTransferTransaction = lisk.transaction.transferIntoDapp({
							passphrase: testAccount.passphrase,
							amount: 10 * 100000000,
							dappId: randomUtil.guestbookDapp.id,
						});
						localCommon.addTransactionsAndForge(
							library,
							[inTransferTransaction],
							done
						);
					});

					it('should validate account data from sender after forging a block', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountDataAfterBlock = res;
								expect(res.publicKey).to.not.be.null;
								done();
							}
						);
					});

					it('should delete last block', done => {
						library.modules.blocks.chain.deleteLastBlock((err, res) => {
							expect(err).to.not.exist;
							expect(res).to.be.an('object');
							done();
						});
					});

					it('should validate account data from sender after deleting the last block', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountData.balance);
								// CHECKME: publicKey should be null
								done();
							}
						);
					});

					it('should forge a block with transaction pool', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender after forging a block with transaction pool', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
								expect(res.publicKey).to.equal(
									testAccountDataAfterBlock.publicKey
								);
								done();
							}
						);
					});
				});

				describe.skip('(type 7) outTransfer dapp', () => {
					it('should validate account data from sender after account creation', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountData = res;
								// expect(res.publicKey).to.be.null;
								done();
							}
						);
					});

					it('should forge a block', done => {
						const outTransferTransaction = lisk.transaction.transferOutOfDapp({
							passphrase: testAccount.passphrase,
							amount: 10 * 100000000,
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

					it('should validate account data from sender after forging a block', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountDataAfterBlock = res;
								expect(res.publicKey).to.not.be.null;
								done();
							}
						);
					});

					it('should delete last block', done => {
						library.modules.blocks.chain.deleteLastBlock((err, res) => {
							expect(err).to.not.exist;
							expect(res).to.be.an('object');
							done();
						});
					});

					it('should validate account data from sender after deleting the last block', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountData.balance);
								// CHECKME: publicKey should be null
								done();
							}
						);
					});

					it('should forge a block with transaction pool', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender after forging a block with transaction pool', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
								expect(res.publicKey).to.equal(
									testAccountDataAfterBlock.publicKey
								);
								done();
							}
						);
					});
				});
				/* eslint-enable mocha/no-skipped-tests */
			});
		});

		describe('multiple transactions scenarios: create transactions, forge, delete block, forge again', () => {});
	});
});
