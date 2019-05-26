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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const Bignum = require('../../../../../../src/modules/chain/helpers/bignum');
const blockVersion = require('../../../../../../src/modules/chain/blocks/block_version');
const {
	registeredTransactions,
} = require('../../../../common/registered_transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../src/modules/chain/interface_adapters');
const transactionsModule = require('../../../../../../src/modules/chain/transactions');
const {
	BlocksProcess,
} = require('../../../../../../src/modules/chain/blocks/process');
const {
	BlockSlots,
} = require('../../../../../../src/modules/chain/blocks/block_slots');
const {
	BlockReward,
} = require('../../../../../../src/modules/chain/blocks/block_reward');
const blocksLogic = require('../../../../../../src/modules/chain/blocks/block');

describe('blocks/process', () => {
	const interfaceAdapters = {
		transactions: new TransactionInterfaceAdapter(registeredTransactions),
	};

	let blocksProcess;
	let storageStub;
	let dummyBlock;
	let dummyCommonBlock;
	let genesisBlockStub;
	let blocksVerifyStub;
	let blocksChainStub;
	let verifyTransactionsStub;
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
				},
			},
		};

		blocksVerifyStub = {};

		blocksChainStub = {};

		genesisBlockStub = {
			block: {
				id: '6524861224470851795',
				height: 1,
				previousBlock: null,
			},
		};
		dummyBlock = {
			id: '4',
			height: 4,
			timestamp: 41287231,
			reward: new Bignum(100),
			transactions: [],
		};
		sinonSandbox.stub(blocksLogic, 'objectNormalize');
		sinonSandbox.stub(blocksLogic, 'create').returns(dummyBlock);

		dummyCommonBlock = { id: '3', previousBlock: '2', height: '3' };

		verifyTransactionsStub = sinonSandbox.stub();
		sinonSandbox
			.stub(transactionsModule, 'verifyTransactions')
			.returns(verifyTransactionsStub);
		checkAllowedTransactionsStub = sinonSandbox.stub();
		sinonSandbox
			.stub(transactionsModule, 'checkAllowedTransactions')
			.returns(checkAllowedTransactionsStub);

		slots = new BlockSlots({
			epochTime: __testContext.config.constants.EPOCH_TIME,
			interval: __testContext.config.constants.BLOCK_TIME,
			blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
		});

		blockReward = new BlockReward({
			distance: __testContext.config.constants.REWARDS.DISTANCE,
			rewardOffset: __testContext.config.constants.REWARDS.DISTANCE,
			milestones: __testContext.config.constants.REWARDS.MILESTONES,
			totalAmount: __testContext.config.constants.TOTAL_AMOUNT,
		});

		constants = {
			blockReceiptTimeout: __testContext.config.constants.BLOCK_RECEIPT_TIMEOUT,
			maxPayloadLength: __testContext.config.constants.MAX_PAYLOAD_LENGTH,
			maxTransactionsPerBlock:
				__testContext.config.constants.MAX_TRANSACTIONS_PER_BLOCK,
			loadPerIteration: 1000,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
			blockSlotWindow: __testContext.config.constants.BLOCK_SLOT_WINDOW,
		};

		// Modules

		blocksProcess = new BlocksProcess({
			blocksVerify: blocksVerifyStub,
			blocksChain: blocksChainStub,
			storage: storageStub,
			exceptions,
			slots,
			interfaceAdapters,
			genesisBlock: __testContext.config.genesisBlock,
			blockReward,
			constants,
		});
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
				__testContext.config.genesisBlock
			);
		});
	});

	describe('processBlock', () => {});

	describe('applyBlock', () => {});

	describe('recoverInvalidOwnChain', () => {});

	describe('reload', () => {});

	describe('_rebuild', () => {});

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
					verifyTransactionsStub.resolves({
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

				describe('transactions.verifyTransactions', () => {
					describe('when transaction initializations fail', () => {
						beforeEach(async () =>
							verifyTransactionsStub.rejects(new Error('Invalid field types'))
						);

						it('should call a callback with error', async () => {
							try {
								await blocksProcess.generateBlock(
									lastBlock,
									keypair,
									timestamp,
									transactions
								);
							} catch (err) {
								expect(err.message).to.eql('Invalid field types');
							}
						});
					});

					describe('when transactions verification fails', () => {
						beforeEach(async () =>
							verifyTransactionsStub.resolves({
								transactionsResponses: [
									{ id: 1, status: 0, errors: [] },
									{ id: 2, status: 0, errors: [] },
								],
							})
						);

						it('should generate block without transactions', async () => {
							const block = await blocksProcess.generateBlock(
								lastBlock,
								keypair,
								timestamp,
								transactions
							);
							expect(blocksLogic.create).to.be.calledWith({
								blockReward,
								previousBlock: lastBlock,
								transactions: [],
								maxPayloadLength: constants.maxPayloadLength,
								keypair,
								timestamp,
							});
							expect(block).to.equal(dummyBlock);
						});
					});

					describe('when transactions verification succeeds', () => {
						beforeEach(async () => {
							verifyTransactionsStub.resolves({
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
								transactions
							);
							expect(blocksLogic.create).to.be.calledWith({
								blockReward,
								previousBlock: lastBlock,
								transactions,
								maxPayloadLength: constants.maxPayloadLength,
								keypair,
								timestamp,
							});
							expect(block).to.equal(dummyBlock);
						});
					});

					describe('when transactions pending', () => {
						beforeEach(async () =>
							verifyTransactionsStub.resolves({
								transactionsResponses: [{ id: 1, status: 2, errors: [] }],
							})
						);

						it('should generate block without pending transactions', async () => {
							const block = await blocksProcess.generateBlock(
								lastBlock,
								keypair,
								timestamp,
								transactions
							);
							expect(blocksLogic.create).to.be.calledWith({
								blockReward,
								previousBlock: lastBlock,
								transactions: [],
								maxPayloadLength: constants.maxPayloadLength,
								keypair,
								timestamp,
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
					blockHeight: lastBlock.height + 1,
					blockVersion: blockVersion.currentBlockVersion,
				};

				checkAllowedTransactionsStub.returns({
					transactionsResponses: [
						{
							id: sampleTransactons[0],
							status: TransactionStatus.OK,
						},
					],
				});
				verifyTransactionsStub.resolves({
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
					sampleTransactons
				);
				expect(
					transactionsModule.checkAllowedTransactions
				).to.have.been.calledWith(state);
			});
		});
	});
});
