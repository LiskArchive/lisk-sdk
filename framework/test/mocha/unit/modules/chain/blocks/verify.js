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

const crypto = require('crypto');
const transactionStatus = require('@liskhq/lisk-transactions').Status;
const BigNum = require('@liskhq/bignum');
const {
	registeredTransactions,
} = require('../../../../common/registered_transactions');
const transactionsModule = require('../../../../../../src/modules/chain/transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../src/modules/chain/interface_adapters');
const { Transaction } = require('../../../../fixtures/transactions');

const interfaceAdapters = {
	transactions: new TransactionInterfaceAdapter(registeredTransactions),
};
const blocksVerifyModule = require('../../../../../../src/modules/chain/blocks/verify');
const {
	BlockSlots,
} = require('../../../../../../src/modules/chain/blocks/block_slots');
const {
	calculateMilestone,
	calculateReward,
	calculateSupply,
} = require('../../../../../../src/modules/chain/blocks/block_reward');
const blocksLogic = require('../../../../../../src/modules/chain/blocks/block');
// const blocksUtils = require('../../../../../../src/modules/chain/blocks/utils');

describe('blocks/verify', () => {
	const validBlock = {
		id: '16995938957789927028',
		version: 0,
		timestamp: 8090,
		height: 5,
		numberOfTransactions: 0,
		totalAmount: '0',
		totalFee: '0',
		reward: '0',
		payloadLength: 0,
		payloadHash:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey:
			'f42203fbd0e6a781530f8e60e41603b04b54cc148b8fc7b975cebe33a682dbb2',
		blockSignature:
			'ef4256e2ba51446acc7a95ecc4e782349ee71bc484bde9a5e86b25b1e5a73a8871aa27d77a7482c089b4332fb0362238dd11348b9874e13c8df91bcdc016d205',
		confirmations: 9222099,
		totalForged: '0',
		generatorAddress: '2617786862889436018L',
		previousBlock: '15347727973645470262',
		transactions: [],
	};
	const validLastBlock = {
		id: '15347727973645470262',
		version: 0,
		timestamp: 8070,
		height: 4,
		numberOfTransactions: 0,
		totalAmount: '0',
		totalFee: '0',
		reward: '0',
		payloadLength: 0,
		payloadHash:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey:
			'09e13e1c72143c9b75013f0d5fe13e1e978e608ea883bb93a3a9c38f0c8826f3',
		blockSignature:
			'74ac5868f454a97298e30c50cfa01e3f936c1a29be9e250bb9944096a188d78feb20926c40e8998d16811ed965221bfb7416c4e19cb6ca18cb1d3b85486c2f07',
		confirmations: 9222109,
		totalForged: '0',
		generatorAddress: '15004777821391872075L',
		previousBlock: '7234275607611561282',
		transactions: [],
	};

	let storageStub;
	let roundsModuleStub;
	let blocksVerify;
	let interfaceAdaptersMock;
	let slots;
	let blockReward;
	let exceptions;
	let exceptionsWithVersion;
	let constants;

	beforeEach(async () => {
		exceptions = __testContext.config.modules.chain.exceptions;
		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub(),
					isPersisted: sinonSandbox.stub(),
				},
				Transaction: {
					get: sinonSandbox.stub(),
				},
			},
		};

		roundsModuleStub = {
			validateBlockSlot: sinonSandbox.stub(),
			fork: sinonSandbox.stub(),
		};

		sinonSandbox.stub(transactionsModule, 'checkAllowedTransactions').returns(
			sinonSandbox.stub().returns({
				transactionsResponses: [],
			})
		);
		sinonSandbox
			.stub(transactionsModule, 'verifyTransactions')
			.returns(sinonSandbox.stub());

		interfaceAdaptersMock = {
			transactions: {
				toJson: sinonSandbox.stub(),
			},
		};

		slots = new BlockSlots({
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

		exceptionsWithVersion = {
			...exceptions,
			blockVersions: {
				0: {
					start: 1,
					end: 101,
				},
			},
		};

		blocksVerify = new blocksVerifyModule.BlocksVerify({
			storage: storageStub,
			exceptions: exceptionsWithVersion,
			slots,
			roundsModule: roundsModuleStub,
			interfaceAdapters: interfaceAdaptersMock,
			genesisBlock: __testContext.config.genesisBlock,
			blockReward,
			constants,
		});
	});

	afterEach(() => sinonSandbox.restore());

	describe('constructor', () => {
		it('should assign params to itself', async () => {
			expect(blocksVerify.storage).to.eql(storageStub);
			expect(blocksVerify.roundsModule).to.eql(roundsModuleStub);
			expect(blocksVerify.slots).to.eql(slots);
			expect(blocksVerify.blockReward).to.eql(blockReward);
			expect(blocksVerify.exceptions).to.eql(exceptionsWithVersion);
			expect(blocksVerify.constants).to.eql(constants);
			expect(blocksVerify.genesisBlock).to.eql(
				__testContext.config.genesisBlock
			);
			expect(blocksVerify.interfaceAdapters).to.eql(interfaceAdaptersMock);
		});
	});

	describe('verifySignature', () => {
		beforeEach(async () => {
			sinonSandbox.stub(blocksLogic, 'verifySignature');
		});

		describe('when block.verifySignature fails', () => {
			it('should return error when it throws an error', async () => {
				blocksLogic.verifySignature.throws(new Error('verifySignature-ERR'));
				const verifySignature = blocksVerifyModule.verifySignature(
					{ id: 6 },
					{ errors: [] }
				);
				expect(verifySignature.errors[0].message).to.equal(
					'verifySignature-ERR'
				);
				return expect(verifySignature.errors[1].message).to.equal(
					'Failed to verify block signature'
				);
			});

			it('should return error when signature is invalid', async () => {
				blocksLogic.verifySignature.returns(false);
				const verifySignature = blocksVerifyModule.verifySignature(
					{ id: 6 },
					{ errors: [] }
				);
				return expect(verifySignature.errors[0].message).to.equal(
					'Failed to verify block signature'
				);
			});
		});

		describe('when block.verifySignature succeeds', () => {
			it('should return no error', async () => {
				blocksLogic.verifySignature.returns(true);
				const verifySignature = blocksVerifyModule.verifySignature(
					{ id: 6 },
					{ errors: [] }
				);
				return expect(verifySignature.errors.length).to.equal(0);
			});
		});
	});

	describe('verifyPreviousBlock', () => {
		describe('when verifyPreviousBlock fails', () => {
			describe('if block.previousBlock is not defined and height != 1', () => {
				it('should return error', async () => {
					const verifyPreviousBlock = blocksVerifyModule.verifyPreviousBlock(
						{ id: 6, height: 3 },
						{ errors: [] }
					);
					return expect(verifyPreviousBlock.errors[0].message).to.equal(
						'Invalid previous block'
					);
				});
			});
		});

		describe('when verifyPreviousBlock succeeds', () => {
			describe('if block.previousBlock is not defined and height = 1', () => {
				it('should return no error', async () => {
					const verifyPreviousBlock = blocksVerifyModule.verifyPreviousBlock(
						{ id: 6, height: 1 },
						{ errors: [] }
					);
					return expect(verifyPreviousBlock.errors.length).to.equal(0);
				});
			});

			describe('if block.previousBlock is defined and block.height != 1', () => {
				it('should return no error', async () => {
					const verifyPreviousBlock = blocksVerifyModule.verifyPreviousBlock(
						{ id: 6, previousBlock: 5, height: 3 },
						{ errors: [] }
					);
					return expect(verifyPreviousBlock.errors.length).to.equal(0);
				});
			});

			describe('if block.previousBlock is defined and block.height = 1', () => {
				it('should return no error', async () => {
					const verifyPreviousBlock = blocksVerifyModule.verifyPreviousBlock(
						{ id: 6, previousBlock: 5, height: 1 },
						{ errors: [] }
					);
					return expect(verifyPreviousBlock.errors.length).to.equal(0);
				});
			});
		});
	});

	describe('verifyAgainstLastNBlockIds', () => {
		it('should return error when block is in list', async () => {
			const verifyAgainstLastNBlockIds = blocksVerifyModule.verifyAgainstLastNBlockIds(
				{ id: 3 },
				[1, 2, 3, 4],
				{ errors: [] }
			);
			return expect(verifyAgainstLastNBlockIds.errors[0].message).to.equal(
				'Block already exists in chain'
			);
		});

		it('should return no error when block is not in list', async () => {
			const verifyAgainstLastNBlockIds = blocksVerifyModule.verifyAgainstLastNBlockIds(
				{ id: 5 },
				[1, 2, 3, 4],
				{ errors: [] }
			);
			return expect(verifyAgainstLastNBlockIds.errors.length).to.equal(0);
		});
	});

	describe('verifyVersion', () => {
		describe('when there are no exceptions for block versions', () => {
			describe('when block height provided', () => {
				it('should return no error when block version = 2', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 2, height: 1 },
						{},
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 0', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 0, height: 1 },
						{},
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version 1', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 1, height: 1 },
						{},
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});
			});

			describe('when block height is missing', () => {
				it('should return no error when block version = 2', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 2 },
						{},
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 1', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 1 },
						{},
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version = 3', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 3 },
						{},
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});
			});
		});

		describe('when there are proper exceptions set for block versions', () => {
			const blocksVersionException = {
				blockVersions: {
					0: { start: 1, end: 101 },
				},
			};

			describe('when block height provided', () => {
				it('should return no error when block version = 0', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 0, height: 1 },
						blocksVersionException,
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 1', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 1, height: 1 },
						blocksVersionException,
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version = 2', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 2, height: 1 },
						blocksVersionException,
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});
			});

			describe('when block height is missing', () => {
				it('should return no error when block version = 1', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 2 },
						blocksVersionException,
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 2', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 1 },
						blocksVersionException,
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version = 3', async () => {
					const verifyVersion = blocksVerifyModule.verifyVersion(
						{ version: 3 },
						blocksVersionException,
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0].message).to.equal(
						'Invalid block version'
					);
				});
			});
		});
	});

	describe('verifyReward', () => {
		const blockRewardsExceptions = {
			blockRewards: [1, 2, 3, 4],
		};

		let blockRewardStub;

		beforeEach(async () => {
			blockRewardStub = {
				calculateReward: sinonSandbox.stub(),
			};
		});

		describe('when blockReward.calculateReward succeeds', () => {
			beforeEach(async () => {
				blockRewardStub.calculateReward.returns(new BigNum(5));
			});

			describe('if block.height != 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 5, reward: 1, id: 5 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors[0].message).to.equal(
						'Invalid block reward: 1 expected: 5'
					);
				});
			});

			describe('if block.height != 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 5, reward: 1, id: 3 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height != 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return no error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 5, reward: 5, id: 3 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height != 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 5, reward: 5, id: 5 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return no error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 1, reward: 1, id: 5 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 1, reward: 1, id: 3 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return no error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 1, reward: 5, id: 5 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					const verifyReward = blocksVerifyModule.verifyReward(
						blockRewardStub,
						{ height: 1, reward: 5, id: 3 },
						blockRewardsExceptions,
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});
		});
	});

	describe('verifyId', () => {
		describe('when block = undefined', () => {
			beforeEach(async () => {
				sinonSandbox.stub(blocksLogic, 'getId');
			});

			it('should return error', async () => {
				const verifyId = blocksVerifyModule.verifyId(undefined, { errors: [] });
				return expect(verifyId.errors[0].message).to.equal(
					"Cannot set property 'id' of undefined"
				);
			});
		});

		describe('when block.getId fails', () => {
			beforeEach(async () => {
				sinonSandbox.stub(blocksLogic, 'getId').throws(new Error('getId-ERR'));
			});

			it('should return error', async () => {
				const verifyId = blocksVerifyModule.verifyId({ id: 5 }, { errors: [] });
				return expect(verifyId.errors[0].message).to.equal('getId-ERR');
			});
		});

		describe('when block.getId succeeds', () => {
			beforeEach(async () => {
				sinonSandbox.stub(blocksLogic, 'getId').returns(5);
			});

			it('should return no error', async () => {
				const verifyId = blocksVerifyModule.verifyId({ id: 5 }, { errors: [] });
				return expect(verifyId.errors.length).to.equal(0);
			});
		});
	});

	describe('verifyPayload', () => {
		let verifyPayload;

		const payloadHash = crypto.createHash('sha256');
		const transactionOne = interfaceAdapters.transactions.fromJson(
			new Transaction({ type: 0 })
		);
		const transactionTwo = interfaceAdapters.transactions.fromJson(
			new Transaction({ type: 0 })
		);
		const transactions = [transactionOne, transactionTwo];
		let totalAmount = new BigNum(0);
		let totalFee = new BigNum(0);

		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			const bytes = transaction.getBytes(transaction);

			totalFee = totalFee.plus(transaction.fee);
			totalAmount = totalAmount.plus(transaction.amount);

			payloadHash.update(bytes);
		}

		const dummyBlock = {
			totalAmount,
			totalFee,
			payloadHash: payloadHash.digest().toString('hex'),
			numberOfTransactions: transactions.length,
			transactions,
		};

		describe('when verifyPayload fails', () => {
			describe('when payload lenght is too long', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.payloadLength = 1048577;
					verifyPayload = blocksVerifyModule.verifyPayload(
						dummyBlockERR,
						constants.maxTransactionsPerBlock,
						constants.maxPayloadLength,
						{
							errors: [],
						}
					);
					return expect(verifyPayload.errors[0].message).to.equal(
						'Payload length is too long'
					);
				});
			});

			describe('when transactions do not match block transactions count', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.numberOfTransactions = 4;
					verifyPayload = blocksVerifyModule.verifyPayload(
						dummyBlockERR,
						constants.maxTransactionsPerBlock,
						constants.maxPayloadLength,
						{
							errors: [],
						}
					);
					return expect(verifyPayload.errors[0].message).to.equal(
						'Included transactions do not match block transactions count'
					);
				});
			});

			describe('when number of transactions exceeds maximum per block', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.numberOfTransactions = 32;
					dummyBlockERR.transactions = dummyBlockERR.transactions.concat(
						new Array(30)
					);
					verifyPayload = blocksVerifyModule.verifyPayload(
						dummyBlockERR,
						constants.maxTransactionsPerBlock,
						constants.maxPayloadLength,
						{
							errors: [],
						}
					);
					return expect(verifyPayload.errors[0].message).to.equal(
						'Number of transactions exceeds maximum per block'
					);
				});
			});

			describe('when encountered duplicate transaction', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.transactions.pop();
					dummyBlockERR.transactions.push(transactionOne);
					verifyPayload = blocksVerifyModule.verifyPayload(
						dummyBlockERR,
						constants.maxTransactionsPerBlock,
						constants.maxPayloadLength,
						{
							errors: [],
						}
					);
					return expect(verifyPayload.errors[0].message).to.equal(
						`Encountered duplicate transaction: ${transactionOne.id}`
					);
				});
			});

			describe('when payload hash is invalid', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.payloadHash = 'abc';
					verifyPayload = blocksVerifyModule.verifyPayload(
						dummyBlockERR,
						constants.maxTransactionsPerBlock,
						constants.maxPayloadLength,
						{
							errors: [],
						}
					);
					return expect(verifyPayload.errors[0].message).to.equal(
						'Invalid payload hash'
					);
				});
			});

			describe('when total amount is invalid', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.totalAmount = 1;
					verifyPayload = blocksVerifyModule.verifyPayload(
						dummyBlockERR,
						constants.maxTransactionsPerBlock,
						constants.maxPayloadLength,
						{
							errors: [],
						}
					);
					return expect(verifyPayload.errors[0].message).to.equal(
						'Invalid total amount'
					);
				});
			});

			describe('when total fee is invalid', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.totalFee = 1;
					verifyPayload = blocksVerifyModule.verifyPayload(
						dummyBlockERR,
						constants.maxTransactionsPerBlock,
						constants.maxPayloadLength,
						{
							errors: [],
						}
					);
					return expect(verifyPayload.errors[0].message).to.equal(
						'Invalid total fee'
					);
				});
			});
		});

		describe('when verifyPayload succeeds', () => {
			it('should return no error', async () => {
				verifyPayload = blocksVerifyModule.verifyPayload(
					dummyBlock,
					constants.maxTransactionsPerBlock,
					constants.maxPayloadLength,
					{ errors: [] }
				);
				return expect(verifyPayload.errors.length).to.equal(0);
			});
		});
	});

	describe('verifyForkOne', () => {
		let verifyForkOne;
		let block;
		let lastBlock;

		describe('when verifyForkOne fails', () => {
			describe('when block.previousBlock && block.previousBlock != lastBlock.id', () => {
				it('should return error', async () => {
					block = { previousBlock: 4 };
					lastBlock = { id: 5 };
					verifyForkOne = blocksVerifyModule.verifyForkOne(
						roundsModuleStub,
						block,
						lastBlock,
						{
							errors: [],
						}
					);
					expect(roundsModuleStub.fork.calledOnce).to.be.true;
					expect(roundsModuleStub.fork.args[0][0]).to.deep.equal(block);
					expect(roundsModuleStub.fork.args[0][1]).to.equal(1);
					return expect(verifyForkOne.errors[0].message).to.equal(
						'Invalid previous block: 4 expected: 5'
					);
				});
			});
		});

		describe('when verifyForkOne succeeds', () => {
			describe('when block.previousBlock = undefined', () => {
				afterEach(
					async () => expect(roundsModuleStub.fork.calledOnce).to.be.false
				);

				it('should return no error', async () => {
					block = { id: 6 };
					lastBlock = { id: 5 };
					verifyForkOne = blocksVerifyModule.verifyForkOne(
						roundsModuleStub,
						block,
						lastBlock,
						{
							errors: [],
						}
					);
					return expect(verifyForkOne.errors.length).to.equal(0);
				});
			});

			describe('when block.previousBlock = lastBlock.id', () => {
				afterEach(
					async () => expect(roundsModuleStub.fork.calledOnce).to.be.false
				);

				it('should return no error', async () => {
					block = { previousBlock: 5 };
					lastBlock = { id: 5 };
					verifyForkOne = blocksVerifyModule.verifyForkOne(
						roundsModuleStub,
						block,
						lastBlock,
						{
							errors: [],
						}
					);
					return expect(verifyForkOne.errors.length).to.equal(0);
				});
			});
		});
	});

	describe('verifyBlockSlot', () => {
		let slotMock;

		beforeEach(async () => {
			slotMock = {
				getSlotNumber: input => (input === undefined ? 4 : input),
			};
		});

		describe('when verifyBlockSlot fails', () => {
			describe('when blockSlotNumber > slots.getSlotNumber()', () => {
				it('should return error', async () => {
					const block = { timestamp: 5 };
					const lastBlock = { timestamp: 5 };
					const verifyBlockSlot = blocksVerifyModule.verifyBlockSlot(
						slotMock,
						block,
						lastBlock,
						{
							errors: [],
						}
					);
					return expect(verifyBlockSlot.errors[0].message).to.equal(
						'Invalid block timestamp'
					);
				});
			});

			describe('when blockSlotNumber <= lastBlockSlotNumber', () => {
				it('should return error', async () => {
					const block = { timestamp: 3 };
					const lastBlock = { timestamp: 3 };
					const verifyBlockSlot = blocksVerifyModule.verifyBlockSlot(
						slotMock,
						block,
						lastBlock,
						{
							errors: [],
						}
					);
					return expect(verifyBlockSlot.errors[0].message).to.equal(
						'Invalid block timestamp'
					);
				});
			});
		});

		describe('when verifyBlockSlot succeeds', () => {
			it('should return no error', async () => {
				const block = { timestamp: 4 };
				const lastBlock = { timestamp: 3 };
				const verifyBlockSlot = blocksVerifyModule.verifyBlockSlot(
					slotMock,
					block,
					lastBlock,
					{
						errors: [],
					}
				);
				return expect(verifyBlockSlot.errors.length).to.equal(0);
			});
		});
	});

	describe('verifyBlockSlotWindow', () => {
		let slotMock;

		beforeEach(async () => {
			slotMock = {
				getSlotNumber: input => (input === undefined ? 100 : input),
			};
		});

		describe('when verifyBlockSlotWindow fails', () => {
			describe('when currentApplicationSlot - blockSlot > BLOCK_SLOT_WINDOW', () => {
				it('should return error', async () => {
					const verifyBlockSlotWindow = blocksVerifyModule.verifyBlockSlotWindow(
						slotMock,
						constants.blockSlotWindow,
						{ timestamp: 10 },
						{ errors: [] }
					);
					return expect(verifyBlockSlotWindow.errors[0].message).to.equal(
						'Block slot is too old'
					);
				});
			});

			describe('currentApplicationSlot < blockSlot', () => {
				it('should return error', async () => {
					const verifyBlockSlotWindow = blocksVerifyModule.verifyBlockSlotWindow(
						slotMock,
						constants.blockSlotWindow,
						{ timestamp: 110 },
						{ errors: [] }
					);
					return expect(verifyBlockSlotWindow.errors[0].message).to.equal(
						'Block slot is in the future'
					);
				});
			});
		});

		describe('when verifyBlockSlotWindow succeeds', () => {
			it('should return no error', async () => {
				const verifyBlockSlotWindow = blocksVerifyModule.verifyBlockSlotWindow(
					slotMock,
					constants.blockSlotWindow,
					{ timestamp: 99 },
					{ errors: [] }
				);
				return expect(verifyBlockSlotWindow.errors.length).to.equal(0);
			});
		});
	});

	describe('verifyReceipt', () => {
		let slotsMock;

		beforeEach(async () => {
			slotsMock = {
				getSlotNumber: input => (input === undefined ? 8090 : input),
			};
		});

		it('should call private functions with correct parameters', async () => {
			const verifyReceipt = blocksVerifyModule.verifyReceipt({
				block: validBlock,
				lastBlock: validLastBlock,
				lastNBlockIds: [1, 2, 3],
				maxTransactionsPerBlock: constants.maxTransactionsPerBlock,
				slots: slotsMock,
				blockSlotWindow: constants.blockSlotWindow,
				maxPayloadLength: constants.maxPayloadLength,
				blockReward,
				exceptions: {
					blockVersions: {
						0: {
							start: 0,
							end: 10,
						},
					},
				},
			});

			return expect(verifyReceipt).to.eql({
				verified: true,
				errors: [],
			});
		});
	});

	describe('verifyBlock', () => {
		it('should call private functions with correct parameters', async () => {
			const verifyReceipt = blocksVerify.verifyBlock(
				validBlock,
				validLastBlock
			);
			return expect(verifyReceipt).to.deep.equal({
				verified: true,
				errors: [],
			});
		});
	});

	describe('checkExists', () => {
		const dummyBlock = { id: 1, transactions: [] };

		describe('when storage.entities.Block.isPersisted fails', () => {
			beforeEach(async () => {
				storageStub.entities.Block.isPersisted.rejects(
					new Error('blockExists-ERR')
				);
			});

			it('should throw an error from storage', async () => {
				try {
					await blocksVerify.checkExists(dummyBlock);
				} catch (error) {
					expect(error.message).to.equal('blockExists-ERR');
				}
			});
		});

		describe('when storage.entities.Block.isPersisted succeeds', () => {
			describe('if rows = true', () => {
				beforeEach(async () => {
					storageStub.entities.Block.isPersisted.resolves(true);
				});

				it('should call a callback with error', async () => {
					try {
						await blocksVerify.checkExists(dummyBlock);
					} catch (error) {
						expect(error.message).to.equal('Block 1 already exists');
					}
				});
			});

			describe('if rows = false', () => {
				beforeEach(async () => {
					storageStub.entities.Block.isPersisted.resolves(false);
				});

				it('should call a callback with no error', async () => {
					const result = await blocksVerify.checkExists(dummyBlock);
					expect(result).to.be.undefined;
				});
			});
		});
	});

	describe('validateBlockSlot', () => {
		const dummyBlock = { id: 1 };

		describe('when rounds.validateBlockSlot fails', () => {
			beforeEach(async () => {
				roundsModuleStub.validateBlockSlot.rejects(
					new Error('validateBlockSlot-ERR')
				);
			});

			it('should call a callback with error', async () => {
				try {
					await blocksVerify.validateBlockSlot(dummyBlock);
				} catch (error) {
					expect(roundsModuleStub.fork).calledWith(dummyBlock, 3);
					expect(roundsModuleStub.validateBlockSlot).calledWith(dummyBlock);
					expect(error.message).to.equal('validateBlockSlot-ERR');
				}
			});
		});

		describe('when modules.validateBlockSlot succeeds', () => {
			beforeEach(async () => {
				roundsModuleStub.validateBlockSlot.resolves(true);
			});

			it('should call a callback with no error', async () => {
				await blocksVerify.validateBlockSlot(dummyBlock);

				expect(roundsModuleStub.validateBlockSlot).calledWith(dummyBlock);
				return expect(roundsModuleStub.fork).not.to.be.called;
			});
		});
	});

	describe('checkTransactions', () => {
		let dummyBlock;
		let validTransactionsResponse;
		let invalidTransactionsResponse;

		beforeEach(async () => {
			dummyBlock = {
				id: 1,
				transactions: [
					{
						id: '123',
					},
				],
			};
		});

		describe('when block.transactions is empty', () => {
			it('should not throw', async () => {
				dummyBlock = { id: 1, transactions: [] };
				const result = await blocksVerify.checkTransactions(dummyBlock);
				expect(result).to.be.undefined;
			});
		});

		describe('when block.transactions is not empty', () => {
			beforeEach(async () => {
				validTransactionsResponse = dummyBlock.transactions.map(
					transaction => ({
						id: transaction.id,
						status: transactionStatus.OK,
						errors: [],
					})
				);

				invalidTransactionsResponse = dummyBlock.transactions.map(
					transaction => ({
						id: transaction.id,
						status: transactionStatus.FAIL,
						errors: [new Error('Invalid transaction error')],
					})
				);
			});

			// TODO: slight behaviour changed in method check
			// eslint-disable-next-line
			it.skip('should not throw if the verifyTransaction returns transaction response with Status = OK', async () => {
				transactionsModule.verifyTransactions.returns(
					sinonSandbox
						.stub()
						.resolves({ transactionsResponses: validTransactionsResponse })
				);
				await blocksVerify.checkTransactions(dummyBlock);
				expect(transactionsModule.verifyTransactions).to.be.calledOnce;
			});

			it('should throw if the verifyTransaction returns transaction response with Status != OK', async () => {
				transactionsModule.verifyTransactions.returns(
					sinonSandbox
						.stub()
						.resolves({ transactionsResponses: invalidTransactionsResponse })
				);
				try {
					await blocksVerify.checkTransactions(dummyBlock);
				} catch (errors) {
					expect(errors[0].message).to.eql('Invalid transaction error');
				}
			});

			it('should call transactionsModule.checkAllowedTransactions', async () => {
				try {
					await blocksVerify.checkTransactions(dummyBlock);
				} catch (error) {
					expect(transactionsModule.checkAllowedTransactions).to.have.been
						.called;
				}
			});

			it('should throw an array of errors if transactions are not allowed', async () => {
				transactionsModule.checkAllowedTransactions.returns(
					sinonSandbox.stub().returns({
						transactionsResponses: [
							{
								id: 1,
								status: transactionStatus.FAIL,
								errors: [new Error('anError')],
							},
						],
					})
				);

				expect(blocksVerify.checkTransactions(dummyBlock, false)).to.eventually
					.be.rejected;
			});
		});
	});

	describe('matchGenesisBlock', () => {});
	describe('reloadRequired', () => {});
	describe('requiredBlockRewind', () => {});
	describe('normalizeAndVerify', () => {});
	describe('isSaneBlock', () => {});
	describe('isForkOne', () => {});
	describe('isForkFive', () => {});
	describe('isDoubleForge', () => {});
	describe('shouldDiscardForkOne', () => {});
	describe('shouldDiscardForkFive', () => {});
});
