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

var expect = require('chai').expect;
var lisk = require('lisk-elements').default;
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('../../common');

describe('system test (blocks) - chain/deleteLastBlock', () => {
	var library;
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
			var testAccount;
			var testAccountData;
			var testAccountDataAfterBlock;
			var testReceipt;
			var testReceiptData;
			var fieldsToCompare;

			function createAccountWithFunds(done) {
				testAccount = randomUtil.account();
				var sendTransaction = lisk.transaction.transfer({
					amount: 100000000 * 100,
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: testAccount.address,
				});
				localCommon.addTransactionsAndForge(library, [sendTransaction], done);
			}

			describe('(type 0) transfer funds', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = ['balance', 'u_balance', 'publicKey'];
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
					var transferTransaction = lisk.transaction.transfer({
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
							expect(res.u_balance).to.equal(testAccountData.u_balance);
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
							expect(res.u_balance).to.equal('0');
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
							expect(res.u_balance).to.equal(
								testAccountDataAfterBlock.u_balance
							);
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
							expect(res.u_balance).to.equal(testReceiptData.u_balance);
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
						'u_balance',
						'publicKey',
						'secondPublicKey',
						'secondSignature',
						'u_secondSignature',
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
							expect(res.u_secondSignature).to.equal(false);
							done();
						}
					);
				});

				it('should forge a block', done => {
					var signatureTransaction = lisk.transaction.registerSecondPassphrase({
						passphrase: testAccount.passphrase,
						secondPassphrase: testAccount.secondPassphrase,
					});
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
							expect(res.u_secondSignature).to.equal(true);
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
							expect(res.u_balance).to.equal(testAccountData.u_balance);
							expect(res.secondPublicKey).to.be.null;
							expect(res.secondSignature).to.equal(false);
							expect(res.u_secondSignature).to.equal(false);
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
							expect(res.u_balance).to.equal(
								testAccountDataAfterBlock.u_balance
							);
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
						'u_balance',
						'publicKey',
						'isDelegate',
						'u_isDelegate',
						'username',
						'u_username',
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
							expect(res.u_isDelegate).to.equal(false);
							expect(res.username).to.be.null;
							expect(res.u_username).to.be.null;
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
					var delegateTransaction = lisk.transaction.registerDelegate({
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
							expect(res.u_isDelegate).to.equal(true);
							expect(res.username).to.be.equal(testAccount.username);
							expect(res.u_username).to.be.equal(testAccount.username);
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
							expect(res.u_balance).to.equal(testAccountData.u_balance);
							expect(res.isDelegate).to.equal(false);
							expect(res.u_isDelegate).to.equal(false);
							expect(res.username).to.be.null;
							expect(res.u_username).to.be.null;
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
							expect(res.u_balance).to.equal(
								testAccountDataAfterBlock.u_balance
							);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							expect(res.isDelegate).to.equal(true);
							expect(res.u_isDelegate).to.equal(true);
							expect(res.username).to.be.equal(
								testAccountDataAfterBlock.username
							);
							expect(res.u_username).to.be.equal(
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
						'u_balance',
						'publicKey',
						'delegates',
						'u_delegates',
					];
				});

				it('should validate account data from sender after account creation', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.publicKey).to.be.null;
							expect(res.delegates).to.be.null;
							expect(res.u_delegates).to.be.null;
							done();
						}
					);
				});

				it('should forge a block', done => {
					var voteTransaction = lisk.transaction.castVotes({
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
							expect(res.delegates[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							expect(res.u_delegates[0]).to.equal(
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
							expect(res.u_balance).to.equal(testAccountData.u_balance);
							expect(res.delegates).to.be.null;
							expect(res.u_delegates).to.be.null;
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
							expect(res.u_balance).to.equal(
								testAccountDataAfterBlock.u_balance
							);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							expect(res.delegates[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							expect(res.u_delegates[0]).to.equal(
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
						'u_balance',
						'publicKey',
						'multilifetime',
						'u_multilifetime',
						'multimin',
						'u_multimin',
						'multisignatures',
						'u_multisignatures',
					];
				});

				it('should validate account data from sender after account creation', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.publicKey).to.be.null;
							expect(res.multilifetime).to.equal(0);
							expect(res.u_multilifetime).to.equal(0);
							expect(res.multimin).to.equal(0);
							expect(res.u_multimin).to.equal(0);
							expect(res.multisignatures).to.be.null;
							expect(res.u_multisignatures).to.be.null;
							done();
						}
					);
				});

				it('should forge a block', done => {
					var multisigTransaction = lisk.transaction.registerMultisignature({
						passphrase: testAccount.passphrase,
						keysgroup: [accountFixtures.existingDelegate.publicKey],
						lifetime: 1,
						minimum: 1,
					});
					var signature = lisk.transaction.utils.multiSignTransaction(
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
							expect(res.multilifetime).to.equal(1);
							expect(res.u_multilifetime).to.equal(1);
							expect(res.multimin).to.equal(1);
							expect(res.u_multimin).to.equal(1);
							expect(res.multisignatures[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							expect(res.u_multisignatures[0]).to.equal(
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
							expect(res.u_balance).to.equal(testAccountData.u_balance);
							expect(res.multilifetime).to.equal(0);
							expect(res.u_multilifetime).to.equal(0);
							expect(res.multimin).to.equal(0);
							expect(res.u_multimin).to.equal(0);
							expect(res.multisignatures).to.be.null;
							expect(res.u_multisignatures).to.be.null;
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
							expect(res.u_balance).to.equal(
								testAccountDataAfterBlock.u_balance
							);
							expect(res.publicKey).to.equal(
								testAccountDataAfterBlock.publicKey
							);
							expect(res.multilifetime).to.equal(1);
							expect(res.u_multilifetime).to.equal(1);
							expect(res.multimin).to.equal(1);
							expect(res.u_multimin).to.equal(1);
							expect(res.multisignatures[0]).to.equal(
								accountFixtures.existingDelegate.publicKey
							);
							expect(res.u_multisignatures[0]).to.equal(
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
					fieldsToCompare = ['balance', 'u_balance', 'publicKey'];
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
						var dappTransaction = lisk.transaction.createDapp({
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
								expect(res.u_balance).to.equal(testAccountData.u_balance);
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
								expect(res.u_balance).to.equal(
									testAccountDataAfterBlock.u_balance
								);
								expect(res.publicKey).to.equal(
									testAccountDataAfterBlock.publicKey
								);
								done();
							}
						);
					});
				});

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
						var inTransferTransaction = lisk.transaction.transferIntoDapp({
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
								expect(res.u_balance).to.equal(testAccountData.u_balance);
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
								expect(res.u_balance).to.equal(
									testAccountDataAfterBlock.u_balance
								);
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
						var outTransferTransaction = lisk.transaction.transferOutOfDapp({
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
								expect(res.u_balance).to.equal(testAccountData.u_balance);
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
								expect(res.u_balance).to.equal(
									testAccountDataAfterBlock.u_balance
								);
								expect(res.publicKey).to.equal(
									testAccountDataAfterBlock.publicKey
								);
								done();
							}
						);
					});
				});
			});
		});

		describe('multiple transactions scenarios: create transactions, forge, delete block, forge again', () => {});
	});
});
