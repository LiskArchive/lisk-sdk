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

const {
	registeredTransactions,
} = require('../../../../common/registered_transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../src/modules/chain/interface_adapters');
const { Blocks } = require('../../../../../../src/modules/chain/blocks/blocks');
const {
	BlocksVerify,
} = require('../../../../../../src/modules/chain/blocks/verify');
const {
	BlocksProcess,
} = require('../../../../../../src/modules/chain/blocks/process');
const {
	BlocksChain,
} = require('../../../../../../src/modules/chain/blocks/chain');
const {
	BlockSlots,
} = require('../../../../../../src/modules/chain/blocks/block_slots');
const blocksUtils = require('../../../../../../src/modules/chain/blocks/utils');

describe('blocks', () => {
	const interfaceAdapters = {
		transactions: new TransactionInterfaceAdapter(registeredTransactions),
	};

	let blocksInstance;
	let storageStub;
	let loggerStub;
	let sequenceStub;
	let roundsModuleStub;
	let slots;
	let exceptions;

	beforeEach(async () => {
		exceptions = __testContext.config.modules.chain.exceptions;
		loggerStub = {
			trace: sinonSandbox.stub(),
			info: sinonSandbox.stub(),
			error: sinonSandbox.stub(),
			warn: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
		};
		storageStub = {
			entities: {
				Block: {
					isPersisted: sinonSandbox.stub().resolves(true),
					get: sinonSandbox.stub().resolves([]),
					begin: sinonSandbox.stub().resolves(true),
					delete: sinonSandbox.stub(),
				},
				Account: {
					resetMemTables: sinonSandbox.stub(),
				},
			},
		};
		slots = new BlockSlots({
			epochTime: __testContext.config.constants.EPOCH_TIME,
			interval: __testContext.config.constants.BLOCK_TIME,
			blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
		});
		sequenceStub = {
			add: sinonSandbox.stub(),
		};
		roundsModuleStub = {
			backwardTick: sinonSandbox.stub(),
			tick: sinonSandbox.stub(),
			fork: sinonSandbox.stub(),
		};

		blocksInstance = new Blocks({
			// components
			logger: loggerStub,
			storage: storageStub,
			sequence: sequenceStub,
			// Unique requirements
			genesisBlock: __testContext.config.genesisBlock,
			slots,
			exceptions,
			// Modules
			roundsModule: roundsModuleStub,
			interfaceAdapters,
			// constants
			rewardDistance: __testContext.config.constants.REWARDS.DISTANCE,
			rewardOffset: __testContext.config.constants.REWARDS.OFFSET,
			rewardMileStones: __testContext.config.constants.REWARDS.MILESTONES,
			blockReceiptTimeout: __testContext.config.constants.BLOCK_RECEIPT_TIMEOUT,
			maxPayloadLength: __testContext.config.constants.MAX_PAYLOAD_LENGTH,
			maxTransactionsPerBlock:
				__testContext.config.constants.MAX_TRANSACTIONS_PER_BLOCK,
			loadPerIteration: 1000,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
			blockSlotWindow: __testContext.config.constants.BLOCK_SLOT_WINDOW,
			totalAmount: __testContext.config.constants.TOTAL_AMOUNT,
		});
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params', async () => {
			expect(blocksInstance.logger).to.eql(loggerStub);
			expect(blocksInstance.storage).to.eql(storageStub);
		});

		it('should initialize parameters', async () => {
			expect(blocksInstance._broadhash).to.eql(
				__testContext.config.genesisBlock.payloadHash
			);
			expect(blocksInstance._lastNBlockIds).to.eql([]);
			expect(blocksInstance._lastBlock).to.eql({});
			expect(blocksInstance._isActive).to.be.false;
			expect(blocksInstance._lastReceipt).to.be.null;
			expect(blocksInstance._cleaning).to.be.false;
		});

		it('should assign related modules to this', async () => {
			expect(blocksInstance.blocksChain).to.be.instanceOf(BlocksChain);
			expect(blocksInstance.blocksVerify).to.be.instanceOf(BlocksVerify);
			expect(blocksInstance.blocksProcess).to.be.instanceOf(BlocksProcess);
		});
	});

	describe('isStale', () => {
		it('should return false, when _lastReceipt is null', async () => {
			expect(blocksInstance.isStale()).to.be.true;
		});

		describe('when __private.lastReceipt is set', () => {
			describe('when secondsAgo > BLOCK_RECEIPT_TIMEOUT', () => {
				it('should return true', async () => {
					blocksInstance._lastReceipt = 10;
					expect(blocksInstance.isStale()).to.be.true;
				});
			});
			describe('when secondsAgo <= BLOCK_RECEIPT_TIMEOUT', () => {
				it('should return false', async () => {
					blocksInstance._lastReceipt = Math.floor(Date.now() / 1000) + 10000;
					expect(blocksInstance.isStale()).to.be.false;
				});
			});
		});
	});

	describe('cleanup', () => {
		it('should call exit, when _isActive = false', async () => {
			blocksInstance._isActive = false;
			await blocksInstance.cleanup();
		});

		describe('when _isActive = true', () => {
			beforeEach(async () => {
				blocksInstance._isActive = true;
			});

			describe('after 10 seconds', () => {
				it('should log info "Waiting for block processing to finish..."', async () => {
					setTimeout(() => {
						blocksInstance._isActive = false;
					}, 5000);
					await blocksInstance.cleanup();
					expect(loggerStub.info.callCount).to.equal(1);
				});
			});

			describe('after 20 seconds', () => {
				it('should log info "Waiting for block processing to finish..." 2 times', async () => {
					setTimeout(() => {
						blocksInstance._isActive = false;
					}, 15000);
					await blocksInstance.cleanup();
					expect(loggerStub.info.callCount).to.equal(2);
				});
			});
		});
	});

	describe('receiveBlockFromNetwork', () => {
		describe('client ready to receive block', () => {
			const defaultLastBlock = {
				id: '2',
				height: 2,
				generatorPublicKey: 'a',
				previousBlock: '1',
				timestamp: '100',
			};

			beforeEach(async () => {
				blocksInstance._lastBlock = {
					...defaultLastBlock,
				};
				sinonSandbox
					.stub(blocksInstance.blocksProcess, 'processBlock')
					.callsFake(input => input);
				sinonSandbox
					.stub(blocksInstance.blocksVerify, 'normalizeAndVerify')
					.resolves({
						verified: true,
						errors: [],
					});
				sinonSandbox.stub(blocksInstance.blocksChain, 'deleteLastBlock');
				sequenceStub.add.callsFake(async fn => {
					await fn();
				});
			});

			describe('when block.previousBlock === lastBlock.id && lastBlock.height + 1 === block.height', () => {
				it('should call processBlock', async () => {
					await blocksInstance.receiveBlockFromNetwork({
						id: '5',
						previousBlock: '2',
						height: 3,
					});

					expect(blocksInstance.blocksProcess.processBlock).to.be.calledOnce;
				});
			});

			describe('when block.previousBlock !== lastBlock.id && lastBlock.height + 1 === block.height', () => {
				it('should call fork', async () => {
					const forkOneBlock = {
						id: '5',
						previousBlock: '3',
						height: 3,
					};
					await blocksInstance.receiveBlockFromNetwork(forkOneBlock);
					expect(roundsModuleStub.fork).to.be.calledWith(forkOneBlock, 1);
					expect(blocksInstance.blocksProcess.processBlock).not.to.be.called;
					expect(blocksInstance._isActive).to.be.false;
				});

				it('should discard block if id is higher', async () => {
					const forkOneBlock = {
						id: '5',
						previousBlock: '3',
						height: 3,
						timestamp: '200',
					};
					await blocksInstance.receiveBlockFromNetwork(forkOneBlock);
					expect(roundsModuleStub.fork).to.be.calledWith(forkOneBlock, 1);
					expect(blocksInstance.blocksChain.deleteLastBlock).not.to.be.called;
					expect(blocksInstance._isActive).to.be.false;
				});

				it('should delete 2 blocks if timestamp is the same id is less', async () => {
					const forkOneBlock = {
						id: '1',
						previousBlock: '3',
						height: 3,
						timestamp: '100',
					};
					await blocksInstance.receiveBlockFromNetwork(forkOneBlock);
					expect(roundsModuleStub.fork).to.be.calledWith(forkOneBlock, 1);
					expect(blocksInstance.blocksChain.deleteLastBlock).to.be.calledTwice;
					expect(blocksInstance._isActive).to.be.false;
				});
			});

			describe('when block.previousBlock === lastBlock.previousBlock && block.height === lastBlock.height && block.id !== lastBlock.id', () => {
				it('should processBlock', async () => {
					const forkFiveBlock = {
						id: '5',
						previousBlock: '1',
						height: 2,
					};
					await blocksInstance.receiveBlockFromNetwork(forkFiveBlock);
					expect(blocksInstance._isActive).to.be.false;
					expect(blocksInstance.blocksChain.deleteLastBlock).to.be.calledOnce;
					expect(roundsModuleStub.fork).to.be.calledWith(forkFiveBlock, 5);
					expect(blocksInstance.blocksProcess.processBlock).to.be.calledOnce;
				});

				it('should discard block', async () => {
					const forkFiveBlock = {
						id: '5',
						previousBlock: '1',
						height: 2,
						timestamp: 1000,
					};
					await blocksInstance.receiveBlockFromNetwork(forkFiveBlock);
					expect(roundsModuleStub.fork).to.be.calledWith(forkFiveBlock, 5);
					expect(blocksInstance._isActive).to.be.false;
					expect(blocksInstance.blocksChain.deleteLastBlock).not.to.be.called;
					expect(blocksInstance.blocksProcess.processBlock).not.to.be.called;
				});

				it('should log warning if double forging', async () => {
					const forkFiveBlock = {
						id: '5',
						generatorPublicKey: 'a',
						previousBlock: '1',
						height: 2,
					};
					await blocksInstance.receiveBlockFromNetwork(forkFiveBlock);
					expect(roundsModuleStub.fork).to.be.calledWith(forkFiveBlock, 5);
					expect(blocksInstance._isActive).to.be.false;
					expect(loggerStub.warn).to.be.calledOnce;
				});
			});

			describe('when block.id === lastBlock.id', () => {
				it('should log debug message', async () => {
					await blocksInstance.receiveBlockFromNetwork({
						id: '2',
						previousBlock: '1',
						height: 2,
					});
					expect(loggerStub.debug).to.be.calledOnce;
				});
			});

			describe('when block.id !== lastBlock.id', () => {
				it('should discard block, when it does not match with current chain', async () => {
					await blocksInstance.receiveBlockFromNetwork({
						id: '7',
						previousBlock: '6',
						height: 11,
						timestamp: 5440768,
						generatorPublicKey: 'a1',
					});
					expect(loggerStub.warn).to.be.calledOnce;
				});
			});
		});
	});

	describe('_rebuildMode', () => {
		const ACTIVE_DELEGATES = 101;

		beforeEach(async () => {
			sinonSandbox.stub(blocksUtils, 'loadBlocksWithOffset');
			sinonSandbox.stub(blocksInstance.blocksProcess, 'reload');
		});

		it('should throw an error when called with height below active delegates count', async () => {
			try {
				await blocksInstance._rebuildMode(2, ACTIVE_DELEGATES - 1);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, blockchain should contain at least one round of blocks'
				);
			}
		});

		it('should throw an error when called with rebuildUpToRound = string', async () => {
			try {
				await blocksInstance._rebuildMode(
					'type string = invalid',
					ACTIVE_DELEGATES
				);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
			}
		});

		it('should throw an error when called with rebuildUpToRound = boolean', async () => {
			try {
				await blocksInstance._rebuildMode(true, ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
			}
		});

		it('should not throw an error when called with rebuildUpToRound = integer as string', async () => {
			await blocksInstance._rebuildMode('2', ACTIVE_DELEGATES);
		});

		it('should throw an error when called with rebuildUpToRound = ""', async () => {
			try {
				await blocksInstance._rebuildMode('', ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
			}
		});

		it('should throw an error when called with rebuildUpToRound = undefined', async () => {
			try {
				await blocksInstance._rebuildMode(undefined, ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
			}
		});

		it('should emit an event with proper error when resetMemTables fails', async () => {
			storageStub.entities.Account.resetMemTables.rejects(
				new Error('Account#resetMemTables error')
			);
			try {
				await blocksInstance._rebuildMode(2, ACTIVE_DELEGATES);
			} catch (error) {
				expect(error.message).to.eql('Account#resetMemTables error');
			}
		});

		it('should emit an event with proper error when loadBlocksOffset fails', async () => {
			blocksUtils.loadBlocksWithOffset.rejects(
				new Error('loadBlocksOffsetStub#ERR')
			);
			try {
				await blocksInstance._rebuildMode(2, ACTIVE_DELEGATES);
			} catch (error) {
				expect(error.message).to.eql('Account#resetMemTables error');
			}
		});

		it('should emit an event with proper error when storage.entities.Block.delete fails', async () => {
			storageStub.entities.Block.delete.rejects(new Error('beginStub#ERR'));
			try {
				await blocksInstance._rebuildMode(2, ACTIVE_DELEGATES);
			} catch (error) {
				expect(error.message).to.eql('beginStub#ERR');
			}
		});
	});
});
