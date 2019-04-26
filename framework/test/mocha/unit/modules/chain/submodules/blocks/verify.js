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
const rewire = require('rewire');
const transactionStatus = require('@liskhq/lisk-transactions').Status;
const Bignum = require('../../../../../../../src/modules/chain/helpers/bignum');
const {
	registeredTransactions,
} = require('../../../../../common/registered_transactions');
const InitTransaction = require('../../../../../../../src/modules/chain/logic/init_transaction');
const { Transaction } = require('../../../../../fixtures/transactions');

const initTransaction = new InitTransaction(registeredTransactions);

const BlocksVerify = rewire(
	'../../../../../../../src/modules/chain/submodules/blocks/verify'
);

const exceptions = global.exceptions;

describe('blocks/verify', () => {
	let library;
	let __private;
	let loggerStub;
	let storageStub;
	let logicBlockStub;
	let configMock;
	let blocksVerifyModule;
	let bindingsStub;
	let modules;
	let channelMock;

	beforeEach(done => {
		// Logic
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

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

		logicBlockStub = {
			verifySignature: sinonSandbox.stub(),
			getId: sinonSandbox.stub(),
			objectNormalize: sinonSandbox.stub(),
		};

		configMock = {
			loading: {
				snapshotRound: null,
			},
		};

		channelMock = {
			invoke: sinonSandbox
				.stub()
				.withArgs('app:updateApplicationState')
				.returns(true),
			once: sinonSandbox
				.stub()
				.withArgs('app:state:updated')
				.callsArg(1),
		};

		blocksVerifyModule = new BlocksVerify(
			loggerStub,
			logicBlockStub,
			storageStub,
			configMock,
			channelMock
		);

		library = BlocksVerify.__get__('library');
		__private = BlocksVerify.__get__('__private');

		// Modules
		const modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
			validateBlockSlot: sinonSandbox.stub(),
		};

		const modulesDelegatesStub = {
			fork: sinonSandbox.stub(),
			validateBlockSlot: sinonSandbox.stub(),
		};

		const modulesTransactionsStub = {
			undoUnconfirmed: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
		};

		const modulesBlocksStub = {
			lastBlock: {
				get: sinonSandbox.stub(),
			},
			isCleaning: {
				get: sinonSandbox.stub(),
			},
			chain: {
				broadcastReducedBlock: sinonSandbox.stub(),
				applyBlock: sinonSandbox.stub(),
			},
			calculateNewBroadhash: sinonSandbox.stub(),
		};

		const modulesProcessTransactionsStub = {
			verifyTransactions: sinonSandbox.stub(),
		};

		bindingsStub = {
			modules: {
				accounts: modulesAccountsStub,
				blocks: modulesBlocksStub,
				delegates: modulesDelegatesStub,
				transactions: modulesTransactionsStub,
				processTransactions: modulesProcessTransactionsStub,
			},
		};

		blocksVerifyModule.onBind(bindingsStub);
		modules = BlocksVerify.__get__('modules');
		done();
	});

	afterEach(() => sinonSandbox.restore());

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.storage).to.eql(storageStub);
			expect(library.logic.block).to.eql(logicBlockStub);
			expect(library.config).to.eql(configMock);
		});

		it('should initialize __private.blockReward', async () => {
			expect(__private.blockReward).to.be.an('object');
			return expect(__private.blockReward.calcReward).to.be.a('function');
		});

		it('should call library.logger.trace with "Blocks->Verify: Submodule initialized."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Verify: Submodule initialized.'
			));

		it('should return self', async () => {
			expect(blocksVerifyModule).to.be.an('object');
			expect(blocksVerifyModule.verifyReceipt).to.be.a('function');
			expect(blocksVerifyModule.onBlockchainReady).to.be.a('function');
			expect(blocksVerifyModule.onNewBlock).to.be.a('function');
			expect(blocksVerifyModule.verifyBlock).to.be.a('function');
			expect(blocksVerifyModule.addBlockProperties).to.be.a('function');
			expect(blocksVerifyModule.deleteBlockProperties).to.be.a('function');
			expect(blocksVerifyModule.processBlock).to.be.a('function');
			return expect(blocksVerifyModule.onBind).to.be.a('function');
		});
	});

	describe('__private.setHeight', () => {
		const dummyBlock = {
			id: '6',
			height: 4,
		};
		const dummyLastBlock = {
			id: '5',
			height: 5,
		};

		it('should return block with increased height based on last block', async () =>
			expect(__private.setHeight(dummyBlock, dummyLastBlock)).to.deep.equal({
				id: '6',
				height: 6,
			}));
	});

	describe('__private.verifySignature', () => {
		describe('when library.logic.block.verifySignature fails', () => {
			describe('if throws error', () => {
				beforeEach(() =>
					library.logic.block.verifySignature.throws('verifySignature-ERR')
				);

				it('should return error', async () => {
					const verifySignature = __private.verifySignature(
						{ id: 6 },
						{ errors: [] }
					);
					expect(verifySignature.errors[0]).to.equal('verifySignature-ERR');
					return expect(verifySignature.errors[1]).to.equal(
						'Failed to verify block signature'
					);
				});
			});

			describe('if is not valid', () => {
				beforeEach(() => library.logic.block.verifySignature.returns(false));

				it('should return error', async () => {
					const verifySignature = __private.verifySignature(
						{ id: 6 },
						{ errors: [] }
					);
					return expect(verifySignature.errors[0]).to.equal(
						'Failed to verify block signature'
					);
				});
			});
		});

		describe('when library.logic.block.verifySignature succeeds', () => {
			beforeEach(() => library.logic.block.verifySignature.returns(true));

			it('should return no error', async () => {
				const verifySignature = __private.verifySignature(
					{ id: 6 },
					{ errors: [] }
				);
				return expect(verifySignature.errors.length).to.equal(0);
			});
		});
	});

	describe('when __private.verifyPreviousBlock fails', () => {
		describe('if block.previousBlock is not defined and height != 1', () => {
			it('should return error', async () => {
				const verifyPreviousBlock = __private.verifyPreviousBlock(
					{ id: 6, height: 3 },
					{ errors: [] }
				);
				return expect(verifyPreviousBlock.errors[0]).to.equal(
					'Invalid previous block'
				);
			});
		});
	});

	describe('when __private.verifyPreviousBlock succeeds', () => {
		describe('if block.previousBlock is not defined and height = 1', () => {
			it('should return no error', async () => {
				const verifyPreviousBlock = __private.verifyPreviousBlock(
					{ id: 6, height: 1 },
					{ errors: [] }
				);
				return expect(verifyPreviousBlock.errors.length).to.equal(0);
			});
		});

		describe('if block.previousBlock is defined and block.height != 1', () => {
			it('should return no error', async () => {
				const verifyPreviousBlock = __private.verifyPreviousBlock(
					{ id: 6, previousBlock: 5, height: 3 },
					{ errors: [] }
				);
				return expect(verifyPreviousBlock.errors.length).to.equal(0);
			});
		});

		describe('if block.previousBlock is defined and block.height = 1', () => {
			it('should return no error', async () => {
				const verifyPreviousBlock = __private.verifyPreviousBlock(
					{ id: 6, previousBlock: 5, height: 1 },
					{ errors: [] }
				);
				return expect(verifyPreviousBlock.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyAgainstLastNBlockIds', () => {
		let lastNBlockIdsTemp;

		beforeEach(done => {
			lastNBlockIdsTemp = __private.lastNBlockIds;
			__private.lastNBlockIds = [1, 2, 3, 4];
			done();
		});

		afterEach(done => {
			__private.lastNBlockIds = lastNBlockIdsTemp;
			done();
		});

		it('should return error when block is in list', async () => {
			const verifyAgainstLastNBlockIds = __private.verifyAgainstLastNBlockIds(
				{ id: 3 },
				{ errors: [] }
			);
			return expect(verifyAgainstLastNBlockIds.errors[0]).to.equal(
				'Block already exists in chain'
			);
		});

		it('should return no error when block is not in list', async () => {
			const verifyAgainstLastNBlockIds = __private.verifyAgainstLastNBlockIds(
				{ id: 5 },
				{ errors: [] }
			);
			return expect(verifyAgainstLastNBlockIds.errors.length).to.equal(0);
		});
	});

	describe('__private.verifyVersion', () => {
		let verifyVersion;

		describe('when there are no exceptions for block versions', () => {
			describe('when block height provided', () => {
				it('should return no error when block version = 1', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 1, height: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 0', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 0, height: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version 2', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 2, height: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});
			});

			describe('when block height is missing', () => {
				it('should return no error when block version = 1', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 2', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 2 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version = 3', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 3 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});
			});
		});

		describe('when there are proper exceptions set for block versions', () => {
			before(done => {
				// Set proper exceptions for blocks versions
				exceptions.blockVersions = {
					0: { start: 1, end: 101 },
				};
				done();
			});

			after(done => {
				// Reset exceptions
				exceptions.blockVersions = {};
				done();
			});

			describe('when block height provided', () => {
				it('should return no error when block version = 0', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 0, height: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 1', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 1, height: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version = 2', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 2, height: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});
			});

			describe('when block height is missing', () => {
				it('should return no error when block version = 1', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 1 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors.length).to.equal(0);
				});

				it('should return error when block version = 2', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 2 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});

				it('should return error when block version = 3', async () => {
					verifyVersion = __private.verifyVersion(
						{ version: 3 },
						{ errors: [] }
					);
					return expect(verifyVersion.errors[0]).to.equal(
						'Invalid block version'
					);
				});
			});
		});
	});

	describe('__private.verifyReward', () => {
		let verifyReward;
		let blockRewardTemp;
		let exceptionsTemp;
		let exceptionsTemp2;

		beforeEach(done => {
			blockRewardTemp = __private.blockReward;
			__private.blockReward = {
				calcReward: sinonSandbox.stub(),
			};
			exceptionsTemp2 = BlocksVerify.__get__('exceptions');
			exceptionsTemp = exceptionsTemp2;
			exceptionsTemp2.blockRewards = [1, 2, 3, 4];
			done();
		});

		afterEach(done => {
			__private.blockReward = blockRewardTemp;
			exceptionsTemp2 = exceptionsTemp;
			done();
		});

		describe('when __private.blockReward.calcReward succeeds', () => {
			beforeEach(() => __private.blockReward.calcReward.returns(new Bignum(5)));

			describe('if block.height != 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 5, reward: 1, id: 5 },
						{ errors: [] }
					);
					return expect(verifyReward.errors[0]).to.equal(
						'Invalid block reward: 1 expected: 5'
					);
				});
			});

			describe('if block.height != 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 5, reward: 1, id: 3 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height != 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 5, reward: 5, id: 3 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height != 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 5, reward: 5, id: 5 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 1, reward: 1, id: 5 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 1, reward: 1, id: 3 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) = -1', () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 1, reward: 5, id: 5 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) != -1', () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 1, reward: 5, id: 3 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});
		});
	});

	describe('__private.verifyId', () => {
		let verifyId;

		describe('when block = undefined', () => {
			it('should return error', async () => {
				verifyId = __private.verifyId(undefined, { errors: [] });
				return expect(verifyId.errors[0]).to.equal(
					"TypeError: Cannot set property 'id' of undefined"
				);
			});
		});

		describe('when library.logic.block.getId fails', () => {
			beforeEach(() => library.logic.block.getId.throws('getId-ERR'));

			it('should return error', async () => {
				verifyId = __private.verifyId({ id: 5 }, { errors: [] });
				return expect(verifyId.errors[0]).to.equal('getId-ERR');
			});
		});

		describe('when library.logic.block.getId succeeds', () => {
			beforeEach(() => library.logic.block.getId.returns(5));

			it('should return no error', async () => {
				verifyId = __private.verifyId({ id: 5 }, { errors: [] });
				return expect(verifyId.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyPayload', () => {
		let verifyPayload;

		const payloadHash = crypto.createHash('sha256');
		const transactionOne = initTransaction.jsonRead(
			new Transaction({ type: 0 })
		);
		const transactionTwo = initTransaction.jsonRead(
			new Transaction({ type: 0 })
		);
		const transactions = [transactionOne, transactionTwo];
		let totalAmount = new Bignum(0);
		let totalFee = new Bignum(0);

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

		describe('when __private.verifyPayload fails', () => {
			describe('when payload lenght is too long', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.payloadLength = 1048577;
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal(
						'Payload length is too long'
					);
				});
			});

			describe('when transactions do not match block transactions count', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.numberOfTransactions = 4;
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal(
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
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal(
						'Number of transactions exceeds maximum per block'
					);
				});
			});

			describe('when encountered duplicate transaction', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.transactions.pop();
					dummyBlockERR.transactions.push(transactionOne);
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal(
						`Encountered duplicate transaction: ${transactionOne.id}`
					);
				});
			});

			describe('when payload hash is invalid', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.payloadHash = 'abc';
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal(
						'Invalid payload hash'
					);
				});
			});

			describe('when total amount is invalid', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.totalAmount = 1;
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal(
						'Invalid total amount'
					);
				});
			});

			describe('when total fee is invalid', () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.totalFee = 1;
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal('Invalid total fee');
				});
			});
		});

		describe('when __private.verifyPayload succeeds', () => {
			it('should return no error', async () => {
				verifyPayload = __private.verifyPayload(dummyBlock, { errors: [] });
				return expect(verifyPayload.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyForkOne', () => {
		let verifyForkOne;
		let block;
		let lastBlock;

		describe('when __private.verifyForkOne fails', () => {
			describe('when block.previousBlock && block.previousBlock != lastBlock.id', () => {
				afterEach(() => {
					expect(modules.delegates.fork.calledOnce).to.be.true;
					expect(modules.delegates.fork.args[0][0]).to.deep.equal(block);
					return expect(modules.delegates.fork.args[0][1]).to.equal(1);
				});

				it('should return error', async () => {
					block = { previousBlock: 4 };
					lastBlock = { id: 5 };
					verifyForkOne = __private.verifyForkOne(block, lastBlock, {
						errors: [],
					});
					return expect(verifyForkOne.errors[0]).to.equal(
						'Invalid previous block: 4 expected: 5'
					);
				});
			});
		});

		describe('when __private.verifyForkOne succeeds', () => {
			describe('when block.previousBlock = undefined', () => {
				afterEach(
					async () => expect(modules.delegates.fork.calledOnce).to.be.false
				);

				it('should return no error', async () => {
					block = { id: 6 };
					lastBlock = { id: 5 };
					verifyForkOne = __private.verifyForkOne(block, lastBlock, {
						errors: [],
					});
					return expect(verifyForkOne.errors.length).to.equal(0);
				});
			});

			describe('when block.previousBlock = lastBlock.id', () => {
				afterEach(
					async () => expect(modules.delegates.fork.calledOnce).to.be.false
				);

				it('should return no error', async () => {
					block = { previousBlock: 5 };
					lastBlock = { id: 5 };
					verifyForkOne = __private.verifyForkOne(block, lastBlock, {
						errors: [],
					});
					return expect(verifyForkOne.errors.length).to.equal(0);
				});
			});
		});
	});

	describe('__private.verifyBlockSlot', () => {
		let verifyBlockSlot;
		let block;
		let lastBlock;
		let slots;
		let slotsTemp;

		beforeEach(done => {
			slots = BlocksVerify.__get__('slots');
			slotsTemp = slots;
			slots.getSlotNumber = input => (input === undefined ? 4 : input);
			done();
		});

		afterEach(done => {
			slots = slotsTemp;
			done();
		});

		describe('when __private.verifyBlockSlot fails', () => {
			describe('when blockSlotNumber > slots.getSlotNumber()', () => {
				it('should return error', async () => {
					block = { timestamp: 5 };
					lastBlock = { timestamp: 5 };
					verifyBlockSlot = __private.verifyBlockSlot(block, lastBlock, {
						errors: [],
					});
					return expect(verifyBlockSlot.errors[0]).to.equal(
						'Invalid block timestamp'
					);
				});
			});

			describe('when blockSlotNumber <= lastBlockSlotNumber', () => {
				it('should return error', async () => {
					block = { timestamp: 3 };
					lastBlock = { timestamp: 3 };
					verifyBlockSlot = __private.verifyBlockSlot(block, lastBlock, {
						errors: [],
					});
					return expect(verifyBlockSlot.errors[0]).to.equal(
						'Invalid block timestamp'
					);
				});
			});
		});

		describe('when __private.verifyBlockSlot succeeds', () => {
			it('should return no error', async () => {
				block = { timestamp: 4 };
				lastBlock = { timestamp: 3 };
				verifyBlockSlot = __private.verifyBlockSlot(block, lastBlock, {
					errors: [],
				});
				return expect(verifyBlockSlot.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyBlockSlotWindow', () => {
		let verifyBlockSlotWindow;
		let slots;
		let slotsTemp;

		beforeEach(done => {
			slots = BlocksVerify.__get__('slots');
			slotsTemp = slots;
			slots.getSlotNumber = input => (input === undefined ? 100 : input);
			done();
		});

		afterEach(done => {
			slots = slotsTemp;
			done();
		});

		describe('when __private.verifyBlockSlotWindow fails', () => {
			describe('when currentApplicationSlot - blockSlot > BLOCK_SLOT_WINDOW', () => {
				it('should return error', async () => {
					verifyBlockSlotWindow = __private.verifyBlockSlotWindow(
						{ timestamp: 10 },
						{ errors: [] }
					);
					return expect(verifyBlockSlotWindow.errors[0]).to.equal(
						'Block slot is too old'
					);
				});
			});

			describe('currentApplicationSlot < blockSlot', () => {
				it('should return error', async () => {
					verifyBlockSlotWindow = __private.verifyBlockSlotWindow(
						{ timestamp: 110 },
						{ errors: [] }
					);
					return expect(verifyBlockSlotWindow.errors[0]).to.equal(
						'Block slot is in the future'
					);
				});
			});
		});

		describe('when __private.verifyBlockSlotWindow succeeds', () => {
			it('should return no error', async () => {
				verifyBlockSlotWindow = __private.verifyBlockSlotWindow(
					{ timestamp: 99 },
					{ errors: [] }
				);
				return expect(verifyBlockSlotWindow.errors.length).to.equal(0);
			});
		});
	});

	describe('verifyReceipt', () => {
		let privateTemp;
		let verifyReceipt;
		const dummyBlock = { id: 5 };
		const dummylastBlock = { id: 4 };

		beforeEach(done => {
			privateTemp = __private;
			__private.setHeight = sinonSandbox.stub().returns(dummyBlock);
			__private.verifySignature = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyPreviousBlock = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyAgainstLastNBlockIds = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyBlockSlotWindow = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyVersion = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyReward = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyId = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyPayload = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			modules.blocks.lastBlock.get.returns(dummylastBlock);
			done();
		});

		afterEach(done => {
			expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			expect(__private.setHeight).to.have.been.calledWith(
				dummyBlock,
				dummylastBlock
			);
			expect(__private.verifySignature).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyPreviousBlock).to.have.been.calledWith(
				dummyBlock,
				{ verified: false, errors: [] }
			);
			expect(__private.verifyAgainstLastNBlockIds).to.have.been.calledWith(
				dummyBlock,
				{ verified: false, errors: [] }
			);
			expect(__private.verifyBlockSlotWindow).to.have.been.calledWith(
				dummyBlock,
				{ verified: false, errors: [] }
			);
			expect(__private.verifyVersion).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyReward).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyId).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyPayload).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			__private = privateTemp;
			done();
		});

		it('should call private functions with correct parameters', async () => {
			verifyReceipt = blocksVerifyModule.verifyReceipt(dummyBlock);
			return expect(verifyReceipt).to.deep.equal({
				verified: true,
				errors: [],
			});
		});
	});

	describe('onBlockchainReady', () => {
		describe('when library.storage.entities.Block.get fails', () => {
			beforeEach(() =>
				library.storage.entities.Block.get.rejects('loadLastNBlockIds-ERR')
			);

			afterEach(() => {
				expect(loggerStub.error.args[0][0]).to.equal(
					'Unable to load last 5 block ids'
				);
				return expect(loggerStub.error.args[1][0].name).to.equal(
					'loadLastNBlockIds-ERR'
				);
			});

			it('should log error', async () =>
				blocksVerifyModule.onBlockchainReady());
		});

		describe('when library.storage.entities.Block.get succeeds', () => {
			beforeEach(() =>
				library.storage.entities.Block.get.resolves([
					{ id: 1 },
					{ id: 2 },
					{ id: 3 },
					{ id: 4 },
				])
			);

			afterEach(() => {
				expect(__private.lastNBlockIds).to.deep.equal([1, 2, 3, 4]);
				return expect(loggerStub.error.args.length).to.equal(0);
			});

			it('should log error', async () =>
				blocksVerifyModule.onBlockchainReady());
		});
	});

	describe('onNewBlock', () => {
		describe('when __private.lastNBlockIds.length > BLOCK_SLOT_WINDOW', () => {
			beforeEach(done => {
				__private.lastNBlockIds = [1, 2, 3, 4, 5, 6];
				done();
			});

			afterEach(() =>
				expect(__private.lastNBlockIds).to.deep.equal([2, 3, 4, 5, 6, 7])
			);

			it('should add new id to the end of lastNBlockIds array and delete first one', async () =>
				blocksVerifyModule.onNewBlock({ id: 7 }));
		});

		describe('when __private.lastNBlockIds.length <= BLOCK_SLOT_WINDOW', () => {
			beforeEach(done => {
				__private.lastNBlockIds = [1, 2, 3, 4];
				done();
			});

			afterEach(() =>
				expect(__private.lastNBlockIds).to.deep.equal([1, 2, 3, 4, 5])
			);

			it('should add new id to the end of lastNBlockIds array', async () =>
				blocksVerifyModule.onNewBlock({ id: 5 }));
		});
	});

	describe('verifyBlock', () => {
		let privateTemp;
		let verifyReceipt;
		const dummyBlock = { id: 5 };
		const dummylastBlock = { id: 4 };

		beforeEach(done => {
			modules.blocks.lastBlock.get.returns(dummylastBlock);
			privateTemp = __private;
			__private.setHeight = sinonSandbox.stub().returns(dummyBlock);
			__private.verifySignature = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyPreviousBlock = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyVersion = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyReward = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyId = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyPayload = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyForkOne = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			__private.verifyBlockSlot = sinonSandbox
				.stub()
				.returns({ verified: false, errors: [] });
			done();
		});

		afterEach(done => {
			expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			expect(__private.setHeight).to.have.been.calledWith(
				dummyBlock,
				dummylastBlock
			);
			expect(__private.verifySignature).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyPreviousBlock).to.have.been.calledWith(
				dummyBlock,
				{ verified: false, errors: [] }
			);
			expect(__private.verifyVersion).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyReward).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyId).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyPayload).to.have.been.calledWith(dummyBlock, {
				verified: false,
				errors: [],
			});
			expect(__private.verifyForkOne).to.have.been.calledWith(
				dummyBlock,
				dummylastBlock,
				{ verified: false, errors: [] }
			);
			expect(__private.verifyBlockSlot).to.have.been.calledWith(
				dummyBlock,
				dummylastBlock,
				{ verified: false, errors: [] }
			);
			__private = privateTemp;
			done();
		});

		it('should call private functions with correct parameters', async () => {
			verifyReceipt = blocksVerifyModule.verifyBlock(dummyBlock);
			return expect(verifyReceipt).to.deep.equal({
				verified: true,
				errors: [],
			});
		});
	});

	describe('addBlockProperties', () => {
		let dummyBlockReturned;
		const dummyBlock = {
			id: 1,
			version: 0,
			numberOfTransactions: 0,
			transactions: [],
			totalAmount: new Bignum(0),
			totalFee: new Bignum(0),
			payloadLength: 0,
			reward: new Bignum(0),
		};

		afterEach(() => expect(dummyBlockReturned).to.deep.equal(dummyBlock));

		describe('when block.version = undefined', () => {
			it('should add version = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.version;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.numberOfTransactions = undefined', () => {
			describe('and block.transactions = undefined', () => {
				it('should add numberOfTransactions = 0', async () => {
					const dummyBlockReduced = _.cloneDeep(dummyBlock);
					delete dummyBlockReduced.numberOfTransactions;
					delete dummyBlockReduced.transactions;
					dummyBlockReturned = blocksVerifyModule.addBlockProperties(
						dummyBlockReduced
					);
					return dummyBlockReturned;
				});
			});

			describe('and block.transactions != undefined', () => {
				it('should add numberOfTransactions = block.transactions.length', async () => {
					const dummyBlockReduced = _.cloneDeep(dummyBlock);
					delete dummyBlockReduced.numberOfTransactions;
					dummyBlockReturned = blocksVerifyModule.addBlockProperties(
						dummyBlockReduced
					);
					return dummyBlockReturned;
				});
			});
		});

		describe('when block.totalAmount = undefined', () => {
			it('should add totalAmount = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.totalAmount;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.totalFee = undefined', () => {
			it('should add totalFee = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.totalFee;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.payloadLength = undefined', () => {
			it('should add payloadLength = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.payloadLength;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.reward = undefined', () => {
			it('should add reward = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.reward;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.transactions = undefined', () => {
			it('should add transactions = []', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.transactions;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});
	});

	describe('deleteBlockProperties', () => {
		let dummyBlockReduced;
		const dummyBlock = {
			id: 1,
			version: 1,
			numberOfTransactions: 1,
			transactions: [{ id: 1 }],
			totalAmount: new Bignum(1),
			totalFee: new Bignum(1),
			payloadLength: 1,
			reward: new Bignum(1),
		};

		describe('when block.version = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.not.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete version property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.version = 0;
				dummyBlockReduced = blocksVerifyModule.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.numberOfTransactions = number', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete numberOfTransactions property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockReduced = blocksVerifyModule.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.totalAmount = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.not.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalAmount property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.totalAmount = new Bignum(0);
				dummyBlockReduced = blocksVerifyModule.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.totalFee = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.not.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.totalFee = new Bignum(0);
				dummyBlockReduced = blocksVerifyModule.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.payloadLength = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.not.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.payloadLength = 0;
				dummyBlockReduced = blocksVerifyModule.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.reward = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.not.have.property('reward');
				return expect(dummyBlockReduced).to.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.reward = new Bignum(0);
				dummyBlockReduced = blocksVerifyModule.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});

		describe('when block.transactions.length = 0', () => {
			afterEach(() => {
				expect(dummyBlockReduced).to.have.property('version');
				expect(dummyBlockReduced).to.not.have.property('numberOfTransactions');
				expect(dummyBlockReduced).to.have.property('totalAmount');
				expect(dummyBlockReduced).to.have.property('totalFee');
				expect(dummyBlockReduced).to.have.property('payloadLength');
				expect(dummyBlockReduced).to.have.property('reward');
				return expect(dummyBlockReduced).to.not.have.property('transactions');
			});

			it('should delete totalFee property', async () => {
				const dummyBlockCompleted = _.cloneDeep(dummyBlock);
				dummyBlockCompleted.transactions = [];
				dummyBlockReduced = blocksVerifyModule.deleteBlockProperties(
					dummyBlockCompleted
				);
				return dummyBlockReduced;
			});
		});
	});

	describe('__private.addBlockProperties', () => {
		let addBlockPropertiesTemp;
		const dummyBlock = { id: 1 };

		beforeEach(done => {
			addBlockPropertiesTemp = blocksVerifyModule.addBlockProperties;
			blocksVerifyModule.addBlockProperties = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			blocksVerifyModule.addBlockProperties = addBlockPropertiesTemp;
			done();
		});

		describe('when broadcast = false', () => {
			describe('when self.addBlockProperties fails', () => {
				beforeEach(() =>
					blocksVerifyModule.addBlockProperties.throws('addBlockProperties-ERR')
				);

				it('should call a callback with error', done => {
					__private.addBlockProperties(dummyBlock, false, err => {
						expect(err.name).to.equal('addBlockProperties-ERR');
						done();
					});
				});
			});

			describe('when self.addBlockProperties succeeds', () => {
				beforeEach(() =>
					blocksVerifyModule.addBlockProperties.returns({
						id: 1,
						version: 0,
					})
				);

				it('should call a callback with no error', done => {
					__private.addBlockProperties(dummyBlock, false, err => {
						expect(err).to.be.undefined;
						done();
					});
				});
			});
		});

		describe('when broadcast = true', () => {
			beforeEach(() =>
				blocksVerifyModule.addBlockProperties.returns({
					id: 1,
					version: 0,
				})
			);

			it('should call a callback with no error', done => {
				__private.addBlockProperties(dummyBlock, true, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});
	});

	describe('__private.normalizeBlock', () => {
		const dummyBlock = { id: 1 };

		describe('when library.logic.block.objectNormalize fails', () => {
			beforeEach(() =>
				library.logic.block.objectNormalize.throws('objectNormalize-ERR')
			);

			it('should call a callback with error', done => {
				__private.normalizeBlock(dummyBlock, err => {
					expect(err.name).to.equal('objectNormalize-ERR');
					done();
				});
			});
		});

		describe('when library.logic.block.objectNormalize succeeds', () => {
			beforeEach(() =>
				library.logic.block.objectNormalize.returns({
					id: 1,
					version: 0,
				})
			);

			it('should call a callback with no error', done => {
				__private.normalizeBlock(dummyBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});
	});

	describe('__private.verifyBlock', () => {
		let verifyBlockTemp;
		const dummyBlock = { id: 1 };

		beforeEach(done => {
			verifyBlockTemp = blocksVerifyModule.verifyBlock;
			blocksVerifyModule.verifyBlock = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			blocksVerifyModule.verifyBlock = verifyBlockTemp;
			done();
		});

		describe('when self.verifyBlock fails', () => {
			beforeEach(() =>
				blocksVerifyModule.verifyBlock.returns({
					verified: false,
					errors: ['verifyBlock-ERR'],
				})
			);

			afterEach(() => {
				expect(loggerStub.error.args[0][0]).to.be.equal(
					'Block 1 verification failed'
				);
				return expect(loggerStub.error.args[0][1]).to.be.equal(
					'verifyBlock-ERR'
				);
			});

			it('should call a callback with error', done => {
				__private.verifyBlock(dummyBlock, err => {
					expect(err).to.equal('verifyBlock-ERR');
					done();
				});
			});
		});

		describe('when self.verifyBlock succeeds', () => {
			beforeEach(() =>
				blocksVerifyModule.verifyBlock.returns({
					verified: true,
					errors: [],
				})
			);

			it('should call a callback with no error', done => {
				__private.verifyBlock(dummyBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});
	});

	describe('__private.broadcastBlock', () => {
		let broadcastReducedBlockTemp;
		let deleteBlockPropertiesTemp;
		const dummyBlock = { id: 1, version: 0 };
		const dummyBlockReduced = { id: 1 };

		beforeEach(done => {
			broadcastReducedBlockTemp = blocksVerifyModule.broadcastReducedBlock;
			deleteBlockPropertiesTemp = blocksVerifyModule.deleteBlockProperties;
			blocksVerifyModule.broadcastReducedBlock = sinonSandbox.stub();
			blocksVerifyModule.deleteBlockProperties = sinonSandbox
				.stub()
				.returns(dummyBlock);
			done();
		});

		afterEach(done => {
			blocksVerifyModule.broadcastReducedBlock = broadcastReducedBlockTemp;
			blocksVerifyModule.deleteBlockProperties = deleteBlockPropertiesTemp;
			done();
		});

		describe('when broadcast = true', () => {
			describe('when self.deleteBlockProperties fails', () => {
				beforeEach(() =>
					blocksVerifyModule.deleteBlockProperties.throws(
						'deleteBlockProperties-ERR'
					)
				);

				afterEach(
					async () =>
						expect(modules.blocks.chain.broadcastReducedBlock.calledOnce).to.be
							.false
				);

				it('should call a callback with error', done => {
					__private.broadcastBlock(dummyBlock, true, err => {
						expect(err.name).to.equal('deleteBlockProperties-ERR');
						done();
					});
				});
			});

			describe('when self.deleteBlockProperties succeeds', () => {
				beforeEach(() =>
					blocksVerifyModule.deleteBlockProperties.returns(dummyBlockReduced)
				);

				afterEach(() => {
					expect(modules.blocks.chain.broadcastReducedBlock.calledOnce).to.be
						.true;
					return expect(
						modules.blocks.chain.broadcastReducedBlock
					).to.have.been.calledWith(dummyBlockReduced, true);
				});

				it('should call a callback with no error', done => {
					__private.broadcastBlock(dummyBlock, true, err => {
						expect(err).to.be.undefined;
						done();
					});
				});
			});
		});

		describe('when broadcast = false', () => {
			afterEach(() => {
				expect(blocksVerifyModule.deleteBlockProperties.calledOnce).to.be.false;
				return expect(modules.blocks.chain.broadcastReducedBlock.calledOnce).to
					.be.false;
			});

			it('should call a callback with no error', done => {
				__private.broadcastBlock(dummyBlock, false, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});
	});

	describe('__private.checkExists', () => {
		const dummyBlock = { id: 1 };

		describe('when library.storage.entities.Block.isPersisted fails', () => {
			beforeEach(() =>
				library.storage.entities.Block.isPersisted.rejects('blockExists-ERR')
			);

			afterEach(() =>
				expect(loggerStub.error.args[0][0].name).to.equal('blockExists-ERR')
			);

			it('should call a callback with error', done => {
				__private.checkExists(dummyBlock, err => {
					expect(err).to.equal('Block#blockExists error');
					done();
				});
			});
		});

		describe('when library.storage.entities.Block.isPersisted succeeds', () => {
			describe('if rows = true', () => {
				beforeEach(() =>
					library.storage.entities.Block.isPersisted.resolves(true)
				);

				it('should call a callback with error', done => {
					__private.checkExists(dummyBlock, err => {
						expect(err).to.be.equal('Block 1 already exists');
						done();
					});
				});
			});

			describe('if rows = false', () => {
				beforeEach(() =>
					library.storage.entities.Block.isPersisted.resolves(false)
				);

				it('should call a callback with no error', done => {
					__private.checkExists(dummyBlock, err => {
						expect(err).to.be.undefined;
						done();
					});
				});
			});
		});
	});

	describe('__private.validateBlockSlot', () => {
		const dummyBlock = { id: 1 };

		describe('when modules.delegates.validateBlockSlot fails', () => {
			beforeEach(() =>
				modules.delegates.validateBlockSlot.callsArgWith(
					1,
					'validateBlockSlot-ERR',
					null
				)
			);

			afterEach(() => {
				expect(modules.delegates.validateBlockSlot).calledWith(dummyBlock);
				return expect(modules.delegates.fork).calledWith(dummyBlock, 3);
			});

			it('should call a callback with error', done => {
				__private.validateBlockSlot(dummyBlock, err => {
					expect(err).to.equal('validateBlockSlot-ERR');
					done();
				});
			});
		});

		describe('when modules.delegates.validateBlockSlot succeeds', () => {
			beforeEach(() =>
				modules.delegates.validateBlockSlot.callsArgWith(1, null, true)
			);

			afterEach(() => {
				expect(modules.delegates.validateBlockSlot).calledWith(dummyBlock);
				return expect(modules.delegates.fork.calledOnce).to.be.false;
			});

			it('should call a callback with no error', done => {
				__private.validateBlockSlot(dummyBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});
	});

	describe('__private.checkTransactions', () => {
		let dummyBlock;
		let validTransactionsResponse;
		let invalidTransactionsResponse;

		describe('when block.transactions is empty', () => {
			it('should not throw', async () => {
				dummyBlock = { id: 1, transactions: [] };
				expect(__private.checkTransactions.bind(__private, dummyBlock, true)).to
					.not.throw;
			});
		});

		describe('when block.transactions is not empty', () => {
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

			describe('when checkExists is set to true', () => {
				describe('when Transaction.get returns confirmed transactions', () => {
					beforeEach(async () => {
						storageStub.entities.Transaction.get.resolves(
							dummyBlock.transactions
						);
					});

					it('should throw error when transaction is already confirmed', async () => {
						expect(__private.checkTransactions(dummyBlock.transactions, true))
							.to.eventually.rejected;
					});
				});

				describe('when Transaction.get returns empty array', () => {
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
								errors: [new Error()],
							})
						);

						storageStub.entities.Transaction.get.resolves([]);
					});

					// TODO: slight behaviour changed in method check
					// eslint-disable-next-line
					it.skip('should not throw if the verifyTransaction returns transaction response with Status = OK', async () => {
						modules.processTransactions.verifyTransactions.resolves(
							validTransactionsResponse
						);
						await __private.checkTransactions(dummyBlock.transactions, true);
						expect(modules.processTransactions.verifyTransactions).to.be
							.calledOnce;
					});

					it('should throw if the verifyTransaction returns transaction response with Status != OK', async () => {
						modules.processTransactions.verifyTransactions.resolves(
							invalidTransactionsResponse
						);
						expect(__private.checkTransactions(dummyBlock.transactions, true))
							.to.eventually.throw;
					});
				});
			});
		});
	});

	describe('processBlock', () => {
		let privateTemp;
		const dummyBlock = { id: 5 };
		let broadcast;
		let saveBlock;

		beforeEach(done => {
			privateTemp = __private;
			__private.addBlockProperties = sinonSandbox
				.stub()
				.callsArgWith(2, null, true);
			__private.normalizeBlock = sinonSandbox
				.stub()
				.callsArgWith(1, null, true);
			__private.verifyBlock = sinonSandbox.stub().callsArgWith(1, null, true);
			__private.checkExists = sinonSandbox.stub().callsArgWith(1, null, true);
			__private.validateBlockSlot = sinonSandbox
				.stub()
				.callsArgWith(1, null, true);
			__private.checkTransactions = sinonSandbox.stub().resolves();
			modules.blocks.chain.applyBlock.callsArgWith(2, null, true);
			__private.broadcastBlock = sinonSandbox
				.stub()
				.callsArgWith(2, null, true);
			done();
		});

		afterEach(done => {
			expect(modules.blocks.isCleaning.get.calledOnce).to.be.true;
			expect(__private.addBlockProperties).to.have.been.calledWith(
				dummyBlock,
				broadcast
			);
			expect(__private.normalizeBlock).to.have.been.calledWith(dummyBlock);
			expect(__private.verifyBlock).to.have.been.calledWith(dummyBlock);
			expect(__private.broadcastBlock).to.have.been.calledWith(
				dummyBlock,
				broadcast
			);
			expect(__private.validateBlockSlot).to.have.been.calledWith(dummyBlock);
			expect(__private.checkTransactions).to.have.been.calledWith(
				dummyBlock.transactions
			);
			expect(modules.blocks.chain.applyBlock).to.have.been.calledWith(
				dummyBlock,
				saveBlock
			);
			__private = privateTemp;
			done();
		});

		describe('applicationState update', () => {
			beforeEach(() =>
				modules.blocks.calculateNewBroadhash.resolves({
					broadhash: 'xx',
					height: 1,
				})
			);

			afterEach(() => channelMock.invoke.resetHistory());

			it('should be called if snapshotting was not activated and broadcast is true', done => {
				broadcast = true;
				blocksVerifyModule.processBlock(
					dummyBlock,
					broadcast,
					saveBlock,
					err => {
						expect(err).to.be.null;
						expect(channelMock.once).to.be.calledOnce;
						expect(channelMock.invoke).to.be.calledOnce;
						done();
					}
				);
			});
		});

		describe('when broadcast = true', () => {
			beforeEach(() =>
				modules.blocks.calculateNewBroadhash.resolves({
					broadhash: 'xx',
					height: 1,
				})
			);

			describe('when saveBlock = true', () => {
				it('should call private functions with correct parameters', done => {
					broadcast = true;
					saveBlock = true;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(__private.checkExists).to.have.been.calledWith(dummyBlock);
							done();
						}
					);
				});
			});

			describe('when saveBlock = false', () => {
				it('should call private functions with correct parameters', done => {
					broadcast = true;
					saveBlock = false;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(__private.checkExists).to.not.called;
							done();
						}
					);
				});
			});
		});

		describe('when broadcast = false', () => {
			beforeEach(() =>
				modules.blocks.calculateNewBroadhash.resolves({
					broadhash: 'xx',
					height: 1,
				})
			);

			describe('when saveBlock = true', () => {
				it('should call private functions with correct parameters', done => {
					broadcast = false;
					saveBlock = true;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(__private.checkExists).to.have.been.calledWith(dummyBlock);
							done();
						}
					);
				});
			});

			describe('when saveBlock = false', () => {
				it('should call private functions with correct parameters', done => {
					broadcast = false;
					saveBlock = false;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(__private.checkExists).to.not.called;
							done();
						}
					);
				});
			});

			describe('when broadcast = true and saveBlock = true', () => {
				it('should call all functions in the correct order', done => {
					broadcast = true;
					saveBlock = true;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;

							sinonSandbox.assert.callOrder(
								__private.addBlockProperties,
								__private.normalizeBlock,
								__private.verifyBlock,
								__private.broadcastBlock,
								__private.checkExists,
								__private.validateBlockSlot,
								__private.checkTransactions,
								modules.blocks.chain.applyBlock,

								channelMock.invoke
							);

							done();
						}
					);
				});
			});
		});
	});

	describe('onBind', () => {
		beforeEach(done => {
			loggerStub.trace.resetHistory();
			__private.loaded = false;
			blocksVerifyModule.onBind(bindingsStub);
			done();
		});

		it('should call library.logger.trace with "Blocks->Verify: Shared modules bind."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Verify: Shared modules bind.'
			));

		it('should assign params to modules', done => {
			expect(modules.accounts).to.equal(bindingsStub.modules.accounts);
			expect(modules.blocks).to.equal(bindingsStub.modules.blocks);
			expect(modules.delegates).to.equal(bindingsStub.modules.delegates);
			expect(modules.transactions).to.equal(bindingsStub.modules.transactions);
			done();
		});

		it('should set __private.loaded to true', async () =>
			expect(__private.loaded).to.be.true);
	});
});
