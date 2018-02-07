'use strict';

var expect = require('chai').expect;
var lisk = require('lisk-js');
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('../common');

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
				var sendTransaction = lisk.transaction.createTransaction(
					testAccount.address,
					100000000 * 100,
					accountFixtures.genesis.password
				);
				localCommon.addTransactionsAndForge(library, [sendTransaction], done);
			}

			describe('(type 0) transfer funds', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = [
						'balance',
						'u_balance',
						'blockId',
						'virgin',
						'publicKey',
					];
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.virgin).to.equal(true);
							expect(res.publicKey).to.be.null;
							done();
						}
					);
				});

				it('should create a transaction and forge a block', done => {
					testReceipt = randomUtil.account();
					var transferTransaction = lisk.transaction.createTransaction(
						testReceipt.address,
						10000000,
						testAccount.password
					);
					localCommon.addTransactionsAndForge(
						library,
						[transferTransaction],
						done
					);
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.virgin).to.equal(false);
							expect(res.publicKey).to.not.be.null;
							done();
						}
					);
				});

				it('should get account data from receipt', done => {
					library.logic.account.get(
						{ address: testReceipt.address },
						fieldsToCompare,
						(err, res) => {
							testReceiptData = res;
							expect(res.virgin).to.equal(true);
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

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountData.balance);
							expect(res.u_balance).to.equal(testAccountData.u_balance);
							// FIXME: Incorrect blockId
							// CHECKME: publicKey should be null
							// CHECKME: virgin should be 1 (account without outgoing transaction)
							done();
						}
					);
				});

				it('should get account data from receipt', done => {
					library.logic.account.get(
						{ address: testReceipt.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal('0');
							expect(res.u_balance).to.equal('0');
							// CHECKME: virgin should be 1
							// FIXME: Incorrect blockId, or this address should not be inserted into mem_accounts
							done();
						}
					);
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender', done => {
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
							expect(res.virgin).to.equal(false);
							// TODO: blockId is ok because timestamp is not been included in signature and is not new tx
							done();
						}
					);
				});

				it('should get account data from receipt', done => {
					library.logic.account.get(
						{ address: testReceipt.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testReceiptData.balance);
							expect(res.u_balance).to.equal(testReceiptData.u_balance);
							// FIXME: virgin should be 1 (account without outgoing transaction)
							// TODO: blockId is ok because timestamp is not been included in signature and is not new tx
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
						'blockId',
						'virgin',
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
							expect(res.virgin).to.equal(true);
							expect(res.publicKey).to.be.null;
							expect(res.secondPublicKey).to.be.null;
							expect(res.secondSignature).to.equal(false);
							expect(res.u_secondSignature).to.equal(false);
							done();
						}
					);
				});

				it('should forge a block', done => {
					var signatureTransaction = lisk.signature.createSignature(
						testAccount.password,
						testAccount.secondPassword
					);
					localCommon.addTransactionsAndForge(
						library,
						[signatureTransaction],
						done
					);
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.virgin).to.equal(false);
							expect(res.publicKey).to.not.be.null;
							expect(res.secondPublicKey).to.not.be.null;
							expect(res.secondSignature).to.equal(true);
							expect(res.u_secondSignature).to.equal(false);
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
							expect(res.secondPublicKey).to.be.null;
							expect(res.secondSignature).to.equal(false);
							expect(res.u_secondSignature).to.equal(false);
							// FIXME: Incorrect blockId
							// CHECKME: publicKey should be null
							// CHECKME: virgin should be 1
							done();
						}
					);
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender', done => {
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
							expect(res.virgin).to.equal(false);
							// CHECKME: blockId
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
						'blockId',
						'virgin',
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
							expect(res.virgin).to.equal(true);
							expect(res.publicKey).to.be.null;
							expect(res.isDelegate).to.equal(false);
							expect(res.u_isDelegate).to.equal(false);
							expect(res.username).to.be.null;
							expect(res.u_username).to.be.null;
							expect(res.missedBlocks).to.equal('0');
							expect(res.producedBlocks).to.equal('0');
							expect(res.rank).to.be.null;
							expect(res.rewards).to.equal('0');
							expect(res.vote).to.equal('0');
							done();
						}
					);
				});

				it('should forge a block', done => {
					var delegateTransaction = lisk.delegate.createDelegate(
						testAccount.password,
						testAccount.username
					);
					localCommon.addTransactionsAndForge(
						library,
						[delegateTransaction],
						done
					);
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.virgin).to.equal(false);
							expect(res.publicKey).to.not.be.null;
							expect(res.isDelegate).to.equal(true);
							expect(res.u_isDelegate).to.equal(false);
							expect(res.username).to.be.equal(testAccount.username);
							expect(res.u_username).to.be.null;
							expect(res.missedBlocks).to.equal('0');
							expect(res.producedBlocks).to.equal('0');
							expect(res.rank).to.equal('102');
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

				it('should validate account data from sender', done => {
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
							expect(res.missedBlocks).to.equal('0');
							expect(res.producedBlocks).to.equal('0');
							expect(res.rank).to.be.null;
							expect(res.rewards).to.equal('0');
							expect(res.vote).to.equal('0');
							// FIXME: Incorrect blockId
							// CHECKME: publicKey should be null
							// CHECKME: virgin should be 1
							done();
						}
					);
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender', done => {
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
							expect(res.u_isDelegate).to.equal(false);
							expect(res.username).to.be.equal(
								testAccountDataAfterBlock.username
							);
							expect(res.u_username).to.be.null;
							expect(res.virgin).to.equal(false);
							expect(res.missedBlocks).to.equal('0');
							expect(res.producedBlocks).to.equal('0');
							expect(res.rank).to.equal('102');
							expect(res.rewards).to.equal('0');
							expect(res.vote).to.equal('0');
							// CHECKME: blockId
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
						'blockId',
						'virgin',
						'publicKey',
						'delegates',
						'u_delegates',
					];
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.virgin).to.equal(true);
							expect(res.publicKey).to.be.null;
							expect(res.delegates).to.be.null;
							expect(res.u_delegates).to.be.null;
							done();
						}
					);
				});

				it('should forge a block', done => {
					var voteTransaction = lisk.vote.createVote(testAccount.password, [
						`+${accountFixtures.existingDelegate.publicKey}`,
					]);
					localCommon.addTransactionsAndForge(library, [voteTransaction], done);
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.virgin).to.equal(false);
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

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							expect(res.balance).to.equal(testAccountData.balance);
							expect(res.u_balance).to.equal(testAccountData.u_balance);
							expect(res.delegates).to.be.null;
							expect(res.u_delegates).to.be.null;
							// FIXME: Incorrect blockId
							// CHECKME: publicKey should be null
							// CHECKME: virgin should be 1
							done();
						}
					);
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender', done => {
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
							expect(res.virgin).to.equal(false);
							// CHECKME: blockId
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
						'blockId',
						'virgin',
						'publicKey',
						'multilifetime',
						'u_multilifetime',
						'multimin',
						'u_multimin',
						'multisignatures',
						'u_multisignatures',
					];
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountData = res;
							expect(res.virgin).to.equal(true);
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
					var multisigTransaction = lisk.multisignature.createMultisignature(
						testAccount.password,
						null,
						[`+${accountFixtures.existingDelegate.publicKey}`],
						1,
						1
					);
					var signTransaction = lisk.multisignature.signTransaction(
						multisigTransaction,
						accountFixtures.existingDelegate.password
					);
					multisigTransaction.signatures = [signTransaction];
					multisigTransaction.ready = true;
					localCommon.addTransactionsAndForge(
						library,
						[multisigTransaction],
						done
					);
				});

				it('should validate account data from sender', done => {
					library.logic.account.get(
						{ address: testAccount.address },
						fieldsToCompare,
						(err, res) => {
							testAccountDataAfterBlock = res;
							expect(res.virgin).to.equal(false);
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
							// FIXME: Incorrect blockId
							// CHECKME: publicKey should be null
							// CHECKME: virgin should be 1
							done();
						}
					);
				});

				it('should forge a block with pool transaction', done => {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender', done => {
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
							expect(res.virgin).to.equal(false);
							// CHECKME: blockId
							done();
						}
					);
				});
			});

			describe('dapps', () => {
				before('create account with funds', done => {
					createAccountWithFunds(done);
					fieldsToCompare = [
						'balance',
						'u_balance',
						'blockId',
						'virgin',
						'publicKey',
					];
				});

				describe('(type 5) register dapp', () => {
					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountData = res;
								expect(res.virgin).to.equal(true);
								expect(res.publicKey).to.be.null;
								done();
							}
						);
					});

					it('should forge a block', done => {
						var dappTransaction = lisk.dapp.createDapp(
							testAccount.password,
							null,
							randomUtil.guestbookDapp
						);
						randomUtil.guestbookDapp.id = dappTransaction.id;
						localCommon.addTransactionsAndForge(
							library,
							[dappTransaction],
							done
						);
					});

					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountDataAfterBlock = res;
								expect(res.virgin).to.equal(false);
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

					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountData.balance);
								expect(res.u_balance).to.equal(testAccountData.u_balance);
								// FIXME: Incorrect blockId
								// CHECKME: publicKey should be null
								// CHECKME: virgin should be 1
								done();
							}
						);
					});

					it('should forge a block with pool transaction', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender', done => {
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
								expect(res.virgin).to.equal(false);
								// CHECKME: blockId
								done();
							}
						);
					});
				});

				describe.skip('(type 6) inTransfer dapp', () => {
					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountData = res;
								// expect(res.virgin).to.equal(true);
								// expect(res.publicKey).to.be.null;
								done();
							}
						);
					});

					it('should forge a block', done => {
						var inTransferTransaction = lisk.transfer.createInTransfer(
							randomUtil.guestbookDapp.id,
							10 * 100000000,
							testAccount.password
						);
						localCommon.addTransactionsAndForge(
							library,
							[inTransferTransaction],
							done
						);
					});

					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountDataAfterBlock = res;
								expect(res.virgin).to.equal(false);
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

					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountData.balance);
								expect(res.u_balance).to.equal(testAccountData.u_balance);
								// FIXME: Incorrect blockId
								// CHECKME: publicKey should be null
								// CHECKME: virgin should be 1
								done();
							}
						);
					});

					it('should forge a block with pool transaction', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender', done => {
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
								expect(res.virgin).to.equal(false);
								// CHECKME: blockId
								done();
							}
						);
					});
				});

				describe.skip('(type 7) outTransfer dapp', () => {
					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountData = res;
								// expect(res.virgin).to.equal(true);
								// expect(res.publicKey).to.be.null;
								done();
							}
						);
					});

					it('should forge a block', done => {
						var outTransferTransaction = lisk.transfer.createOutTransfer(
							randomUtil.guestbookDapp.id,
							randomUtil.transaction().id,
							accountFixtures.genesis.address,
							10 * 100000000,
							testAccount.password
						);
						localCommon.addTransactionsAndForge(
							library,
							[outTransferTransaction],
							err => {
								expect(err).to.equal('Transaction type 7 is frozen');
								done();
							}
						);
					});

					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								testAccountDataAfterBlock = res;
								expect(res.virgin).to.equal(false);
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

					it('should validate account data from sender', done => {
						library.logic.account.get(
							{ address: testAccount.address },
							fieldsToCompare,
							(err, res) => {
								expect(res.balance).to.equal(testAccountData.balance);
								expect(res.u_balance).to.equal(testAccountData.u_balance);
								// FIXME: Incorrect blockId
								// CHECKME: publicKey should be null
								// CHECKME: virgin should be 1
								done();
							}
						);
					});

					it('should forge a block with pool transaction', done => {
						localCommon.addTransactionsAndForge(library, [], done);
					});

					it('should validate account data from sender', done => {
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
								expect(res.virgin).to.equal(false);
								// CHECKME: blockId
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
