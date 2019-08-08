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

const { cloneDeep } = require('lodash');
const forkChoiceRule = require('../../../../../../src/modules/chain/blocks/fork_choice_rule');
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
const { BlockSlots } = require('../../../../../../src/modules/chain/dpos');
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

	beforeEach(async () => {
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
					getMatchingHighestBlock: sinonSandbox.stub().resolves(),
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
			exceptions: {
				blockVersions: {
					1: {
						start: 0,
						end: 101,
					},
					2: {
						start: 102,
						end: 202,
					},
				},
			},
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
				__testContext.config.genesisBlock.payloadHash,
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

	describe('getHighestCommonBlock', () => {
		const ids = ['1,2,3,4'];

		it('should call storage.entities.Block.get with the provided ids', async () => {
			await blocksInstance.getHighestCommonBlock(ids);
			expect(storageStub.entities.Block.get).to.be.calledWith(
				{
					id_in: ids,
				},
				{ sort: 'height:desc', limit: 1 },
			);
		});

		describe('when reading from storage fails', () => {
			it('should error log it and throw the error', async () => {
				const getError = new Error('Storage error');
				storageStub.entities.Block.getMatchingHighestBlock.rejects(getError);

				try {
					await blocksInstance.getHighestCommonBlock(ids);
				} catch (e) {
					expect(e.message).to.equal('Failed to access storage layer');
					expect(loggerStub.error).to.be.calledWith(
						getError,
						'Failed to access storage layer',
					);
				}
			});
		});
	});

	describe('receiveBlockFromNetwork', () => {
		const block = {
			height: 1,
			id: '1',
			version: 1,
			reward: 2,
		};

		beforeEach(async () => {
			sequenceStub.add.callsFake(async fn => {
				await fn();
			});
			sinonSandbox
				.stub(blocksInstance._receiveBlockImplementations, '1')
				.resolves();
			sinonSandbox
				.stub(blocksInstance._receiveBlockImplementations, '2')
				.resolves();
		});

		it('should debug log that a new block has been received', async () => {
			await blocksInstance.receiveBlockFromNetwork(block);
			expect(loggerStub.debug).to.be.calledWith(
				`Received new block from network with id: ${block.id} height: ${
					block.height
				} round: ${blocksInstance.slots.calcRound(
					block.height,
				)} slot: ${blocksInstance.slots.getSlotNumber(
					block.timestamp,
				)} reward: ${block.reward} version: ${block.version}`,
			);
		});

		it('should call _receiveBlockFromNetworkV1 when block version is 1', async () => {
			await blocksInstance.receiveBlockFromNetwork(block);

			expect(blocksInstance._receiveBlockImplementations['1']).to.be.called;
			expect(blocksInstance._receiveBlockImplementations['2']).to.not.be.called;
		});

		it('should call _receiveBlockFromNetworkV2 when block version is 2', async () => {
			const blockv2 = {
				...block,
				height: 102,
				version: 2,
			};

			await blocksInstance.receiveBlockFromNetwork(blockv2);

			expect(blocksInstance._receiveBlockImplementations['2']).to.be.calledWith(
				blockv2,
			);
			expect(blocksInstance._receiveBlockImplementations['1']).to.not.be.called;
		});
	});

	describe('_receiveBlockFromNetworkV1', () => {
		const defaultLastBlock = {
			id: '2',
			height: 2,
			generatorPublicKey: 'a',
			previousBlock: '1',
			timestamp: '100',
			version: 1,
		};

		beforeEach(async () => {
			blocksInstance._lastBlock = {
				...defaultLastBlock,
			};

			sequenceStub.add.callsFake(async fn => {
				await fn();
			});

			sinonSandbox.stub(blocksInstance, '_updateBroadhash');
			sinonSandbox.spy(blocksInstance, '_processReceivedBlock');
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
		});

		describe('when block.previousBlock === lastBlock.id && lastBlock.height + 1 === block.height', () => {
			it('should call _processReceivedBlock', async () => {
				const block = {
					id: '5',
					previousBlock: '2',
					height: 3,
					version: 1,
				};
				await blocksInstance._receiveBlockFromNetworkV1(block);
				expect(blocksInstance._processReceivedBlock).to.be.calledWith(block);
			});

			it('should emit EVENT_NEW_BLOCK with block', async () => {
				const emitSpy = sinonSandbox.spy(blocksInstance, 'emit');
				const fakeBlock = {
					id: '5',
					previousBlock: '2',
					height: 3,
				};
				await blocksInstance._receiveBlockFromNetworkV1(fakeBlock);

				expect(blocksInstance._processReceivedBlock).to.be.calledOnce;
				expect(emitSpy).to.be.calledOnce;
				expect(emitSpy.firstCall.args).to.be.eql([
					'EVENT_NEW_BLOCK',
					{ block: fakeBlock },
				]);
			});
		});

		describe('when block.previousBlock !== lastBlock.id && lastBlock.height + 1 === block.height', () => {
			it('should call fork', async () => {
				const forkOneBlock = {
					id: '5',
					previousBlock: '3',
					height: 3,
					version: 1,
				};
				await blocksInstance._receiveBlockFromNetworkV1(forkOneBlock);
				expect(roundsModuleStub.fork).to.be.calledWith(forkOneBlock, 1);
				expect(blocksInstance._processReceivedBlock).not.to.be.called;
				expect(blocksInstance._isActive).to.be.false;
			});

			it('should discard block if id is higher', async () => {
				const forkOneBlock = {
					id: '5',
					previousBlock: '3',
					height: 3,
					timestamp: '200',
					version: 1,
				};
				await blocksInstance._receiveBlockFromNetworkV1(forkOneBlock);
				expect(roundsModuleStub.fork).to.be.calledWith(forkOneBlock, 1);
				expect(blocksInstance.blocksChain.deleteLastBlock).not.to.be.called;
				expect(blocksInstance._isActive).to.be.false;
				expect(blocksInstance._processReceivedBlock).to.be.not.called;
			});

			it('should delete 2 blocks if timestamp is the same id is less', async () => {
				const forkOneBlock = {
					id: '1',
					previousBlock: '3',
					height: 3,
					timestamp: '100',
					version: 1,
				};
				await blocksInstance._receiveBlockFromNetworkV1(forkOneBlock);
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
					version: 1,
				};
				await blocksInstance._receiveBlockFromNetworkV1(forkFiveBlock);
				expect(blocksInstance.blocksChain.deleteLastBlock).to.be.calledOnce;
				expect(roundsModuleStub.fork).to.be.calledWith(forkFiveBlock, 5);
				expect(blocksInstance._processReceivedBlock).to.be.calledOnce;
			});

			it('should discard block', async () => {
				const forkFiveBlock = {
					id: '5',
					previousBlock: '1',
					height: 2,
					timestamp: 1000,
					version: 1,
				};
				await blocksInstance._receiveBlockFromNetworkV1(forkFiveBlock);
				expect(roundsModuleStub.fork).to.be.calledWith(forkFiveBlock, 5);
				expect(blocksInstance._isActive).to.be.false;
				expect(blocksInstance.blocksChain.deleteLastBlock).not.to.be.called;
				expect(blocksInstance._processReceivedBlock).not.to.be.called;
			});

			it('should log warning if double forging', async () => {
				const forkFiveBlock = {
					id: '5',
					generatorPublicKey: 'a',
					previousBlock: '1',
					height: 2,
					version: 1,
				};
				await blocksInstance._receiveBlockFromNetworkV1(forkFiveBlock);
				expect(roundsModuleStub.fork).to.be.calledWith(forkFiveBlock, 5);
				expect(loggerStub.warn).to.be.calledOnce;
			});

			it('should emit EVENT_NEW_BLOCK with block', async () => {
				const emitSpy = sinonSandbox.spy(blocksInstance, 'emit');
				const forkFiveBlock = {
					id: '5',
					generatorPublicKey: 'a',
					previousBlock: '1',
					height: 2,
				};
				await blocksInstance._receiveBlockFromNetworkV1(forkFiveBlock);

				expect(blocksInstance._processReceivedBlock).to.be.calledOnce;
				expect(emitSpy).to.be.calledTwice;
				expect(emitSpy.secondCall.args).to.be.eql([
					'EVENT_NEW_BLOCK',
					{ block: forkFiveBlock },
				]);
			});
		});

		describe('when block.id === lastBlock.id', () => {
			it('should log debug message', async () => {
				await blocksInstance._receiveBlockFromNetworkV1({
					id: '2',
					previousBlock: '1',
					height: 2,
				});
				expect(loggerStub.debug).to.be.calledOnce;
			});
		});

		describe('when block.id !== lastBlock.id', () => {
			it('should discard block, when it does not match with current chain', async () => {
				await blocksInstance._receiveBlockFromNetworkV1({
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

	describe('_receiveBlockFromNetworkV2', () => {
		const block = {
			id: '5',
			previousBlock: '2',
			height: 3,
			version: 2,
		};

		beforeEach(async () => {
			sinonSandbox.stub(blocksInstance, '_forkChoiceTask').resolves();
			sequenceStub.add.callsFake(async fn => {
				await fn();
			});
		});

		it('should call _forkChoiceTask with proper arguments', async () => {
			await blocksInstance._receiveBlockFromNetworkV2(block);
			expect(blocksInstance._forkChoiceTask).to.be.calledWith(block);
		});

		it('should abort if _isActive is true and throw an exception', async () => {
			blocksInstance._isActive = true;

			expect(
				blocksInstance._receiveBlockFromNetworkV2(block),
			).to.eventually.be.rejectedWith(
				'Block process cannot be executed in parallel',
			);
			expect(blocksInstance._forkChoiceTask).to.not.be.called;
		});
	});

	describe('_forkChoiceTask', () => {
		it('should be an async function', async () => {
			expect(blocksInstance._forkChoiceTask.constructor.name).to.equal(
				'AsyncFunction',
			);
		});

		const defaults = {};
		const stubs = {};
		let newBlockReceivedAt;
		let newBlockForgingTime;

		beforeEach(async () => {
			defaults.lastBlock = {
				id: '1',
				height: 1,
				version: 2,
				timestamp: blocksInstance.slots.getTime(Date.now()),
			};

			defaults.newBlock = {
				id: '2',
				height: 2,
				version: 2,
				timestamp: blocksInstance.slots.getTime(Date.now()),
			};

			newBlockForgingTime = blocksInstance.slots.getTime();
			newBlockReceivedAt = newBlockForgingTime;

			stubs.isValidBlock = sinonSandbox
				.stub(forkChoiceRule, 'isValidBlock')
				.returns(false);
			stubs.isIdenticalBlock = sinonSandbox
				.stub(forkChoiceRule, 'isIdenticalBlock')
				.returns(false);
			stubs.isDoubleForging = sinonSandbox
				.stub(forkChoiceRule, 'isDoubleForging')
				.returns(false);
			stubs.isTieBreak = sinonSandbox
				.stub(forkChoiceRule, 'isTieBreak')
				.returns(false);
			stubs.isDifferentChain = sinonSandbox
				.stub(forkChoiceRule, 'isDifferentChain')
				.returns(false);

			blocksInstance._lastBlock = defaults.lastBlock;
		});

		it('should call _handleSameBlockReceived if _isIdenticalBlock evaluates to true', async () => {
			const handleSameBlockReceived = sinonSandbox.stub(
				blocksInstance,
				'_handleSameBlockReceived',
			);
			stubs.isIdenticalBlock.returns(true);

			await blocksInstance._forkChoiceTask(
				defaults.newBlock,
				newBlockReceivedAt,
			);
			expect(stubs.isIdenticalBlock).to.be.calledWith(
				defaults.lastBlock,
				defaults.newBlock,
			);
			expect(handleSameBlockReceived).to.be.calledWith(defaults.newBlock);
		});

		it('should call _handleValidBlock if _isValidBlock evaluates to true', async () => {
			const handleValidBlock = sinonSandbox.stub(
				blocksInstance,
				'_handleValidBlock',
			);
			stubs.isValidBlock.returns(true);

			await blocksInstance._forkChoiceTask(
				defaults.newBlock,
				newBlockReceivedAt,
			);
			expect(stubs.isValidBlock).to.be.calledWith(
				defaults.lastBlock,
				defaults.newBlock,
			);
			expect(handleValidBlock).to.be.calledWith(defaults.newBlock);
		});
		//
		describe('when double forging', () => {
			it('should call _handleDoubleForging if _isDoubleForging evaluates to true', async () => {
				const handleDoubleForging = sinonSandbox.stub(
					blocksInstance,
					'_handleDoubleForging',
				);
				stubs.isDoubleForging.returns(true);

				await blocksInstance._forkChoiceTask(
					defaults.newBlock,
					newBlockReceivedAt,
				);
				expect(stubs.isDoubleForging).to.be.calledWith(
					defaults.lastBlock,
					defaults.newBlock,
				);
				expect(handleDoubleForging).to.be.calledWith(
					defaults.newBlock,
					defaults.lastBlock,
				);
			});

			it('should call _handleDoubleForgingTieBreak if _isTieBreak evaluates to true', async () => {
				const aTime = blocksInstance.slots.getTime();
				const handleDoubleForgingTieBreak = sinonSandbox.stub(
					blocksInstance,
					'_handleDoubleForgingTieBreak',
				);
				stubs.isTieBreak.returns(true);

				blocksInstance._lastReceipt = aTime;
				blocksInstance._lastReceivedAndAppliedBlock = {
					id: defaults.lastBlock.id,
					receivedTime: defaults.lastBlock.timestamp,
				};

				await blocksInstance._forkChoiceTask(
					defaults.newBlock,
					newBlockReceivedAt,
				);
				expect(stubs.isTieBreak).to.be.calledWith({
					slots: blocksInstance.slots,
					lastAppliedBlock: defaults.lastBlock,
					receivedBlock: defaults.newBlock,
				});
				expect(handleDoubleForgingTieBreak).to.be.calledWith(
					defaults.newBlock,
					defaults.lastBlock,
				);
			});
		});

		describe('moving to a different chain', () => {
			it('should call _handleMovingToDifferentChain if _isDifferentChain evaluates to true', async () => {
				const handleMovingToDifferentChain = sinonSandbox.stub(
					blocksInstance,
					'_handleMovingToDifferentChain',
				);
				stubs.isDifferentChain.returns(true);

				await blocksInstance._forkChoiceTask(
					defaults.newBlock,
					newBlockReceivedAt,
				);
				expect(stubs.isDifferentChain).to.be.calledWith(
					defaults.lastBlock,
					defaults.newBlock,
				);
				expect(handleMovingToDifferentChain).to.be.called;
			});
		});

		it('should call _handleDiscardedBlock if no conditions are met', async () => {
			const handleDiscardedBlock = sinonSandbox.stub(
				blocksInstance,
				'_handleDiscardedBlock',
			);

			await blocksInstance._forkChoiceTask(
				defaults.newBlock,
				newBlockReceivedAt,
			);

			expect(handleDiscardedBlock).to.be.calledWith(defaults.newBlock);
		});
	});

	describe('_handleSameBlockReceived', () => {
		it('should debug log that the block is already processed', async () => {
			const block = {
				id: '1',
			};
			blocksInstance._handleSameBlockReceived(block);
			expect(loggerStub.debug).to.be.calledWith('Block already processed');
		});
	});

	describe('_handleValidBlock', () => {
		it('should call _processReceivedBlock with the given block', async () => {
			const block = {
				id: '1',
				version: 2,
			};

			const _processBlock = sinonSandbox.stub(
				blocksInstance,
				'_processReceivedBlock',
			);

			await blocksInstance._handleValidBlock(block);
			expect(_processBlock).to.be.calledWith(block);
		});
	});

	describe('_handleDoubleForging', () => {
		const lastBlock = {
			id: '1',
			height: 1,
			generatorPublicKey: 'abcde',
		};

		const newBlock = {
			id: '2',
			height: lastBlock.height + 1,
			generatorPublicKey: lastBlock.generatorPublicKey,
		};

		it('should debug log that the delegate is forging on multiple nodes', async () => {
			blocksInstance._handleDoubleForging(newBlock, lastBlock);
			expect(loggerStub.debug).to.be.calledWith(
				'Delegate forging on multiple nodes',
				newBlock.generatorPublicKey,
			);
		});

		it('should debug log that the last block stands and the new block is discarded', async () => {
			blocksInstance._handleDoubleForging(newBlock, lastBlock);
			expect(loggerStub.debug).to.be.calledWith(
				`Last block ${lastBlock.id} stands, new block ${
					newBlock.id
				} is discarded`,
			);
		});
	});

	describe('_handleDoubleForgingTieBreak', () => {
		const lastBlock = {
			height: 1,
			id: '1',
			generatorPublicKey: 'abcde',
			version: 1,
		};

		const newBlock = {
			height: lastBlock.height,
			id: '2',
			generatorPublicKey: lastBlock.generatorPublicKey,
			version: 2,
		};

		const stubs = {};

		beforeEach(async () => {
			stubs.normalizeAndVerify = sinonSandbox
				.stub(blocksInstance.blocksVerify, 'normalizeAndVerify')
				.resolves({
					verified: true,
					errors: [],
				});

			stubs.deleteLastBlockAndGet = sinonSandbox
				.stub(blocksInstance, 'deleteLastBlockAndGet')
				.resolves();

			stubs.processReceivedBlock = sinonSandbox
				.stub(blocksInstance, '_processReceivedBlock')
				.resolves();

			blocksInstance._lastBlock = {
				version: 1,
				id: '0',
			};
		});

		it('should call normalizeAndVerify with the new block', async () => {
			await blocksInstance._handleDoubleForgingTieBreak(newBlock, lastBlock);

			expect(stubs.normalizeAndVerify).to.be.calledWith(newBlock);
		});

		it('should error log verification failed if any of the steps above fail, error log that case 4 fork recovery failed and throw the error', async () => {
			const normalizeAndVerifyReturn = {
				verified: false,
				errors: ['firstError', 'secondError'],
			};

			stubs.normalizeAndVerify.resolves(normalizeAndVerifyReturn);

			try {
				await blocksInstance._handleDoubleForgingTieBreak(newBlock, lastBlock);
			} catch (e) {
				expect(e.message).to.equal(
					'Fork Choice Case 4 recovery failed because block 2 verification and normalization failed',
				);
			}

			expect(loggerStub.error).to.be.calledWith(
				normalizeAndVerifyReturn.errors,
				`Fork Choice Case 4 recovery failed because block ${
					newBlock.id
				} verification and normalization failed`,
			);
		});

		it('should debug log that the last block is getting deleted due to case 4', async () => {
			await blocksInstance._handleDoubleForgingTieBreak(newBlock, lastBlock);

			expect(loggerStub.debug).to.be.calledWith(
				`Deleting last block with id: ${
					lastBlock.id
				} due to Fork Choice Rule Case 4`,
			);
		});

		it('should delete the last block, process the new one', async () => {
			await blocksInstance._handleDoubleForgingTieBreak(newBlock, lastBlock);

			expect(stubs.deleteLastBlockAndGet).to.be.called;
			expect(stubs.processReceivedBlock).to.be.calledWith(newBlock);
		});

		it('should error log if the applying the newly received block fails ', async () => {
			stubs.processReceivedBlock
				.withArgs(newBlock)
				.rejects('Error while processing the block');

			const previousLastBlock = cloneDeep(blocksInstance._lastBlock);
			await blocksInstance._handleDoubleForgingTieBreak(newBlock, lastBlock);
			expect(loggerStub.error).to.be.calledWith(
				`Failed to apply newly received block with id: ${
					newBlock.id
				}, restoring previous block ${previousLastBlock.id}`,
			);
		});

		it('should restore the last block if processing the new block fails', async () => {
			const previousLastBlock = cloneDeep(blocksInstance._lastBlock);
			stubs.processReceivedBlock.withArgs(newBlock).rejects();
			stubs.processReceivedBlock.withArgs(previousLastBlock).resolves();
			await blocksInstance._handleDoubleForgingTieBreak(newBlock, lastBlock);

			expect(stubs.deleteLastBlockAndGet).to.be.called;
			expect(stubs.processReceivedBlock.getCall(0)).to.be.calledWith(newBlock);
			expect(stubs.processReceivedBlock.getCall(1)).to.be.calledWith(
				previousLastBlock,
			);
		});
	});

	describe('_handleMovingToDifferentChain', () => {
		it('should determine if using Block Sync Mechanism or Fast Chain Switching to move to a different chain ', async () => {});
	});

	describe('_handleDiscardedBlock', () => {
		it('should warn log that the discarded block does not match with the current chain', async () => {
			const block = {
				id: '1',
				height: 1,
				timestamp: Date.now(),
				generatorPublicKey: 'abcdef',
			};

			blocksInstance._handleDiscardedBlock(block);

			expect(loggerStub.debug).to.be.calledWith(
				`Discarded block that does not match with current chain: ${
					block.id
				} height: ${block.height} round: ${slots.calcRound(
					block.height,
				)} slot: ${slots.getSlotNumber(block.timestamp)} generator: ${
					block.generatorPublicKey
				}`,
			);
		});
	});

	describe('_processReceivedBlock', () => {
		const stubs = {};
		const block = {
			version: 1,
			height: 1,
			id: '2',
			timestamp: Date.now(),
			reward: 2,
		};

		beforeEach(async () => {
			stubs.updateLastReceipt = sinonSandbox.stub(
				blocksInstance,
				'_updateLastReceipt',
			);

			stubs.updateBroadhash = sinonSandbox.stub(
				blocksInstance,
				'_updateBroadhash',
			);

			stubs.processBlock = sinonSandbox
				.stub(blocksInstance.blocksProcess, 'processBlock')
				.resolves(block);
		});

		it('should update the last receipt', async () => {
			await blocksInstance._processReceivedBlock(block);
			expect(stubs.updateLastReceipt).to.be.called;
		});

		it('should call processBlock with the new block without receivedAt property', async () => {
			await blocksInstance._processReceivedBlock(block);
			const { receivedAt, ...blockWithoutReceivedAt } = block;
			expect(stubs.processBlock).to.be.calledWith(blockWithoutReceivedAt);
		});

		it('should debug log that the block has been successfully applied if so', async () => {
			const expectedErrorMessage = `Successfully applied new received block id: ${
				block.id
			} height: ${block.height} round: ${blocksInstance.slots.calcRound(
				block.height,
			)} slot: ${blocksInstance.slots.getSlotNumber(block.timestamp)} reward: ${
				block.reward
			} version: ${block.version}`;
			await blocksInstance._processReceivedBlock(block);

			expect(loggerStub.debug).to.be.calledWith(expectedErrorMessage);
		});

		it('should update the broadhash', async () => {
			await blocksInstance._processReceivedBlock(block);
			expect(stubs.updateBroadhash).to.be.called;
		});

		it('should assign the new last block to _lastBlock and _isActive to false', async () => {
			await blocksInstance._processReceivedBlock(block);
			expect(blocksInstance._lastBlock).to.equal(block);
			expect(blocksInstance._isActive).to.be.false;
		});

		it('should error log that apply the new received block failed with the error', async () => {
			// Arrange
			const error = new Error('This is an error');
			const expectedErrorMessage = `Failed to apply new received block id: ${
				block.id
			} height: ${block.height} round: ${blocksInstance.slots.calcRound(
				block.height,
			)} slot: ${blocksInstance.slots.getSlotNumber(block.timestamp)} reward: ${
				block.reward
			} version: ${block.version}`;
			stubs.processBlock.rejects(error);

			try {
				// Act
				await blocksInstance._processReceivedBlock(block);
			} catch (e) {
				// Assert
				expect(loggerStub.error).to.be.calledWith(error, expectedErrorMessage);
				expect(blocksInstance._isActive).to.be.false;
			}
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
					'Unable to rebuild, blockchain should contain at least one round of blocks',
				);
			}
		});

		it('should throw an error when called with rebuildUpToRound = string', async () => {
			try {
				await blocksInstance._rebuildMode(
					'type string = invalid',
					ACTIVE_DELEGATES,
				);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero',
				);
			}
		});

		it('should throw an error when called with rebuildUpToRound = boolean', async () => {
			try {
				await blocksInstance._rebuildMode(true, ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero',
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
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero',
				);
			}
		});

		it('should throw an error when called with rebuildUpToRound = undefined', async () => {
			try {
				await blocksInstance._rebuildMode(undefined, ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero',
				);
			}
		});

		it('should emit an event with proper error when resetMemTables fails', async () => {
			storageStub.entities.Account.resetMemTables.rejects(
				new Error('Account#resetMemTables error'),
			);
			try {
				await blocksInstance._rebuildMode(2, ACTIVE_DELEGATES);
			} catch (error) {
				expect(error.message).to.eql('Account#resetMemTables error');
			}
		});

		it('should emit an event with proper error when loadBlocksOffset fails', async () => {
			blocksUtils.loadBlocksWithOffset.rejects(
				new Error('loadBlocksOffsetStub#ERR'),
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
