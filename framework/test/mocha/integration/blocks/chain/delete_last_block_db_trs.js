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
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

describe('integration test (blocks) - chain/popLastBlock', () => {
	const transferAmount = 100000000 * 100;
	let library;
	let storage;

	localCommon.beforeBlock('blocks_chain_pop_last_block', lib => {
		library = lib;
		storage = library.components.storage;
	});

	afterEach(async () => {
		await storage.entities.Block.begin(t => {
			return t.batch([
				storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
				storage.adapter.db.none('DELETE FROM forks_stat;'),
				storage.adapter.db.none('UPDATE mem_accounts SET "producedBlocks" = 0'),
			]);
		});
		library.modules.blocks._lastBlock = __testContext.config.genesisBlock;
	});

	let block;
	let blockAccount1;
	let fundTrsForAccount1;

	beforeEach('send funds to accounts', async () => {
		blockAccount1 = randomUtil.account();
		fundTrsForAccount1 = transfer({
			amount: transferAmount.toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: blockAccount1.address,
		});
		block = await new Promise((resolve, reject) => {
			localCommon.createValidBlock(library, [fundTrsForAccount1], (err, b) => {
				if (err) {
					return reject(err);
				}
				return resolve(b);
			});
		});
		await library.modules.blocks.blocksChain.applyBlock(block, true);
		library.modules.blocks._lastBlock = block;
	});

	describe('popLastBlock', () => {
		describe('when popLastBlock fails', () => {
			describe('when loadBlockSecondLastBlockStep fails', () => {
				beforeEach(async () => {
					block.previousBlock = null;
					library.modules.blocks._lastBlock = block;
				});

				it('should fail with proper error', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error.message).to.eql('PreviousBlock is null');
					}
				});
			});

			describe('when backwardTickStep fails', () => {
				beforeEach(async () => {
					sinonSandbox
						.stub(library.modules.blocks.roundsModule, 'backwardTick')
						.callThrough()
						.withArgs(block, sinonSandbox.match.any)
						.callsArgWith(2, 'err');
				});

				afterEach(async () => {
					sinonSandbox.restore();
				});

				it('should fail with proper error message', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error).to.eql('err');
					}
				});

				it('modules.rounds.backwardTick stub should be called once', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error).to.exist;
						expect(library.modules.blocks.roundsModule.backwardTick).to.be
							.calledOnce;
					}
				});

				it('should not change balance in mem_accounts table', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error).to.exist;
					}
					const account = await localCommon.getAccountFromDb(
						library,
						fundTrsForAccount1.recipientId
					);
					expect(account.mem_accounts.balance).to.equal(
						transferAmount.toString()
					);
				});
			});

			describe('when deleteBlockStep fails', () => {
				beforeEach(async () => {
					sinonSandbox
						.stub(
							library.modules.blocks.blocksChain.storage.entities.Block,
							'delete'
						)
						.rejects(new Error('err'));
				});

				afterEach(async () => {
					sinonSandbox.restore();
				});

				it('should fail with proper error message', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error.message).to.eql('err');
					}
				});

				it('modules.blocks.chain.deleteBlock should be called once', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error.message).to.eql('err');
					}
					expect(
						library.modules.blocks.blocksChain.storage.entities.Block.delete
					).to.be.calledOnce;
				});

				it('should not change balance in mem_accounts table', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error.message).to.eql('err');
					}
					const account = await localCommon.getAccountFromDb(
						library,
						fundTrsForAccount1.recipientId
					);
					expect(account.mem_accounts.balance).to.equal(
						transferAmount.toString()
					);
				});

				it('should not perform backwardTick', async () => {
					try {
						const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
							library.modules.blocks.lastBlock
						);
						library.modules.blocks._lastBlock = newLastBlock;
					} catch (error) {
						expect(error.message).to.eql('err');
					}
					const account = await localCommon.getAccountFromDb(
						library,
						getAddressFromPublicKey(block.generatorPublicKey)
					);
					expect(account.mem_accounts.producedBlocks).to.equal(1);
				});
			});
		});

		describe('when deleteLastBlock succeeds', () => {
			it('should not return an error', async () => {
				const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
					library.modules.blocks.lastBlock
				);
				library.modules.blocks._lastBlock = newLastBlock;
			});

			it('should delete block', async () => {
				const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
					library.modules.blocks.lastBlock
				);
				library.modules.blocks._lastBlock = newLastBlock;
				const ids = await new Promise((resolve, reject) => {
					localCommon.getBlocks(library, (getBlocksErr, blockIds) => {
						if (getBlocksErr) {
							return reject(getBlocksErr);
						}
						return resolve(blockIds);
					});
				});
				expect(ids).to.not.include(block.id);
			});

			it('should delete all transactions of block', async () => {
				const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
					library.modules.blocks.lastBlock
				);
				library.modules.blocks._lastBlock = newLastBlock;
				const transactions = await new Promise((resolve, reject) => {
					localCommon.getTransactionFromModule(
						library,
						{ id: fundTrsForAccount1.id },
						(getTransactionFromModuleErr, res) => {
							if (getTransactionFromModuleErr) {
								return reject(getTransactionFromModuleErr);
							}
							return resolve(res.transactions);
						}
					);
				});
				expect(transactions).to.have.length(0);
			});

			it('should revert balance for accounts in block', async () => {
				const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
					library.modules.blocks.lastBlock
				);
				library.modules.blocks._lastBlock = newLastBlock;
				const account = await localCommon.getAccountFromDb(
					library,
					fundTrsForAccount1.recipientId
				);
				expect(account.mem_accounts.balance).to.equal('0');
			});

			it('should perform backwardTick', async () => {
				const newLastBlock = await library.modules.blocks.blocksChain.deleteLastBlock(
					library.modules.blocks.lastBlock
				);
				library.modules.blocks._lastBlock = newLastBlock;
				const account = await localCommon.getAccountFromDb(
					library,
					getAddressFromPublicKey(block.generatorPublicKey)
				);
				expect(account.mem_accounts.producedBlocks).to.equal(0);
			});
		});
	});
});
