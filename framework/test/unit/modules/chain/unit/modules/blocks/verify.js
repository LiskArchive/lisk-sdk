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

const rewire = require('rewire');
const Bignum = require('../../../../../../../src/modules/chain/helpers/bignum.js');

const BlocksVerify = rewire(
	'../../../../../../../src/modules/chain/modules/blocks/verify.js'
);

const exceptions = global.exceptions;

describe('blocks/verify', async () => {
	let library;
	let __private;
	let loggerStub;
	let storageStub;
	let logicBlockStub;
	let logicTransactionStub;
	let configMock;
	let blocksVerifyModule;
	let bindingsStub;
	let modules;
	let components;

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
			},
		};

		logicBlockStub = {
			verifySignature: sinonSandbox.stub(),
			getId: sinonSandbox.stub(),
			objectNormalize: sinonSandbox.stub(),
		};

		logicTransactionStub = {
			getId: sinonSandbox.stub(),
			checkConfirmed: sinonSandbox.stub(),
			verify: sinonSandbox.stub(),
			getBytes: sinonSandbox.stub(),
		};

		configMock = {
			loading: {
				snapshotRound: null,
			},
		};

		blocksVerifyModule = new BlocksVerify(
			loggerStub,
			logicBlockStub,
			logicTransactionStub,
			storageStub,
			configMock
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

		const modulesTransportStub = {
			broadcastHeaders: sinonSandbox.stub(),
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
		};

		const componentsSystemStub = {
			update: sinonSandbox.stub(),
		};

		bindingsStub = {
			modules: {
				accounts: modulesAccountsStub,
				blocks: modulesBlocksStub,
				delegates: modulesDelegatesStub,
				transactions: modulesTransactionsStub,
				transport: modulesTransportStub,
			},

			components: {
				system: componentsSystemStub,
			},
		};

		blocksVerifyModule.onBind(bindingsStub);
		modules = BlocksVerify.__get__('modules');
		components = BlocksVerify.__get__('components');
		done();
	});

	afterEach(() => sinonSandbox.restore());

	describe('constructor', async () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.storage).to.eql(storageStub);
			expect(library.logic.block).to.eql(logicBlockStub);
			expect(library.config).to.eql(configMock);
			return expect(library.logic.transaction).to.eql(logicTransactionStub);
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

	describe('__private.checkTransaction', async () => {
		const dummyBlock = { id: '5', height: 5 };
		const dummyTransaction = { id: '5', type: 0 };

		describe('when library.logic.transaction.getId fails', async () => {
			beforeEach(() => library.logic.transaction.getId.throws('getId-ERR'));

			it('should call a callback with error', done => {
				__private.checkTransaction(dummyBlock, dummyTransaction, true, err => {
					expect(err).to.equal('getId-ERR');
					done();
				});
			});
		});

		describe('when library.logic.transaction.getId succeeds', async () => {
			beforeEach(() => library.logic.transaction.getId.returns('4'));

			describe('when modules.accounts.getAccount fails', async () => {
				beforeEach(() =>
					modules.accounts.getAccount.callsArgWith(1, 'getAccount-ERR', null)
				);

				it('should call a callback with error', done => {
					__private.checkTransaction(
						dummyBlock,
						dummyTransaction,
						true,
						err => {
							expect(err).to.equal('getAccount-ERR');
							done();
						}
					);
				});
			});

			describe('when modules.accounts.getAccount succeeds', async () => {
				beforeEach(() =>
					modules.accounts.getAccount.callsArgWith(1, null, true)
				);

				describe('when library.logic.transaction.verify succeeds', async () => {
					beforeEach(() =>
						library.logic.transaction.verify.callsArgWith(4, null, true)
					);

					it('should call a callback with no error', done => {
						__private.checkTransaction(
							dummyBlock,
							dummyTransaction,
							true,
							err => {
								expect(err).to.be.null;
								done();
							}
						);
					});
				});

				describe('when library.logic.transaction.verify fails', async () => {
					beforeEach(() =>
						library.logic.transaction.verify.callsArgWith(4, 'verify-ERR', null)
					);

					it('should call a callback with error', done => {
						__private.checkTransaction(
							dummyBlock,
							dummyTransaction,
							true,
							err => {
								expect(err).to.equal('verify-ERR');
								done();
							}
						);
					});

					describe('when failure is related to fork 2', async () => {
						beforeEach(() => {
							library.logic.transaction.verify.callsArgWith(
								4,
								'Transaction is already confirmed',
								null
							);
							modules.delegates.fork.returns();
							modules.transactions.removeUnconfirmedTransaction.returns();
							return modules.transactions.undoUnconfirmed.callsArgWith(1, null);
						});

						it('should log the fork 2 entry', done => {
							__private.checkTransaction(
								dummyBlock,
								dummyTransaction,
								true,
								err => {
									expect(err).to.equal('Transaction is already confirmed');
									expect(modules.delegates.fork).to.be.calledOnce;
									expect(modules.delegates.fork).to.be.calledWithExactly(
										dummyBlock,
										2
									);
									done();
								}
							);
						});

						it('should undo unconfirmed state for that transaction', done => {
							__private.checkTransaction(
								dummyBlock,
								dummyTransaction,
								true,
								err => {
									expect(err).to.equal('Transaction is already confirmed');
									expect(modules.transactions.undoUnconfirmed).to.be.calledOnce;
									expect(
										modules.transactions.undoUnconfirmed.firstCall.args[0]
									).to.be.eql(dummyTransaction);
									expect(modules.transactions.removeUnconfirmedTransaction).to
										.be.calledOnce;
									expect(
										modules.transactions.removeUnconfirmedTransaction
									).to.be.calledWithExactly(dummyTransaction.id);
									done();
								}
							);
						});
					});
				});
			});
		});
	});

	describe('__private.setHeight', async () => {
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

	describe('__private.verifySignature', async () => {
		describe('when library.logic.block.verifySignature fails', async () => {
			describe('if throws error', async () => {
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

			describe('if is not valid', async () => {
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

		describe('when library.logic.block.verifySignature succeeds', async () => {
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

	describe('when __private.verifyPreviousBlock fails', async () => {
		describe('if block.previousBlock is not defined and height != 1', async () => {
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

	describe('when __private.verifyPreviousBlock succeeds', async () => {
		describe('if block.previousBlock is not defined and height = 1', async () => {
			it('should return no error', async () => {
				const verifyPreviousBlock = __private.verifyPreviousBlock(
					{ id: 6, height: 1 },
					{ errors: [] }
				);
				return expect(verifyPreviousBlock.errors.length).to.equal(0);
			});
		});

		describe('if block.previousBlock is defined and block.height != 1', async () => {
			it('should return no error', async () => {
				const verifyPreviousBlock = __private.verifyPreviousBlock(
					{ id: 6, previousBlock: 5, height: 3 },
					{ errors: [] }
				);
				return expect(verifyPreviousBlock.errors.length).to.equal(0);
			});
		});

		describe('if block.previousBlock is defined and block.height = 1', async () => {
			it('should return no error', async () => {
				const verifyPreviousBlock = __private.verifyPreviousBlock(
					{ id: 6, previousBlock: 5, height: 1 },
					{ errors: [] }
				);
				return expect(verifyPreviousBlock.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyAgainstLastNBlockIds', async () => {
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

	describe('__private.verifyVersion', async () => {
		let verifyVersion;

		describe('when there are no exceptions for block versions', async () => {
			describe('when block height provided', async () => {
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

			describe('when block height is missing', async () => {
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

		describe('when there are proper exceptions set for block versions', async () => {
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

			describe('when block height provided', async () => {
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

			describe('when block height is missing', async () => {
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

	describe('__private.verifyReward', async () => {
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

		describe('when __private.blockReward.calcReward succeeds', async () => {
			beforeEach(() => __private.blockReward.calcReward.returns(new Bignum(5)));

			describe('if block.height != 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) = -1', async () => {
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

			describe('if block.height != 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) != -1', async () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 5, reward: 1, id: 3 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height != 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) = -1', async () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 5, reward: 5, id: 3 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height != 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) != -1', async () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 5, reward: 5, id: 5 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) = -1', async () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 1, reward: 1, id: 5 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward != block.reward && exceptions.blockRewards.indexOf(block.id) != -1', async () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 1, reward: 1, id: 3 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) = -1', async () => {
				it('should return no error', async () => {
					verifyReward = __private.verifyReward(
						{ height: 1, reward: 5, id: 5 },
						{ errors: [] }
					);
					return expect(verifyReward.errors.length).to.equal(0);
				});
			});

			describe('if block.height = 1 && expectedReward = block.reward && exceptions.blockRewards.indexOf(block.id) != -1', async () => {
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

	describe('__private.verifyId', async () => {
		let verifyId;

		describe('when block = undefined', async () => {
			it('should return error', async () => {
				verifyId = __private.verifyId(undefined, { errors: [] });
				return expect(verifyId.errors[0]).to.equal(
					"TypeError: Cannot set property 'id' of undefined"
				);
			});
		});

		describe('when library.logic.block.getId fails', async () => {
			beforeEach(() => library.logic.block.getId.throws('getId-ERR'));

			it('should return error', async () => {
				verifyId = __private.verifyId({ id: 5 }, { errors: [] });
				return expect(verifyId.errors[0]).to.equal('getId-ERR');
			});
		});

		describe('when library.logic.block.getId succeeds', async () => {
			beforeEach(() => library.logic.block.getId.returns(5));

			it('should return no error', async () => {
				verifyId = __private.verifyId({ id: 5 }, { errors: [] });
				return expect(verifyId.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyPayload', async () => {
		let verifyPayload;
		const dummyBlock = {
			payloadLength: 2,
			numberOfTransactions: 2,
			payloadHash:
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			totalAmount: 10,
			totalFee: 2,
			transactions: [
				{
					amount: 5,
					fee: 1,
					id: 1,
				},
				{
					amount: 5,
					fee: 1,
					id: 2,
				},
			],
		};

		describe('when __private.verifyPayload fails', async () => {
			afterEach(() =>
				expect(verifyPayload.errors)
					.to.be.an('array')
					.with.lengthOf(1)
			);

			describe('when payload lenght is too long', async () => {
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

			describe('when transactions do not match block transactions count', async () => {
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

			describe('when number of transactions exceeds maximum per block', async () => {
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

			describe('library.logic.transaction.getBytes fails', async () => {
				describe('when throws error', async () => {
					beforeEach(() =>
						library.logic.transaction.getBytes
							.onCall(0)
							.throws('getBytes-ERR')
							.onCall(1)
							.returns(0)
					);

					it('should return error', async () => {
						verifyPayload = __private.verifyPayload(dummyBlock, { errors: [] });
						return expect(verifyPayload.errors[0]).to.equal('getBytes-ERR');
					});
				});

				describe('when returns invalid bytes', async () => {
					beforeEach(() => library.logic.transaction.getBytes.returns('abc'));

					it('should return error', async () => {
						verifyPayload = __private.verifyPayload(dummyBlock, { errors: [] });
						return expect(verifyPayload.errors[0]).to.equal(
							'Invalid payload hash'
						);
					});
				});
			});

			describe('when encountered duplicate transaction', async () => {
				it('should return error', async () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.transactions[1].id = 1;
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal(
						'Encountered duplicate transaction: 1'
					);
				});
			});

			describe('when payload hash is invalid', async () => {
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

			describe('when total amount is invalid', async () => {
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

			describe('when total fee is invalid', async () => {
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

		describe('when __private.verifyPayload succeeds', async () => {
			it('should return no error', async () => {
				verifyPayload = __private.verifyPayload(dummyBlock, { errors: [] });
				return expect(verifyPayload.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyForkOne', async () => {
		let verifyForkOne;
		let block;
		let lastBlock;

		describe('when __private.verifyForkOne fails', async () => {
			describe('when block.previousBlock && block.previousBlock != lastBlock.id', async () => {
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

		describe('when __private.verifyForkOne succeeds', async () => {
			describe('when block.previousBlock = undefined', async () => {
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

			describe('when block.previousBlock = lastBlock.id', async () => {
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

	describe('__private.verifyBlockSlot', async () => {
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

		describe('when __private.verifyBlockSlot fails', async () => {
			describe('when blockSlotNumber > slots.getSlotNumber()', async () => {
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

			describe('when blockSlotNumber <= lastBlockSlotNumber', async () => {
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

		describe('when __private.verifyBlockSlot succeeds', async () => {
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

	describe('__private.verifyBlockSlotWindow', async () => {
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

		describe('when __private.verifyBlockSlotWindow fails', async () => {
			describe('when currentApplicationSlot - blockSlot > BLOCK_SLOT_WINDOW', async () => {
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

			describe('currentApplicationSlot < blockSlot', async () => {
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

		describe('when __private.verifyBlockSlotWindow succeeds', async () => {
			it('should return no error', async () => {
				verifyBlockSlotWindow = __private.verifyBlockSlotWindow(
					{ timestamp: 99 },
					{ errors: [] }
				);
				return expect(verifyBlockSlotWindow.errors.length).to.equal(0);
			});
		});
	});

	describe('verifyReceipt', async () => {
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

	describe('onBlockchainReady', async () => {
		describe('when library.storage.entities.Block.get fails', async () => {
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

		describe('when library.storage.entities.Block.get succeeds', async () => {
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

	describe('onNewBlock', async () => {
		describe('when __private.lastNBlockIds.length > BLOCK_SLOT_WINDOW', async () => {
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

		describe('when __private.lastNBlockIds.length <= BLOCK_SLOT_WINDOW', async () => {
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

	describe('verifyBlock', async () => {
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

	describe('addBlockProperties', async () => {
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

		describe('when block.version = undefined', async () => {
			it('should add version = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.version;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.numberOfTransactions = undefined', async () => {
			describe('and block.transactions = undefined', async () => {
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

			describe('and block.transactions != undefined', async () => {
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

		describe('when block.totalAmount = undefined', async () => {
			it('should add totalAmount = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.totalAmount;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.totalFee = undefined', async () => {
			it('should add totalFee = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.totalFee;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.payloadLength = undefined', async () => {
			it('should add payloadLength = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.payloadLength;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.reward = undefined', async () => {
			it('should add reward = 0', async () => {
				const dummyBlockReduced = _.cloneDeep(dummyBlock);
				delete dummyBlockReduced.reward;
				dummyBlockReturned = blocksVerifyModule.addBlockProperties(
					dummyBlockReduced
				);
				return dummyBlockReturned;
			});
		});

		describe('when block.transactions = undefined', async () => {
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

	describe('deleteBlockProperties', async () => {
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

		describe('when block.version = 0', async () => {
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

		describe('when block.numberOfTransactions = number', async () => {
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

		describe('when block.totalAmount = 0', async () => {
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

		describe('when block.totalFee = 0', async () => {
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

		describe('when block.payloadLength = 0', async () => {
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

		describe('when block.reward = 0', async () => {
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

		describe('when block.transactions.length = 0', async () => {
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

	describe('__private.addBlockProperties', async () => {
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

		describe('when broadcast = false', async () => {
			describe('when self.addBlockProperties fails', async () => {
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

			describe('when self.addBlockProperties succeeds', async () => {
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

		describe('when broadcast = true', async () => {
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

	describe('__private.normalizeBlock', async () => {
		const dummyBlock = { id: 1 };

		describe('when library.logic.block.objectNormalize fails', async () => {
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

		describe('when library.logic.block.objectNormalize succeeds', async () => {
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

	describe('__private.verifyBlock', async () => {
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

		describe('when self.verifyBlock fails', async () => {
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

		describe('when self.verifyBlock succeeds', async () => {
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

	describe('__private.broadcastBlock', async () => {
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

		describe('when broadcast = true', async () => {
			describe('when self.deleteBlockProperties fails', async () => {
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

			describe('when self.deleteBlockProperties succeeds', async () => {
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

		describe('when broadcast = false', async () => {
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

	describe('__private.checkExists', async () => {
		const dummyBlock = { id: 1 };

		describe('when library.storage.entities.Block.isPersisted fails', async () => {
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

		describe('when library.storage.entities.Block.isPersisted succeeds', async () => {
			describe('if rows = true', async () => {
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

			describe('if rows = false', async () => {
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

	describe('__private.validateBlockSlot', async () => {
		const dummyBlock = { id: 1 };

		describe('when modules.delegates.validateBlockSlot fails', async () => {
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

		describe('when modules.delegates.validateBlockSlot succeeds', async () => {
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

	describe('__private.checkTransactions', async () => {
		let checkTransactionTemp;
		let dummyBlock;

		beforeEach(done => {
			checkTransactionTemp = __private.checkTransaction;
			__private.checkTransaction = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			__private.checkTransaction = checkTransactionTemp;
			done();
		});

		describe('when block.transactions is empty', async () => {
			afterEach(
				async () => expect(__private.checkTransaction.called).to.be.false
			);

			it('should call a callback with no error', done => {
				dummyBlock = { id: 1, transactions: [] };
				__private.checkTransactions(dummyBlock, true, err => {
					expect(err).to.be.null;
					done();
				});
			});
		});

		describe('when block.transactions is not empty', async () => {
			afterEach(
				async () => expect(__private.checkTransaction.called).to.be.true
			);

			describe('when __private.checkTransaction fails', async () => {
				beforeEach(() =>
					__private.checkTransaction.callsArgWith(
						2,
						'checkTransaction-ERR',
						null
					)
				);

				it('should call a callback with error', done => {
					dummyBlock = { id: 1, transactions: [{ id: 1 }] };
					__private.checkTransactions(dummyBlock, err => {
						expect(err).to.equal('checkTransaction-ERR');
						done();
					});
				});
			});

			describe('when __private.checkTransaction succeeds', async () => {
				beforeEach(() =>
					__private.checkTransaction.callsArgWith(2, null, true)
				);

				it('should call a callback with no error', done => {
					dummyBlock = { id: 1, transactions: [{ id: 1 }] };
					__private.checkTransactions(dummyBlock, err => {
						expect(err).to.be.null;
						done();
					});
				});
			});
		});
	});

	describe('processBlock', async () => {
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
			__private.checkTransactions = sinonSandbox
				.stub()
				.callsArgWith(2, null, true);
			modules.blocks.chain.applyBlock.callsArgWith(2, null, true);
			__private.broadcastBlock = sinonSandbox
				.stub()
				.callsArgWith(2, null, true);
			components.system.update.resolves();
			modules.transport.broadcastHeaders.callsArgWith(0, null, true);
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
			expect(__private.checkTransactions).to.have.been.calledWith(dummyBlock);
			expect(modules.blocks.chain.applyBlock).to.have.been.calledWith(
				dummyBlock,
				saveBlock
			);
			__private = privateTemp;
			done();
		});

		describe('system update', async () => {
			it('should be called if snapshotting was not activated', done => {
				blocksVerifyModule.processBlock(
					dummyBlock,
					broadcast,
					saveBlock,
					err => {
						expect(err).to.be.null;
						expect(components.system.update.calledOnce).to.be.true;
						done();
					}
				);
			});

			it('should not be called if snapshotting was activated', done => {
				const blocksVerifyAuxModule = new BlocksVerify(
					loggerStub,
					logicBlockStub,
					logicTransactionStub,
					storageStub,
					{
						loading: { snapshotRound: 123 },
					}
				);

				blocksVerifyAuxModule.processBlock(
					dummyBlock,
					broadcast,
					saveBlock,
					err => {
						expect(err).to.be.null;
						expect(components.system.update.calledOnce).to.be.false;
						done();
					}
				);
			});
		});

		describe('when broadcast = true', async () => {
			describe('when saveBlock = true', async () => {
				it('should call private functions with correct parameters', done => {
					broadcast = true;
					saveBlock = true;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(modules.transport.broadcastHeaders.calledOnce).to.be.true;
							expect(__private.checkExists).to.have.been.calledWith(dummyBlock);
							done();
						}
					);
				});
			});

			describe('when saveBlock = false', async () => {
				it('should call private functions with correct parameters', done => {
					broadcast = true;
					saveBlock = false;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(modules.transport.broadcastHeaders.calledOnce).to.be.true;
							expect(__private.checkExists).to.not.called;
							done();
						}
					);
				});
			});
		});

		describe('when broadcast = false', async () => {
			describe('when saveBlock = true', async () => {
				it('should call private functions with correct parameters', done => {
					broadcast = false;
					saveBlock = true;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(modules.transport.broadcastHeaders.calledOnce).to.be.false;
							expect(__private.checkExists).to.have.been.calledWith(dummyBlock);
							done();
						}
					);
				});
			});

			describe('when saveBlock = false', async () => {
				it('should call private functions with correct parameters', done => {
					broadcast = false;
					saveBlock = false;
					blocksVerifyModule.processBlock(
						dummyBlock,
						broadcast,
						saveBlock,
						err => {
							expect(err).to.be.null;
							expect(modules.transport.broadcastHeaders.calledOnce).to.be.false;
							expect(__private.checkExists).to.not.called;
							done();
						}
					);
				});
			});

			describe('when broadcast = true and saveBlock = true', async () => {
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
								components.system.update,
								modules.transport.broadcastHeaders
							);

							done();
						}
					);
				});
			});
		});
	});

	describe('onBind', async () => {
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
			expect(components.system).to.equal(bindingsStub.components.system);
			expect(modules.transport).to.equal(bindingsStub.modules.transport);
			done();
		});

		it('should set __private.loaded to true', async () =>
			expect(__private.loaded).to.be.true);
	});
});
