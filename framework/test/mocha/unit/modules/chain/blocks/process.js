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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const BigNum = require('@liskhq/bignum');
const {
	registeredTransactions,
} = require('../../../../common/registered_transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../src/modules/chain/interface_adapters');
const transactionsModule = require('../../../../../../src/modules/chain/transactions');
const { Slots } = require('../../../../../../src/modules/chain/dpos');
const {
	calculateMilestone,
	calculateReward,
	calculateSupply,
} = require('../../../../../../src/modules/chain/blocks/block_reward');
const blocksLogic = require('../../../../../../src/modules/chain/blocks/block');
const blocksUtils = require('../../../../../../src/modules/chain/blocks/utils');

describe('blocks/process', () => {
	const interfaceAdapters = {
		transactions: new TransactionInterfaceAdapter(registeredTransactions),
	};

	let blocksProcess;
	let storageStub;
	let lastDummyBlock;
	let dummyBlock;
	let blocksVerifyStub;
	let blocksChainStub;
	let applyTransactionsStub;
	let checkAllowedTransactionsStub;
	let exceptions;
	let slots;
	let constants;
	let blockReward;

	beforeEach(async () => {
		exceptions = __testContext.config.modules.chain.exceptions;
		storageStub = {
			entities: {
				Block: {
					isPersisted: sinonSandbox.stub(),
					get: sinonSandbox.stub(),
					getOne: sinonSandbox.stub().resolves([lastDummyBlock]),
				},
				Account: {
					resetMemTables: sinonSandbox.stub(),
				},
			},
		};

		blocksVerifyStub = {
			verifyBlock: sinonSandbox.stub(),
			checkExists: sinonSandbox.stub(),
			validateBlockSlot: sinonSandbox.stub(),
			checkTransactions: sinonSandbox.stub(),
		};

		blocksVerifyStub.verifyBlock
			.onFirstCall()
			.returns({ verified: false, errors: [] });
		blocksVerifyStub.verifyBlock
			.onSecondCall()
			.returns({ verified: true, errors: [] });

		blocksChainStub = {
			applyBlock: sinonSandbox.stub(),
			applyGenesisBlock: sinonSandbox.stub(),
			deleteLastBlock: sinonSandbox.stub(),
		};
		lastDummyBlock = {
			id: '3',
			height: 3,
			timestamp: 41287221,
			reward: new BigNum(100),
			transactions: [],
		};
		dummyBlock = {
			id: '4',
			height: 4,
			timestamp: 41287231,
			reward: new BigNum(100),
			transactions: [],
		};
		sinonSandbox.stub(blocksLogic, 'objectNormalize').callsFake(input => input);
		sinonSandbox.stub(blocksLogic, 'create').returns(dummyBlock);

		applyTransactionsStub = sinonSandbox.stub();
		sinonSandbox
			.stub(transactionsModule, 'applyTransactions')
			.returns(applyTransactionsStub);
		checkAllowedTransactionsStub = sinonSandbox.stub();
		sinonSandbox
			.stub(transactionsModule, 'checkAllowedTransactions')
			.returns(checkAllowedTransactionsStub);

		slots = new Slots({
			epochTime: __testContext.config.constants.EPOCH_TIME,
			interval: __testContext.config.constants.BLOCK_TIME,
			blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
		});

		const blockRewardArgs = {
			distance: __testContext.config.constants.REWARDS.DISTANCE,
			rewardOffset: __testContext.config.constants.REWARDS.DISTANCE,
			milestones: __testContext.config.constants.REWARDS.MILESTONES,
			totalAmount: __testContext.config.constants.TOTAL_AMOUNT,
		};

		blockReward = {
			calculateMilestone: height => calculateMilestone(height, blockRewardArgs),
			calculateSupply: height => calculateSupply(height, blockRewardArgs),
			calculateReward: height => calculateReward(height, blockRewardArgs),
		};

		constants = {
			blockReceiptTimeout: __testContext.config.constants.BLOCK_RECEIPT_TIMEOUT,
			maxPayloadLength: __testContext.config.constants.MAX_PAYLOAD_LENGTH,
			maxTransactionsPerBlock:
				__testContext.config.constants.MAX_TRANSACTIONS_PER_BLOCK,
			loadPerIteration: 1000,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
			blockSlotWindow: __testContext.config.constants.BLOCK_SLOT_WINDOW,
		};
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(blocksProcess.blocksVerify).to.eql(blocksVerifyStub);
			expect(blocksProcess.blocksChain).to.eql(blocksChainStub);
			expect(blocksProcess.storage).to.eql(storageStub);
			expect(blocksProcess.interfaceAdapters).to.eql(interfaceAdapters);
			expect(blocksProcess.slots).to.eql(slots);
			expect(blocksProcess.exceptions).to.eql(exceptions);
			expect(blocksProcess.blockReward).to.eql(blockReward);
			expect(blocksProcess.constants).to.eql(constants);
			expect(blocksProcess.genesisBlock).to.eql(
				__testContext.config.genesisBlock,
			);
		});
	});

	describe('processBlock', () => {
		beforeEach(async () => {
			sinonSandbox
				.stub(blocksUtils, 'addBlockProperties')
				.callsFake(input => input);
		});

		it('should throw error if verified is not true', async () => {
			const errors = [new Error('verify error')];
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: false, errors });

			try {
				await blocksProcess.processBlock(dummyBlock, lastDummyBlock);
			} catch (errs) {
				expect(errs).to.eql(errors);
			}
		});

		it('should call broadcast if supplied', async () => {
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: true, errors: [] });

			const broadcast = sinonSandbox.stub();
			await blocksProcess.processBlock(dummyBlock, lastDummyBlock, broadcast);
			expect(broadcast).to.be.called;
		});

		it('should call apply block with save true', async () => {
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: true, errors: [] });
			await blocksProcess.processBlock(dummyBlock, lastDummyBlock);
			expect(blocksChainStub.applyBlock).to.be.calledWith(dummyBlock, true);
		});

		it('should call addBlockProperties if not broadcast is supplied', async () => {
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: true, errors: [] });

			await blocksProcess.applyBlock(dummyBlock, lastDummyBlock);
			expect(blocksUtils.addBlockProperties).to.be.called;
		});
	});

	describe('applyBlock', () => {
		it('should throw error if verified is not true', async () => {
			const errors = [new Error('verify error')];
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: false, errors });

			try {
				await blocksProcess.applyBlock(dummyBlock, lastDummyBlock);
			} catch (errs) {
				expect(errs).to.eql(errors);
			}
		});

		it('should call validateBlockSlot', async () => {
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: true, errors: [] });

			await blocksProcess.applyBlock(dummyBlock, lastDummyBlock);
			expect(blocksVerifyStub.validateBlockSlot).to.be.calledWith(dummyBlock);
		});

		it('should call checkTransactions', async () => {
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: true, errors: [] });

			await blocksProcess.applyBlock(dummyBlock, lastDummyBlock);
			expect(blocksVerifyStub.checkTransactions).to.be.calledWith(dummyBlock);
		});

		it('should call apply block with save false', async () => {
			blocksVerifyStub.verifyBlock = sinonSandbox
				.stub()
				.returns({ verified: true, errors: [] });

			await blocksProcess.applyBlock(dummyBlock, lastDummyBlock);
			expect(blocksChainStub.applyBlock).to.be.calledWith(dummyBlock, false);
		});
	});

	describe('generateBlock', () => {
		const timestamp = 41287231;
		const keypair = {
			publicKey: Buffer.from('publicKey', 'utf8'),
			privateKey: Buffer.from('publicKey', 'utf8'),
		};
		const lastBlock = {
			height: 100,
			id: 1,
		};

		describe('when transaction is an empty array', () => {
			describe('when query returns empty array', () => {
				beforeEach(async () => {
					applyTransactionsStub.resolves({
						transactionsResponses: [],
					});
					checkAllowedTransactionsStub.returns({
						transactionsResponses: [],
					});
				});

				it('should call create with the parameter', async () => {
					await blocksProcess.generateBlock(lastBlock, keypair, timestamp, []);
					expect(blocksLogic.create).to.be.calledWith({
						blockReward,
						previousBlock: lastBlock,
						transactions: [],
						maxPayloadLength: constants.maxPayloadLength,
						keypair,
						timestamp,
						version: 1,
						maxHeightPreviouslyForged: 1,
						prevotedConfirmedUptoHeight: 1,
						height: lastBlock.height + 1,
					});
				});
			});

			describe('when transactions are supplied', () => {
				const transactions = [
					{ id: 1, type: 0, matcher: () => true },
					{ id: 2, type: 1, matcher: () => true },
				];

				beforeEach(async () => {
					checkAllowedTransactionsStub.returns({
						transactionsResponses: [
							{
								id: 1,
								status: TransactionStatus.OK,
								errors: [],
							},
							{
								id: 2,
								status: TransactionStatus.OK,
								errors: [],
							},
						],
					});
				});

				describe('transactions.applyTransactions', () => {
					describe('when transaction initializations fail', () => {
						beforeEach(async () =>
							applyTransactionsStub.rejects(new Error('Invalid field types')),
						);

						it('should call a callback with error', async () => {
							try {
								await blocksProcess.generateBlock(
									lastBlock,
									keypair,
									timestamp,
									transactions,
								);
							} catch (err) {
								expect(err.message).to.eql('Invalid field types');
							}
						});
					});

					describe('when transactions processing fails', () => {
						beforeEach(async () =>
							applyTransactionsStub.resolves({
								transactionsResponses: [
									{ id: 1, status: 0, errors: [] },
									{ id: 2, status: 0, errors: [] },
								],
							}),
						);

						it('should generate block without transactions', async () => {
							const block = await blocksProcess.generateBlock(
								lastBlock,
								keypair,
								timestamp,
								transactions,
							);
							expect(blocksLogic.create).to.be.calledWith({
								blockReward,
								previousBlock: lastBlock,
								transactions: [],
								maxPayloadLength: constants.maxPayloadLength,
								keypair,
								timestamp,
								version: 1,
								maxHeightPreviouslyForged: 1,
								prevotedConfirmedUptoHeight: 1,
								height: lastBlock.height + 1,
							});
							expect(block).to.equal(dummyBlock);
						});
					});

					describe('when transactions processing succeeds', () => {
						beforeEach(async () => {
							applyTransactionsStub.resolves({
								transactionsResponses: [
									{ id: 1, status: 1, errors: [] },
									{ id: 2, status: 1, errors: [] },
								],
							});
						});

						it('should generate block with transactions', async () => {
							const block = await blocksProcess.generateBlock(
								lastBlock,
								keypair,
								timestamp,
								transactions,
							);
							expect(blocksLogic.create).to.be.calledWith({
								blockReward,
								previousBlock: lastBlock,
								transactions,
								maxPayloadLength: constants.maxPayloadLength,
								keypair,
								timestamp,
								version: 1,
								maxHeightPreviouslyForged: 1,
								prevotedConfirmedUptoHeight: 1,
								height: lastBlock.height + 1,
							});
							expect(block).to.equal(dummyBlock);
						});
					});

					describe('when transactions pending', () => {
						beforeEach(async () =>
							applyTransactionsStub.resolves({
								transactionsResponses: [{ id: 1, status: 2, errors: [] }],
							}),
						);

						it('should generate block without pending transactions', async () => {
							const block = await blocksProcess.generateBlock(
								lastBlock,
								keypair,
								timestamp,
								transactions,
							);
							expect(blocksLogic.create).to.be.calledWith({
								blockReward,
								previousBlock: lastBlock,
								transactions: [],
								maxPayloadLength: constants.maxPayloadLength,
								keypair,
								timestamp,
								version: 1,
								maxHeightPreviouslyForged: 1,
								prevotedConfirmedUptoHeight: 1,
								height: lastBlock.height + 1,
							});
							expect(block).to.equal(dummyBlock);
						});
					});
				});
			});

			it('should call checkAllowedTransactions with proper arguments', async () => {
				const sampleTransactons = [
					{
						id: 'aTransactionId',
						matcher: () => true,
						type: 0,
					},
				];
				const state = {
					blockTimestamp: timestamp,
				};

				checkAllowedTransactionsStub.returns({
					transactionsResponses: [
						{
							id: sampleTransactons[0],
							status: TransactionStatus.OK,
						},
					],
				});
				applyTransactionsStub.resolves({
					transactionsResponses: [
						{
							id: sampleTransactons[0],
							status: TransactionStatus.OK,
						},
					],
				});
				await blocksProcess.generateBlock(
					lastBlock,
					keypair,
					timestamp,
					sampleTransactons,
				);
				expect(
					transactionsModule.checkAllowedTransactions,
				).to.have.been.calledWith(state);
			});
		});
	});

	describe('recoverInvalidOwnChain', () => {
		let onDelete;
		let beforeLastDummyBlock;
		beforeEach(async () => {
			beforeLastDummyBlock = {
				id: '2',
				height: 2,
				timestamp: 41287211,
				reward: new BigNum(100),
				transactions: [],
			};
			onDelete = sinonSandbox.stub();
			blocksChainStub.deleteLastBlock.resolves(beforeLastDummyBlock);
		});

		it('should call deleteLastBlock', async () => {
			sinonSandbox
				.stub(blocksLogic, 'loadBlockByHeight')
				.resolves(beforeLastDummyBlock);
			await blocksProcess.recoverInvalidOwnChain(lastDummyBlock, onDelete);
			expect(blocksChainStub.deleteLastBlock).to.be.calledWith(lastDummyBlock);
		});

		it('should call onDelete', async () => {
			sinonSandbox
				.stub(blocksLogic, 'loadBlockByHeight')
				.resolves(beforeLastDummyBlock);
			await blocksProcess.recoverInvalidOwnChain(lastDummyBlock, onDelete);
			expect(onDelete.firstCall.args).to.be.eql([
				lastDummyBlock,
				beforeLastDummyBlock,
			]);
		});

		it('should call verifyBlock with the new last block', async () => {
			sinonSandbox
				.stub(blocksLogic, 'loadBlockByHeight')
				.resolves(beforeLastDummyBlock);
			await blocksProcess.recoverInvalidOwnChain(lastDummyBlock, onDelete);
			expect(blocksVerifyStub.verifyBlock).to.be.calledWith(
				lastDummyBlock,
				beforeLastDummyBlock,
			);
		});
	});

	describe('reload', () => {
		let isCleaning;
		let onProgress;
		let newLastBlock;

		beforeEach(async () => {
			isCleaning = sinonSandbox.stub();
			onProgress = sinonSandbox.stub();
			newLastBlock = {
				id: '1',
			};
			sinonSandbox.stub(blocksProcess, '_rebuild').resolves(newLastBlock);
		});

		it('should call resetMemTables', async () => {
			await blocksProcess.reload(100, isCleaning, onProgress);
			expect(storageStub.entities.Account.resetMemTables).to.be.calledOnce;
		});

		it('should return result of _rebuild', async () => {
			const newBlock = await blocksProcess.reload(100, isCleaning, onProgress);
			expect(newBlock).to.equal(newLastBlock);
		});
	});

	describe('_rebuild', () => {
		let isCleaning;
		let onProgress;
		let loadedBlocks;

		beforeEach(async () => {
			isCleaning = sinonSandbox.stub().returns(false);
			onProgress = sinonSandbox.stub();
			loadedBlocks = [
				{ id: '6524861224470851795', height: 1 },
				{ id: '2', height: 2 },
				{ id: '3', height: 3 },
				{ id: '4', height: 4 },
				{ id: '5', height: 5 },
			];
			sinonSandbox.stub(blocksProcess, 'applyBlock').callsFake(block => block);
			sinonSandbox
				.stub(blocksLogic, 'loadBlocksWithOffset')
				.resolves(loadedBlocks);
		});

		it('should call loadBlocksWithOffset', async () => {
			await blocksProcess._rebuild(
				0,
				dummyBlock,
				5,
				isCleaning,
				onProgress,
				10,
			);
			expect(blocksLogic.loadBlocksWithOffset).to.be.calledWith(
				storageStub,
				interfaceAdapters,
				blocksProcess.genesisBlock,
				10,
				0,
			);
		});

		it('should call return last block when is cleaning is true', async () => {
			isCleaning.onCall(0).returns(false);
			isCleaning.onCall(1).returns(false);
			isCleaning.onCall(2).returns(true);
			await blocksProcess._rebuild(
				0,
				dummyBlock,
				5,
				isCleaning,
				onProgress,
				10,
			);
			expect(blocksProcess.applyBlock).to.be.calledOnce;
		});

		it('should call on progress per block', async () => {
			await blocksProcess._rebuild(
				0,
				dummyBlock,
				5,
				isCleaning,
				onProgress,
				10,
			);
			expect(onProgress).to.be.callCount(5);
		});

		it('should call apply genesisBlock if block id is the same as genesis block', async () => {
			await blocksProcess._rebuild(
				0,
				dummyBlock,
				5,
				isCleaning,
				onProgress,
				10,
			);
			expect(blocksChainStub.applyGenesisBlock).to.be.calledOnce;
		});

		it('should call loadBlocksWithOffset second time with the next currentHeight', async () => {
			blocksLogic.loadBlocksWithOffset
				.onCall(0)
				.resolves([...loadedBlocks].slice(0, 3));
			blocksLogic.loadBlocksWithOffset
				.onCall(1)
				.resolves([...loadedBlocks].slice(3, 5));
			await blocksProcess._rebuild(
				0,
				dummyBlock,
				5,
				isCleaning,
				onProgress,
				10,
			);
			expect(blocksLogic.loadBlocksWithOffset).to.be.calledTwice;
		});
	});
});
