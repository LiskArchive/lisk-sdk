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
const { transfer } = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');
const Bignum = require('../../../../../src/modules/chain/helpers/bignum');

describe('system test (blocks) - chain/popLastBlock', () => {
	const transferAmount = 100000000 * 100;
	let library;
	let storage;

	localCommon.beforeBlock('system_blocks_chain_pop_last_block', lib => {
		library = lib;
		storage = library.components.storage;
	});

	afterEach(done => {
		storage.entities.Block.begin(t => {
			return t.batch([
				storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
				storage.adapter.db.none('DELETE FROM forks_stat;'),
				storage.adapter.db.none('UPDATE mem_accounts SET "producedBlocks" = 0'),
			]);
		})
			.then(() => {
				library.submodules.blocks.lastBlock.set(
					__testContext.config.genesisBlock
				);
				done();
			})
			.catch(err => {
				__testContext.debug(err.stack);
				done();
			});
	});

	let block;
	let blockAccount1;
	let fundTrsForAccount1;

	beforeEach('send funds to accounts', done => {
		blockAccount1 = randomUtil.account();
		fundTrsForAccount1 = transfer({
			amount: transferAmount.toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: blockAccount1.address,
		});
		fundTrsForAccount1.amount = new Bignum(fundTrsForAccount1.amount);
		fundTrsForAccount1.fee = new Bignum(fundTrsForAccount1.fee);
		fundTrsForAccount1.senderId = accountFixtures.genesis.address;

		localCommon.createValidBlock(library, [fundTrsForAccount1], (err, b) => {
			expect(err).to.not.exist;
			block = b;
			library.submodules.blocks.chain.applyBlock(block, true, done);
		});
	});

	describe('popLastBlock', () => {
		describe('when popLastBlock fails', () => {
			describe('when loadBlockSecondLastBlockStep fails', () => {
				beforeEach(done => {
					block.previousBlock = null;
					library.submodules.blocks.lastBlock.set(block);
					return done();
				});

				it('should fail with proper error', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('previousBlock is null');
						done();
					});
				});
			});

			describe('when undoConfirmedStep fails', () => {
				let setAccountAndGet;
				beforeEach(done => {
					// Artifically fail setAccountAndGet so we can check that test fails
					setAccountAndGet = library.submodules.accounts.setAccountAndGet;
					sinonSandbox
						.stub(library.submodules.accounts, 'setAccountAndGet')
						.callThrough()
						.withArgs({
							address: fundTrsForAccount1.recipientId,
						})
						.callsArgWith(1, 'err');
					done();
				});

				afterEach(done => {
					library.submodules.accounts.setAccountAndGet = setAccountAndGet;
					done();
				});
				it('should fail with proper error', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						done();
					});
				});
				it('should not have perform undoConfirmedStep on transactions of block', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(library, fundTrsForAccount1.recipientId)
							.then(account => {
								expect(account.mem_accounts.balance).to.equal(
									transferAmount.toString()
								);
								done();
							});
					});
				});
			});

			describe('when undoUnconfirmStep fails', () => {
				let merge;
				beforeEach(done => {
					// Artifically fail setAccountAndGet so we can check that test fails
					merge = library.logic.transaction.scope.account.merge;

					sinonSandbox
						.stub(library.logic.transaction.scope.account, 'merge')
						.callThrough()
						.withArgs(fundTrsForAccount1.senderId, {
							u_balance: fundTrsForAccount1.amount.plus(fundTrsForAccount1.fee),
						})
						.callsArgWith(2, 'err');
					done();
				});

				afterEach(done => {
					library.logic.account.merge = merge;
					done();
				});

				it('should fail with proper error', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						done();
					});
				});

				it('should not change balance in mem_accounts table', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(library, fundTrsForAccount1.recipientId)
							.then(account => {
								expect(account.mem_accounts.balance).to.equal(
									transferAmount.toString()
								);
								done();
							});
					});
				});

				it('should not change u_balance in mem_accounts table', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(library, fundTrsForAccount1.recipientId)
							.then(account => {
								expect(account.mem_accounts.u_balance).to.equal(
									transferAmount.toString()
								);
								done();
							});
					});
				});
			});

			describe('when backwardTickStep fails', () => {
				let backwardTick;
				beforeEach(done => {
					// Artifically fail setAccountAndGet so we can check that test fails
					backwardTick = library.submodules.rounds.backwardTick;

					sinonSandbox
						.stub(library.submodules.rounds, 'backwardTick')
						.callThrough()
						.withArgs(block, sinonSandbox.match.any)
						.callsArgWith(2, 'err');
					done();
				});

				afterEach(done => {
					library.submodules.rounds.backwardTick = backwardTick;
					done();
				});

				it('should fail with proper error message', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						done();
					});
				});

				it('modules.rounds.backwardTick stub should be called once', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						expect(library.submodules.rounds.backwardTick.calledOnce).to.equal(
							true
						);
						done();
					});
				});

				it('should not change balance in mem_accounts table', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(library, fundTrsForAccount1.recipientId)
							.then(account => {
								expect(account.mem_accounts.balance).to.equal(
									transferAmount.toString()
								);
								done();
							});
					});
				});

				it('should not change u_balance in mem_accounts table', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(library, fundTrsForAccount1.recipientId)
							.then(account => {
								expect(account.mem_accounts.u_balance).to.equal(
									transferAmount.toString()
								);
								done();
							});
					});
				});
			});

			describe('when deleteBlockStep fails', () => {
				let deleteBlock;
				beforeEach(done => {
					// Artifically fail setAccountAndGet so we can check that test fails
					deleteBlock = library.submodules.blocks.chain.deleteBlock;

					sinonSandbox
						.stub(library.submodules.blocks.chain, 'deleteBlock')
						.callThrough()
						.withArgs(block.id)
						.callsArgWith(1, 'err');
					done();
				});

				afterEach(done => {
					library.submodules.blocks.chain.deleteBlock = deleteBlock;
					done();
				});

				it('should fail with proper error message', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						done();
					});
				});

				it('modules.blocks.chain.deleteBlock should be called once', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						expect(
							library.submodules.blocks.chain.deleteBlock.calledOnce
						).to.equal(true);
						done();
					});
				});

				it('should not change balance in mem_accounts table', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(library, fundTrsForAccount1.recipientId)
							.then(account => {
								expect(account.mem_accounts.balance).to.equal(
									transferAmount.toString()
								);
								done();
							});
					});
				});

				it('should not change u_balance in mem_accounts table', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(library, fundTrsForAccount1.recipientId)
							.then(account => {
								expect(account.mem_accounts.u_balance).to.equal(
									transferAmount.toString()
								);
								done();
							});
					});
				});

				it('should not perform backwardTick', done => {
					library.submodules.blocks.chain.deleteLastBlock(err => {
						expect(err).to.exist;
						expect(err).to.eql('err');
						localCommon
							.getAccountFromDb(
								library,
								library.submodules.accounts.generateAddressByPublicKey(
									block.generatorPublicKey
								)
							)
							.then(account => {
								expect(account.mem_accounts.producedBlocks).to.equal(1);
								done();
							});
					});
				});
			});
		});

		describe('when deleteLastBlock succeeds', () => {
			it('should not return an error', done => {
				library.submodules.blocks.chain.deleteLastBlock(err => {
					expect(err).to.not.exist;
					done();
				});
			});

			it('should delete block', done => {
				library.submodules.blocks.chain.deleteLastBlock(err => {
					expect(err).to.not.exist;
					localCommon.getBlocks(library, (getBlocksErr, ids) => {
						expect(getBlocksErr).to.not.exist;
						expect(ids).to.not.include(block.id);
						done();
					});
				});
			});

			it('should delete all transactions of block', done => {
				library.submodules.blocks.chain.deleteLastBlock(err => {
					expect(err).to.not.exist;
					localCommon.getTransactionFromModule(
						library,
						{ id: fundTrsForAccount1.id },
						(getTransactionFromModuleErr, res) => {
							expect(getTransactionFromModuleErr).to.not.exist;
							expect(res.transactions).to.have.length(0);
							done();
						}
					);
				});
			});

			it('should revert balance for accounts in block', done => {
				library.submodules.blocks.chain.deleteLastBlock(err => {
					expect(err).to.not.exist;
					localCommon
						.getAccountFromDb(library, fundTrsForAccount1.recipientId)
						.then(account => {
							expect(account.mem_accounts.balance).to.equal('0');
							done();
						});
				});
			});

			it('should revert u_balance for accounts in block', done => {
				library.submodules.blocks.chain.deleteLastBlock(err => {
					expect(err).to.not.exist;
					localCommon
						.getAccountFromDb(library, fundTrsForAccount1.recipientId)
						.then(account => {
							expect(account.mem_accounts.u_balance).to.equal('0');
							done();
						});
				});
			});

			it('should perform backwardTick', done => {
				library.submodules.blocks.chain.deleteLastBlock(err => {
					expect(err).to.not.exist;
					localCommon
						.getAccountFromDb(
							library,
							library.submodules.accounts.generateAddressByPublicKey(
								block.generatorPublicKey
							)
						)
						.then(account => {
							expect(account.mem_accounts.producedBlocks).to.equal(0);
							done();
						});
				});
			});
		});
	});
});
