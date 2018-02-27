/* eslint-disable mocha/no-pending-tests */
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

var rewire = require('rewire');

var BlocksVerify = rewire('../../../../modules/blocks/verify.js');

describe('blocks/verify', () => {
	let library;
	let __private;
	let loggerStub;
	let dbStub;
	let logicBlockStub;
	let logicTransactionStub;
	let blocksVerifyModule;
	let modulesStub;
	let modules;

	beforeEach(done => {
		// Logic
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};
		dbStub = sinonSandbox.stub();
		logicBlockStub = {
			verifySignature: sinonSandbox.stub(),
			getId: sinonSandbox.stub(),
		};
		logicTransactionStub = {
			getId: sinonSandbox.stub(),
			checkConfirmed: sinonSandbox.stub(),
			verify: sinonSandbox.stub(),
			getBytes: sinonSandbox.stub(),
		};

		blocksVerifyModule = new BlocksVerify(
			loggerStub,
			logicBlockStub,
			logicTransactionStub,
			dbStub
		);

		library = BlocksVerify.__get__('library');
		__private = BlocksVerify.__get__('__private');

		// Modules
		const modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
		};
		const modulesDelegatesStub = {
			fork: sinonSandbox.stub(),
		};
		const modulesTransactionsStub = {
			undoUnconfirmed: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
		};
		modulesStub = {
			accounts: modulesAccountsStub,
			delegates: modulesDelegatesStub,
			transactions: modulesTransactionsStub,
		};

		blocksVerifyModule.onBind(modulesStub);
		modules = BlocksVerify.__get__('modules');
		done();
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			expect(library.logic.block).to.eql(logicBlockStub);
			return expect(library.logic.transaction).to.eql(logicTransactionStub);
		});

		it('should initialize __private.blockReward', () => {
			expect(__private.blockReward).to.be.an('object');
			return expect(__private.blockReward.calcReward).to.be.a('function');
		});

		it('should call library.logger.trace with "Blocks->Verify: Submodule initialized."', () => {
			return expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Verify: Submodule initialized.'
			);
		});

		it('should return self', () => {
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

	describe('__private.checkTransaction', () => {
		const dummyBlock = { id: '5', height: 5 };
		const dummyTransaction = { id: '5', type: 0 };
		describe('library.logic.transaction.getId', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return library.logic.transaction.getId.throws('getId-ERR');
				});
				it('should call a callback with error', done => {
					__private.checkTransaction(dummyBlock, dummyTransaction, err => {
						expect(err).to.equal('getId-ERR');
						done();
					});
				});
			});
			describe('when succeeds', () => {
				beforeEach(() => {
					return library.logic.transaction.getId.returns('4');
				});
				describe('library.logic.transaction.checkConfirmed', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return library.logic.transaction.checkConfirmed.callsArgWith(
								1,
								'checkConfirmed-ERR',
								null
							);
						});
						afterEach(() => {
							expect(modules.delegates.fork.calledOnce).to.be.true;
							expect(modules.delegates.fork.args[0][0]).to.deep.equal(
								dummyBlock
							);
							return expect(modules.delegates.fork.args[0][1]).to.equal(2);
						});
						describe('modules.transactions.undoUnconfirmed', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return modules.transactions.undoUnconfirmed.callsArgWith(
										1,
										'undoUnconfirmed-ERR',
										null
									);
								});
								afterEach(() => {
									expect(
										modules.transactions.removeUnconfirmedTransaction.calledOnce
									).to.be.true;
									return expect(
										modules.transactions.removeUnconfirmedTransaction.args[0][0]
									).to.equal('4');
								});
								it('should call a callback with error', done => {
									__private.checkTransaction(
										dummyBlock,
										dummyTransaction,
										err => {
											expect(err).to.equal('undoUnconfirmed-ERR');
											done();
										}
									);
								});
							});
							describe('when succeeds', () => {
								beforeEach(() => {
									return modules.transactions.undoUnconfirmed.callsArgWith(
										1,
										null,
										true
									);
								});
								afterEach(() => {
									expect(
										modules.transactions.removeUnconfirmedTransaction.calledOnce
									).to.be.true;
									return expect(
										modules.transactions.removeUnconfirmedTransaction.args[0][0]
									).to.equal('4');
								});
								it('should call a callback with error', done => {
									__private.checkTransaction(
										dummyBlock,
										dummyTransaction,
										err => {
											expect(err).to.equal('checkConfirmed-ERR');
											done();
										}
									);
								});
							});
						});
					});
					describe('when succeeds', () => {
						beforeEach(() => {
							return library.logic.transaction.checkConfirmed.callsArgWith(
								1,
								null,
								true
							);
						});
						describe('modules.accounts.getAccount', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return modules.accounts.getAccount.callsArgWith(
										1,
										'getAccount-ERR',
										null
									);
								});
								it('should call a callback with error', done => {
									__private.checkTransaction(
										dummyBlock,
										dummyTransaction,
										err => {
											expect(err).to.equal('getAccount-ERR');
											done();
										}
									);
								});
							});
							describe('when succeeds', () => {
								beforeEach(() => {
									return modules.accounts.getAccount.callsArgWith(
										1,
										null,
										true
									);
								});
								describe('library.logic.transaction.verify', () => {
									describe('when fails', () => {
										beforeEach(() => {
											return library.logic.transaction.verify.callsArgWith(
												2,
												'verify-ERR',
												null
											);
										});
										it('should call a callback with error', done => {
											__private.checkTransaction(
												dummyBlock,
												dummyTransaction,
												err => {
													expect(err).to.equal('verify-ERR');
													done();
												}
											);
										});
									});
									describe('when succeeds', () => {
										beforeEach(() => {
											return library.logic.transaction.verify.callsArgWith(
												2,
												null,
												true
											);
										});
										it('should call a callback with no error', done => {
											__private.checkTransaction(
												dummyBlock,
												dummyTransaction,
												err => {
													expect(err).to.be.null;
													done();
												}
											);
										});
									});
								});
							});
						});
					});
				});
			});
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
		describe('when fails', () => {
			describe('when block is undefined', () => {
				it('should return error', () => {
					const blockError = __private.setHeight(undefined, dummyLastBlock);
					return expect(blockError.message).to.equal(
						"Cannot set property 'height' of undefined"
					);
				});
			});
			describe('when lastBlock is undefined', () => {
				it('should return error', () => {
					const blockError = __private.setHeight(dummyBlock, undefined);
					return expect(blockError.message).to.equal(
						"Cannot read property 'height' of undefined"
					);
				});
			});
		});
		describe('when succeeds', () => {
			it('should return block with increased height based on last block', () => {
				return expect(
					__private.setHeight(dummyBlock, dummyLastBlock)
				).to.deep.equal({
					id: '6',
					height: 6,
				});
			});
		});
	});

	describe('__private.verifySignature', () => {
		describe('library.logic.block.verifySignature', () => {
			describe('when fails', () => {
				describe('if throws error', () => {
					beforeEach(() => {
						return library.logic.block.verifySignature.throws(
							'verifySignature-ERR'
						);
					});
					it('should return error', () => {
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
					beforeEach(() => {
						return library.logic.block.verifySignature.returns(false);
					});
					it('should return error', () => {
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
			describe('when succeeds', () => {
				beforeEach(() => {
					return library.logic.block.verifySignature.returns(true);
				});
				it('should return no error', () => {
					const verifySignature = __private.verifySignature(
						{ id: 6 },
						{ errors: [] }
					);
					return expect(verifySignature.errors.length).to.equal(0);
				});
			});
		});
	});

	describe('__private.verifyPreviousBlock', () => {
		describe('when fails', () => {
			describe('if block is undefined', () => {
				it('should return error', () => {
					const verifyPreviousBlock = __private.verifyPreviousBlock(undefined, {
						errors: [],
					});
					return expect(verifyPreviousBlock.errors[0]).to.equal(
						"TypeError: Cannot read property 'previousBlock' of undefined"
					);
				});
			});
			describe('if block.previousBlock is not defined and height !== 1', () => {
				it('should return error', () => {
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
		describe('when succeeds', () => {
			describe('if block.previousBlock is not defined and height === 1', () => {
				it('should return no error', () => {
					const verifyPreviousBlock = __private.verifyPreviousBlock(
						{ id: 6, height: 1 },
						{ errors: [] }
					);
					return expect(verifyPreviousBlock.errors.length).to.equal(0);
				});
			});
			describe('if block.previousBlock is defined and block.height !== 1', () => {
				it('should return no error', () => {
					const verifyPreviousBlock = __private.verifyPreviousBlock(
						{ id: 6, previousBlock: 5, height: 3 },
						{ errors: [] }
					);
					return expect(verifyPreviousBlock.errors.length).to.equal(0);
				});
			});
			describe('if block.previousBlock is defined and block.height === 1', () => {
				it('should return no error', () => {
					const verifyPreviousBlock = __private.verifyPreviousBlock(
						{ id: 6, previousBlock: 5, height: 1 },
						{ errors: [] }
					);
					return expect(verifyPreviousBlock.errors.length).to.equal(0);
				});
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
		describe('fails', () => {
			describe('when block is undefined', () => {
				it('should return error', () => {
					const verifyAgainstLastNBlockIds = __private.verifyAgainstLastNBlockIds(
						undefined,
						{ errors: [] }
					);
					return expect(verifyAgainstLastNBlockIds.errors[0]).to.equal(
						"TypeError: Cannot read property 'id' of undefined"
					);
				});
			});
			describe('when block is in list', () => {
				it('should return error', () => {
					const verifyAgainstLastNBlockIds = __private.verifyAgainstLastNBlockIds(
						{ id: 3 },
						{ errors: [] }
					);
					return expect(verifyAgainstLastNBlockIds.errors[0]).to.equal(
						'Block already exists in chain'
					);
				});
			});
		});
		describe('when succeeds', () => {
			it('should return no error', () => {
				const verifyAgainstLastNBlockIds = __private.verifyAgainstLastNBlockIds(
					{ id: 5 },
					{ errors: [] }
				);
				return expect(verifyAgainstLastNBlockIds.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyVersion', () => {
		let verifyVersion;
		describe('fails', () => {
			describe('when block is undefined', () => {
				it('should return error', () => {
					verifyVersion = __private.verifyVersion(undefined, { errors: [] });
					return expect(verifyVersion.errors[0]).to.equal(
						"TypeError: Cannot read property 'version' of undefined"
					);
				});
			});
			describe('when block version > 0', () => {
				it('should return error', () => {
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
		describe('when succeeds', () => {
			it('should return no error', () => {
				verifyVersion = __private.verifyVersion({ version: 0 }, { errors: [] });
				return expect(verifyVersion.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyReward', () => {
		let verifyReward;
		let blockRewardTemp;
		let exceptions;
		let exceptionsTemp;
		beforeEach(done => {
			blockRewardTemp = __private.blockReward;
			__private.blockReward = {
				calcReward: sinonSandbox.stub(),
			};
			exceptions = BlocksVerify.__get__('exceptions');
			exceptionsTemp = exceptions;
			exceptions.blockRewards = [1, 2, 3, 4];
			done();
		});
		afterEach(done => {
			__private.blockReward = blockRewardTemp;
			exceptions = exceptionsTemp;
			done();
		});
		describe('when block is undefined', () => {
			it('should return error', () => {
				verifyReward = __private.verifyReward(undefined, { errors: [] });
				return expect(verifyReward.errors[0]).to.equal(
					"TypeError: Cannot read property 'height' of undefined"
				);
			});
		});
		describe('__private.blockReward.calcReward', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return __private.blockReward.calcReward.throws('calcReward-ERR');
				});
				it('should return error', () => {
					verifyReward = __private.verifyReward(
						{ height: 'ERR' },
						{ errors: [] }
					);
					return expect(verifyReward.errors[0]).to.equal('calcReward-ERR');
				});
			});
			describe('when succeeds', () => {
				beforeEach(() => {
					return __private.blockReward.calcReward.returns(5);
				});
				describe('if block.height !== 1 && expectedReward !== block.reward && exceptions.blockRewards.indexOf(block.id) === -1', () => {
					it('should return error', () => {
						verifyReward = __private.verifyReward(
							{ height: 5, reward: 1, id: 5 },
							{ errors: [] }
						);
						return expect(verifyReward.errors[0]).to.equal(
							'Invalid block reward: 1 expected: 5'
						);
					});
				});
				describe('if block.height !== 1 && expectedReward !== block.reward && exceptions.blockRewards.indexOf(block.id) !== -1', () => {
					it('should return no error', () => {
						verifyReward = __private.verifyReward(
							{ height: 5, reward: 1, id: 3 },
							{ errors: [] }
						);
						return expect(verifyReward.errors.length).to.equal(0);
					});
				});
				describe('if block.height !== 1 && expectedReward === block.reward && exceptions.blockRewards.indexOf(block.id) === -1', () => {
					it('should return no error', () => {
						verifyReward = __private.verifyReward(
							{ height: 5, reward: 5, id: 3 },
							{ errors: [] }
						);
						return expect(verifyReward.errors.length).to.equal(0);
					});
				});
				describe('if block.height !== 1 && expectedReward === block.reward && exceptions.blockRewards.indexOf(block.id) !== -1', () => {
					it('should return no error', () => {
						verifyReward = __private.verifyReward(
							{ height: 5, reward: 5, id: 5 },
							{ errors: [] }
						);
						return expect(verifyReward.errors.length).to.equal(0);
					});
				});
				describe('if block.height === 1 && expectedReward !== block.reward && exceptions.blockRewards.indexOf(block.id) === -1', () => {
					it('should return no error', () => {
						verifyReward = __private.verifyReward(
							{ height: 1, reward: 1, id: 5 },
							{ errors: [] }
						);
						return expect(verifyReward.errors.length).to.equal(0);
					});
				});
				describe('if block.height === 1 && expectedReward !== block.reward && exceptions.blockRewards.indexOf(block.id) !== -1', () => {
					it('should return no error', () => {
						verifyReward = __private.verifyReward(
							{ height: 1, reward: 1, id: 3 },
							{ errors: [] }
						);
						return expect(verifyReward.errors.length).to.equal(0);
					});
				});
				describe('if block.height === 1 && expectedReward === block.reward && exceptions.blockRewards.indexOf(block.id) === -1', () => {
					it('should return no error', () => {
						verifyReward = __private.verifyReward(
							{ height: 1, reward: 5, id: 5 },
							{ errors: [] }
						);
						return expect(verifyReward.errors.length).to.equal(0);
					});
				});
				describe('if block.height === 1 && expectedReward === block.reward && exceptions.blockRewards.indexOf(block.id) !== -1', () => {
					it('should return no error', () => {
						verifyReward = __private.verifyReward(
							{ height: 1, reward: 5, id: 3 },
							{ errors: [] }
						);
						return expect(verifyReward.errors.length).to.equal(0);
					});
				});
			});
		});
	});

	describe('__private.verifyId', () => {
		let verifyId;
		describe('when block is undefined', () => {
			it('should return error', () => {
				verifyId = __private.verifyId(undefined, { errors: [] });
				return expect(verifyId.errors[0]).to.equal(
					"TypeError: Cannot set property 'id' of undefined"
				);
			});
		});
		describe('library.logic.block.getId', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return library.logic.block.getId.throws('getId-ERR');
				});
				it('should return error', () => {
					verifyId = __private.verifyId({ id: 5 }, { errors: [] });
					return expect(verifyId.errors[0]).to.equal('getId-ERR');
				});
			});
			describe('when succeeds', () => {
				beforeEach(() => {
					return library.logic.block.getId.returns(5);
				});
				it('should return no error', () => {
					verifyId = __private.verifyId({ id: 5 }, { errors: [] });
					return expect(verifyId.errors.length).to.equal(0);
				});
			});
		});
	});

	describe('__private.verifyPayload', () => {
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
		describe('fails', () => {
			afterEach(() => {
				return expect(verifyPayload.errors)
					.to.be.an('array')
					.with.lengthOf(1);
			});
			describe('when block is undefined', () => {
				it('should return error', () => {
					verifyPayload = __private.verifyPayload(undefined, { errors: [] });
					return expect(verifyPayload.errors[0]).to.equal(
						"TypeError: Cannot read property 'payloadLength' of undefined"
					);
				});
			});
			describe('when payload lenght is too long', () => {
				it('should return error', () => {
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
				it('should return error', () => {
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
				it('should return error', () => {
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
			describe('library.logic.transaction.getBytes fails', () => {
				describe('when throws error', () => {
					beforeEach(() => {
						return library.logic.transaction.getBytes
							.onCall(0)
							.throws('getBytes-ERR')
							.onCall(1)
							.returns(0);
					});
					it('should return error', () => {
						verifyPayload = __private.verifyPayload(dummyBlock, { errors: [] });
						return expect(verifyPayload.errors[0]).to.equal('getBytes-ERR');
					});
				});
				describe('when returns invalid bytes', () => {
					beforeEach(() => {
						return library.logic.transaction.getBytes.returns('abc');
					});
					it('should return error', () => {
						verifyPayload = __private.verifyPayload(dummyBlock, { errors: [] });
						return expect(verifyPayload.errors[0]).to.equal(
							'Invalid payload hash'
						);
					});
				});
			});
			describe('when encountered duplicate transaction', () => {
				it('should return error', () => {
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
			describe('when payload hash is invalid', () => {
				it('should return error', () => {
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
				it('should return error', () => {
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
				it('should return error', () => {
					const dummyBlockERR = _.cloneDeep(dummyBlock);
					dummyBlockERR.totalFee = 1;
					verifyPayload = __private.verifyPayload(dummyBlockERR, {
						errors: [],
					});
					return expect(verifyPayload.errors[0]).to.equal('Invalid total fee');
				});
			});
		});
		describe('when succeeds', () => {
			it('should return no error', () => {
				verifyPayload = __private.verifyPayload(dummyBlock, { errors: [] });
				return expect(verifyPayload.errors.length).to.equal(0);
			});
		});
	});

	describe('__private.verifyForkOne', () => {
		let verifyForkOne;
		let block;
		let lastBlock;
		describe('fails', () => {
			describe('when block is undefined', () => {
				it('should return error', () => {
					block = undefined;
					lastBlock = { id: 5 };
					verifyForkOne = __private.verifyForkOne(block, lastBlock, {
						errors: [],
					});
					return expect(verifyForkOne.errors[0]).to.equal(
						"TypeError: Cannot read property 'previousBlock' of undefined"
					);
				});
			});
			describe('when lastBlock is undefined', () => {
				it('should return error', () => {
					block = { previousBlock: 6 };
					lastBlock = undefined;
					verifyForkOne = __private.verifyForkOne(block, lastBlock, {
						errors: [],
					});
					return expect(verifyForkOne.errors[0]).to.equal(
						"TypeError: Cannot read property 'id' of undefined"
					);
				});
			});
			describe('when block.previousBlock && block.previousBlock !== lastBlock.id', () => {
				afterEach(() => {
					expect(modules.delegates.fork.calledOnce).to.be.true;
					expect(modules.delegates.fork.args[0][0]).to.deep.equal(block);
					return expect(modules.delegates.fork.args[0][1]).to.equal(1);
				});
				it('should return error', () => {
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
		describe('succeeds', () => {
			describe('when block.previousBlock is undefined', () => {
				afterEach(() => {
					return expect(modules.delegates.fork.calledOnce).to.be.false;
				});
				it('should return no error', () => {
					block = { id: 6 };
					lastBlock = { id: 5 };
					verifyForkOne = __private.verifyForkOne(block, lastBlock, {
						errors: [],
					});
					return expect(verifyForkOne.errors.length).to.equal(0);
				});
			});
			describe('when block.previousBlock === lastBlock.id', () => {
				afterEach(() => {
					return expect(modules.delegates.fork.calledOnce).to.be.false;
				});
				it('should return no error', () => {
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
});
