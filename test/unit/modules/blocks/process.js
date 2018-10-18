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
var Promise = require('bluebird');
var Bignum = require('../../../../helpers/bignum.js');

var BlocksProcess = rewire('../../../../modules/blocks/process.js');

describe('blocks/process', () => {
	var __private;
	var library;
	var modules;
	var blocksProcessModule;
	var dbStub;
	var loggerStub;
	var dummyBlock;
	var dummyCommonBlock;
	var blockStub;
	var transactionStub;
	var peersStub;
	var schemaStub;
	var sequenceStub;
	var genesisBlockStub;
	var modulesStub;
	var definitions;

	beforeEach(done => {
		// Logic
		dbStub = {
			blocks: {
				getCommonBlock: sinonSandbox.stub(),
				loadBlocksOffset: sinonSandbox.stub(),
			},
		};

		blockStub = {
			objectNormalize: sinonSandbox.stub(),
			create: input => {
				return input;
			},
		};

		var peerStub = {
			rpc: {
				blocksCommon: sinonSandbox.stub(),
				blocks: sinonSandbox.stub(),
			},
			applyHeaders: sinonSandbox.stub(),
			string: 'ip:wsPort',
		};

		genesisBlockStub = {
			block: {
				id: '6524861224470851795',
				height: 1,
				previousBlock: null,
			},
		};

		dummyCommonBlock = { id: '3', previousBlock: '2', height: '3' };

		peerStub.rpc.blocksCommon
			.withArgs(sinonSandbox.match({ ids: 'ERR' }))
			.callsArgWith(1, 'rpc.blocksCommon-ERR', null)
			.withArgs(sinonSandbox.match({ ids: 'rpc.blocksCommon-Empty' }))
			.callsArgWith(1, null, { common: undefined })
			.withArgs(sinonSandbox.match({ ids: 'rpc.blocksCommon-Genesis' }))
			.callsArgWith(1, null, { common: genesisBlockStub.block })
			.withArgs(sinonSandbox.match({ ids: 'OK' }))
			.callsArgWith(1, null, {
				common: dummyCommonBlock,
			});

		peerStub.rpc.blocks
			.withArgs(sinonSandbox.match({ lastBlockId: 'ERR', peer: 'me' }))
			.callsArgWith(1, 'rpc.blocks-ERR', null)
			.withArgs(sinonSandbox.match({ lastBlockId: 'cb-ERR', peer: 'me' }))
			.callsArgWith(1, null, { error: 'rpc.blocks-cb-ERR' })
			.withArgs(sinonSandbox.match({ lastBlockId: 'empty', peer: 'me' }))
			.callsArgWith(1, null, {
				blocks: [],
			})
			.withArgs(sinonSandbox.match({ lastBlockId: '3', peer: 'me' }))
			.callsArgWith(1, null, {
				blocks: [dummyCommonBlock],
			});

		peersStub = {
			create: () => {
				return peerStub;
			},
			me: () => {
				return 'me';
			},
			applyHeaders: peerStub.applyHeaders,
			ban: sinonSandbox.stub(),
			unban: sinonSandbox.stub(),
		};

		transactionStub = {
			ready: sinonSandbox.stub(),
			verify: sinonSandbox.stub(),
		};

		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		schemaStub = {
			validate: sinonSandbox.stub(),
		};

		sequenceStub = {
			add: sinonSandbox.stub(),
		};

		blocksProcessModule = new BlocksProcess(
			loggerStub,
			blockStub,
			peersStub,
			transactionStub,
			schemaStub,
			dbStub,
			sequenceStub,
			genesisBlockStub
		);

		library = BlocksProcess.__get__('library');
		__private = BlocksProcess.__get__('__private');

		// Modules
		dummyBlock = {
			id: '4',
			height: 4,
			timestamp: 41287231,
			reward: new Bignum(100),
		};

		var modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
		};

		var modulesBlocksStub = {
			lastReceipt: {
				update: sinonSandbox.stub(),
			},
			verify: {
				processBlock: sinonSandbox.stub(),
				verifyReceipt: sinonSandbox.stub(),
				verifyBlock: sinonSandbox.stub(),
			},
			chain: {
				deleteLastBlock: sinonSandbox.stub(),
				recoverChain: sinonSandbox.stub(),
				applyBlock: sinonSandbox.stub(),
				applyGenesisBlock: sinonSandbox.stub(),
			},
			utils: {
				getIdSequence: sinonSandbox.stub(),
				readDbRows: sinonSandbox.stub(),
			},
			isCleaning: {
				get: sinonSandbox.stub(),
			},
			lastBlock: {
				get: sinonSandbox.stub().returns({
					id: '2',
					height: 2,
				}),
			},
		};

		var modulesDelegatesStub = {
			fork: sinonSandbox.stub(),
			validateBlockSlotAgainstPreviousRound: sinonSandbox.stub(),
			validateBlockSlot: sinonSandbox.stub(),
		};

		var modulesLoaderStub = {
			syncing: sinonSandbox.stub(),
		};

		var modulesRoundsStub = {
			ticking: sinonSandbox.stub(),
		};

		var modulesTransactionsStub = {
			getUnconfirmedTransactionList: sinonSandbox.stub(),
		};

		var modulesTransportStub = {
			poorConsensus: sinonSandbox.stub(),
		};

		var modulesPeersStub = {
			remove: sinonSandbox.spy(),
		};

		var swaggerDefinitionsStub = sinonSandbox.stub();

		modulesStub = {
			accounts: modulesAccountsStub,
			blocks: modulesBlocksStub,
			delegates: modulesDelegatesStub,
			loader: modulesLoaderStub,
			peers: modulesPeersStub,
			rounds: modulesRoundsStub,
			transactions: modulesTransactionsStub,
			transport: modulesTransportStub,
			swagger: {
				definitions: swaggerDefinitionsStub,
			},
		};

		blocksProcessModule.onBind(modulesStub);
		modules = BlocksProcess.__get__('modules');
		definitions = BlocksProcess.__get__('definitions');
		done();
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.schema).to.eql(schemaStub);
			expect(library.db).to.eql(dbStub);
			expect(library.sequence).to.eql(sequenceStub);
			expect(library.genesisBlock).to.eql(genesisBlockStub);
			expect(library.logic.block).to.eql(blockStub);
			expect(library.logic.peers).to.eql(peersStub);
			return expect(library.logic.transaction).to.eql(transactionStub);
		});

		it('should call library.logger.trace with "Blocks->Process: Submodule initialized."', () => {
			return expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Process: Submodule initialized.'
			);
		});

		it('should return self', () => {
			expect(blocksProcessModule).to.be.an('object');
			expect(blocksProcessModule.getCommonBlock).to.be.a('function');
			expect(blocksProcessModule.loadBlocksOffset).to.be.a('function');
			expect(blocksProcessModule.loadBlocksFromPeer).to.be.a('function');
			expect(blocksProcessModule.generateBlock).to.be.a('function');
			expect(blocksProcessModule.onReceiveBlock).to.be.a('function');
			return expect(blocksProcessModule.onBind).to.be.a('function');
		});
	});

	describe('__private.receiveBlock', () => {
		beforeEach(() => {
			return modules.blocks.verify.processBlock.callsArgWith(3, null, true);
		});

		it('should update lastReceipt and call processBlock', done => {
			__private.receiveBlock(dummyBlock, err => {
				expect(err).to.be.null;
				expect(loggerStub.info.args[0]).to.contains(
					'Received new block id: 4 height: 4 round: 1 slot: 4128723 reward: 100'
				);
				expect(modules.blocks.lastReceipt.update.calledOnce).to.be.true;
				expect(modules.blocks.verify.processBlock.calledOnce).to.be.true;
				expect(modules.blocks.verify.processBlock.args[0][0]).to.deep.equal(
					dummyBlock
				);
				expect(modules.blocks.verify.processBlock.args[0][1]).to.be.true;
				expect(modules.blocks.verify.processBlock.args[0][2]).to.be.true;
				done();
			});
		});
	});

	describe('__private.receiveForkOne', () => {
		var tempValidateBlockSlot;
		before(done => {
			tempValidateBlockSlot = __private.validateBlockSlot;
			done();
		});

		after(done => {
			__private.validateBlockSlot = tempValidateBlockSlot;
			done();
		});

		describe('last block stands', () => {
			afterEach(() => {
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				).to.be.true;
				return expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
			});

			it('should return when block.timestamp > lastBlock.timestamp', done => {
				const block = { timestamp: 2 };
				const lastBlock = { timestamp: 1 };
				__private.receiveForkOne(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should return when timestamps are equal and block.id > lastBlock.id', done => {
				const block = { timestamp: 1, id: 2 };
				const lastBlock = { timestamp: 1, id: 1 };
				__private.receiveForkOne(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});

		describe('last block and parent loses', () => {
			beforeEach(done => {
				__private.validateBlockSlot = sinonSandbox.stub();
				done();
			});

			afterEach(() => {
				return expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				).to.be.true;
			});

			describe('library.logic.block.objectNormalize', () => {
				describe('when fails', () => {
					beforeEach(() => {
						return library.logic.block.objectNormalize.throws(
							'objectNormalize-ERR'
						);
					});

					it('should call a callback with error', done => {
						const block = { timestamp: 1, id: 2 };
						const lastBlock = { timestamp: 2, id: 1 };
						__private.receiveForkOne(block, lastBlock, err => {
							expect(err.name).to.equal('objectNormalize-ERR');
							expect(loggerStub.error.args[0][0]).to.equal(
								'Fork recovery failed'
							);
							expect(loggerStub.error.args[0][1].name).to.equal(
								'objectNormalize-ERR'
							);
							done();
						});
					});
				});

				describe('when succeeds', () => {
					describe('__private.validateBlockSlot', () => {
						describe('when fails', () => {
							beforeEach(() => {
								library.logic.block.objectNormalize.returns({
									timestamp: 1,
									id: 2,
								});
								return __private.validateBlockSlot.callsArgWith(
									2,
									'validateBlockSlot-ERR',
									null
								);
							});

							it('should call a callback with error', done => {
								const block = { timestamp: 1, id: 2 };
								const lastBlock = { timestamp: 2, id: 1 };
								__private.receiveForkOne(block, lastBlock, err => {
									expect(err).to.equal('validateBlockSlot-ERR');
									expect(loggerStub.error.args[0][0]).to.equal(
										'Fork recovery failed'
									);
									expect(loggerStub.error.args[0][1]).to.equal(
										'validateBlockSlot-ERR'
									);
									done();
								});
							});
						});

						describe('when succeeds', () => {
							describe('modules.blocks.verify.verifyReceipt', () => {
								describe('when fails', () => {
									beforeEach(() => {
										library.logic.block.objectNormalize.returns({
											timestamp: 1,
											id: 2,
										});
										__private.validateBlockSlot.callsArgWith(2, null, true);
										return modules.blocks.verify.verifyReceipt.returns({
											verified: false,
											errors: ['verifyReceipt-ERR', 'ERR2'],
										});
									});

									it('should call a callback with error', done => {
										const block = { timestamp: 10, id: 2 };
										const lastBlock = { timestamp: 20, id: 1 };
										__private.receiveForkOne(block, lastBlock, err => {
											expect(err).to.equal('verifyReceipt-ERR');
											expect(loggerStub.error.args[0][0]).to.equal(
												'Block 2 verification failed'
											);
											expect(loggerStub.error.args[0][1]).to.equal(
												'verifyReceipt-ERR, ERR2'
											);
											expect(loggerStub.error.args[1][0]).to.equal(
												'Fork recovery failed'
											);
											expect(loggerStub.error.args[1][1]).to.equal(
												'verifyReceipt-ERR'
											);
											done();
										});
									});
								});

								describe('when succeeds', () => {
									describe('modules.blocks.chain.deleteLastBlock (first call)', () => {
										afterEach(() => {
											return expect(loggerStub.info.args[0][0]).to.equal(
												'Last block and parent loses due to fork 1'
											);
										});
										describe('when fails', () => {
											beforeEach(() => {
												library.logic.block.objectNormalize.returns({
													timestamp: 1,
													id: 2,
												});
												__private.validateBlockSlot.callsArgWith(2, null, true);
												modules.blocks.verify.verifyReceipt.returns({
													verified: true,
												});
												return modules.blocks.chain.deleteLastBlock
													.onCall(0)
													.callsArgWith(0, 'deleteLastBlock-ERR-call-1', null)
													.onCall(1)
													.callsArgWith(0, 'deleteLastBlock-ERR-call-2', null);
											});

											it('should call a callback with error', done => {
												const block = { timestamp: 10, id: 2 };
												const lastBlock = { timestamp: 20, id: 1 };
												__private.receiveForkOne(block, lastBlock, err => {
													expect(err).to.equal('deleteLastBlock-ERR-call-1');
													expect(loggerStub.error.args[0][0]).to.equal(
														'Fork recovery failed'
													);
													expect(loggerStub.error.args[0][1]).to.equal(
														'deleteLastBlock-ERR-call-1'
													);
													done();
												});
											});
										});

										describe('when succeeds', () => {
											describe('modules.blocks.chain.deleteLastBlock (second call)', () => {
												describe('when fails', () => {
													beforeEach(() => {
														library.logic.block.objectNormalize.returns({
															timestamp: 1,
															id: 2,
														});
														__private.validateBlockSlot.callsArgWith(
															2,
															null,
															true
														);
														modules.blocks.verify.verifyReceipt.returns({
															verified: true,
														});
														return modules.blocks.chain.deleteLastBlock
															.onCall(0)
															.callsArgWith(0, null, 'delete block 1 ok')
															.onCall(1)
															.callsArgWith(
																0,
																'deleteLastBlock-ERR-call-2',
																null
															);
													});

													it('should call a callback with error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkOne(block, lastBlock, err => {
															expect(err).to.equal(
																'deleteLastBlock-ERR-call-2'
															);
															expect(loggerStub.error.args[0][0]).to.equal(
																'Fork recovery failed'
															);
															expect(loggerStub.error.args[0][1]).to.equal(
																'deleteLastBlock-ERR-call-2'
															);
															done();
														});
													});
												});

												describe('when succeeds', () => {
													beforeEach(() => {
														library.logic.block.objectNormalize.returns({
															timestamp: 1,
															id: 2,
														});
														__private.validateBlockSlot.callsArgWith(
															2,
															null,
															true
														);
														modules.blocks.verify.verifyReceipt.returns({
															verified: true,
														});
														return modules.blocks.chain.deleteLastBlock
															.onCall(0)
															.callsArgWith(0, null, 'delete block 1 ok')
															.onCall(1)
															.callsArgWith(0, null, 'delete block 2 ok');
													});

													it('should return no error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkOne(block, lastBlock, err => {
															expect(err).to.be.null;
															done();
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
				});
			});
		});
	});

	describe('__private.receiveForkFive', () => {
		var tempValidateBlockSlot;
		before(done => {
			tempValidateBlockSlot = __private.validateBlockSlot;
			done();
		});

		after(done => {
			__private.validateBlockSlot = tempValidateBlockSlot;
			done();
		});

		describe('delegate forging on multiple nodes', () => {
			it('should log warning when generatorPublicKey is the same for block and lastBlock', done => {
				__private.receiveForkFive(
					{ timestamp: 1, id: 2, generatorPublicKey: '1a' },
					{ timestamp: 1, id: 1, generatorPublicKey: '1a' },
					err => {
						expect(err).to.be.undefined;
						expect(loggerStub.warn.args[0][0]).to.equal(
							'Delegate forging on multiple nodes'
						);
						expect(loggerStub.warn.args[0][1]).to.equal('1a');
						done();
					}
				);
			});

			it('should not log warning when generatorPublicKey is different for block and lastBlock', done => {
				__private.receiveForkFive(
					{ timestamp: 1, id: 2, generatorPublicKey: '2a' },
					{ timestamp: 1, id: 1, generatorPublicKey: '1a' },
					err => {
						expect(err).to.be.undefined;
						expect(loggerStub.warn.args.length).to.equal(0);
						done();
					}
				);
			});
		});

		describe('last block stands', () => {
			afterEach(() => {
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
				return expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
			});

			it('should call a callback with no error when block.timestamp > lastBlock.timestamp', done => {
				const block = { timestamp: 2 };
				const lastBlock = { timestamp: 1 };
				__private.receiveForkFive(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should call a callback with no error when timestamps are equal and block.id > lastBlock.id', done => {
				const block = { timestamp: 1, id: 2 };
				const lastBlock = { timestamp: 1, id: 1 };
				__private.receiveForkFive(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});

		describe('last block loses', () => {
			beforeEach(done => {
				__private.validateBlockSlot = sinonSandbox.stub();
				__private.receiveBlock = sinonSandbox.stub();
				done();
			});

			afterEach(() => {
				return expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
			});

			describe('library.logic.block.objectNormalize', () => {
				describe('when fails', () => {
					beforeEach(() => {
						return library.logic.block.objectNormalize.throws(
							'objectNormalize-ERR'
						);
					});

					it('should call a callback with error', done => {
						const block = { timestamp: 1, id: 2 };
						const lastBlock = { timestamp: 2, id: 1 };
						__private.receiveForkFive(block, lastBlock, err => {
							expect(err.name).to.equal('objectNormalize-ERR');
							expect(loggerStub.error.args[0][0]).to.equal(
								'Fork recovery failed'
							);
							expect(loggerStub.error.args[0][1].name).to.equal(
								'objectNormalize-ERR'
							);
							done();
						});
					});
				});

				describe('when succeeds', () => {
					beforeEach(() => {
						return library.logic.block.objectNormalize.returns({
							timestamp: 1,
							id: 2,
						});
					});

					describe('__private.validateBlockSlot', () => {
						describe('when fails', () => {
							beforeEach(() => {
								return __private.validateBlockSlot.callsArgWith(
									2,
									'validateBlockSlot-ERR',
									null
								);
							});

							it('should call a callback with error', done => {
								const block = { timestamp: 1, id: 2 };
								const lastBlock = { timestamp: 2, id: 1 };
								__private.receiveForkFive(block, lastBlock, err => {
									expect(err).to.equal('validateBlockSlot-ERR');
									expect(loggerStub.error.args[0][0]).to.equal(
										'Fork recovery failed'
									);
									expect(loggerStub.error.args[0][1]).to.equal(
										'validateBlockSlot-ERR'
									);
									done();
								});
							});
						});

						describe('when succeeds', () => {
							beforeEach(() => {
								return __private.validateBlockSlot.callsArgWith(2, null, true);
							});

							describe('modules.blocks.verify.verifyReceipt', () => {
								describe('when fails', () => {
									beforeEach(() => {
										return modules.blocks.verify.verifyReceipt.returns({
											verified: false,
											errors: ['verifyReceipt-ERR', 'ERR2'],
										});
									});

									it('should call a callback with error', done => {
										const block = { timestamp: 10, id: 2 };
										const lastBlock = { timestamp: 20, id: 1 };
										__private.receiveForkFive(block, lastBlock, err => {
											expect(err).to.equal('verifyReceipt-ERR');
											expect(loggerStub.error.args[0][0]).to.equal(
												'Block 2 verification failed'
											);
											expect(loggerStub.error.args[0][1]).to.equal(
												'verifyReceipt-ERR, ERR2'
											);
											expect(loggerStub.error.args[1][0]).to.equal(
												'Fork recovery failed'
											);
											expect(loggerStub.error.args[1][1]).to.equal(
												'verifyReceipt-ERR'
											);
											done();
										});
									});
								});

								describe('when succeeds', () => {
									beforeEach(() => {
										return modules.blocks.verify.verifyReceipt.returns({
											verified: true,
										});
									});

									afterEach(() => {
										return expect(loggerStub.info.args[0][0]).to.equal(
											'Last block loses due to fork 5'
										);
									});

									describe('modules.blocks.chain.deleteLastBlock', () => {
										describe('when fails', () => {
											beforeEach(() => {
												return modules.blocks.chain.deleteLastBlock.callsArgWith(
													0,
													'deleteLastBlock-ERR',
													null
												);
											});

											it('should call a callback with error', done => {
												const block = { timestamp: 10, id: 2 };
												const lastBlock = { timestamp: 20, id: 1 };
												__private.receiveForkFive(block, lastBlock, err => {
													expect(err).to.equal('deleteLastBlock-ERR');
													expect(loggerStub.error.args[0][0]).to.equal(
														'Fork recovery failed'
													);
													expect(loggerStub.error.args[0][1]).to.equal(
														'deleteLastBlock-ERR'
													);
													done();
												});
											});
										});

										describe('when succeeds', () => {
											beforeEach(() => {
												return modules.blocks.chain.deleteLastBlock.callsArgWith(
													0,
													null,
													'delete block ok'
												);
											});

											describe('__private.receiveBlock', () => {
												describe('when fails', () => {
													beforeEach(() => {
														return __private.receiveBlock.callsArgWith(
															1,
															'receiveBlock-ERR',
															null
														);
													});

													it('should call a callback with error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkFive(block, lastBlock, err => {
															expect(err).to.equal('receiveBlock-ERR');
															expect(loggerStub.error.args[0][0]).to.equal(
																'Fork recovery failed'
															);
															expect(loggerStub.error.args[0][1]).to.equal(
																'receiveBlock-ERR'
															);
															done();
														});
													});
												});

												describe('when succeeds', () => {
													beforeEach(() => {
														return __private.receiveBlock.callsArgWith(
															1,
															null,
															'receiveBlock ok'
														);
													});

													it('should call a callback with no error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkFive(block, lastBlock, err => {
															expect(err).to.be.null;
															done();
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
				});
			});
		});
	});

	describe('getCommonBlock', () => {
		describe('modules.blocks.utils.getIdSequence', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return modules.blocks.utils.getIdSequence.callsArgWith(
						1,
						'getIdSequence-ERR',
						undefined
					);
				});

				it('should call a callback with error', done => {
					blocksProcessModule.getCommonBlock(
						{ ip: 1, wsPort: 2 },
						10,
						(err, block) => {
							expect(err).to.equal('getIdSequence-ERR');
							expect(block).to.be.undefined;
							done();
						}
					);
				});
			});

			describe('when succeeds', () => {
				describe('peer.rpc.blocksCommon', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'ERR',
							});
						});

						it('should call a callback with error', done => {
							blocksProcessModule.getCommonBlock(
								{ ip: 1, wsPort: 2 },
								10,
								(err, block) => {
									expect(err).to.equal('rpc.blocksCommon-ERR');
									expect(block).to.be.undefined;
									done();
								}
							);
						});

						it('should call peers.remove', done => {
							blocksProcessModule.getCommonBlock(
								{ ip: 1, wsPort: 2 },
								10,
								() => {
									expect(modules.peers.remove).to.have.been.calledOnce;
									done();
								}
							);
						});
					});

					describe('when comparison failed because of receiving genesis block', () => {
						beforeEach(() => {
							modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'rpc.blocksCommon-Genesis',
							});
							return modules.blocks.chain.recoverChain.callsArgWith(
								0,
								null,
								true
							);
						});

						describe('when consensus is low', () => {
							beforeEach(() => {
								return modules.transport.poorConsensus.returns(true);
							});

							it('should perform chain recovery', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.be.null;
										expect(block).to.be.true;
										expect(modules.blocks.chain.recoverChain.calledOnce).to.be
											.true;
										done();
									}
								);
							});
						});

						describe('when consensus is high', () => {
							beforeEach(() => {
								return modules.transport.poorConsensus.returns(false);
							});

							it('should call a callback with error ', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.equal(
											'Comparison failed - received genesis as common block'
										);
										expect(block).to.be.undefined;
										expect(modules.blocks.chain.recoverChain.calledOnce).to.be
											.false;
										done();
									}
								);
							});
						});
					});

					describe('when comparison failed', () => {
						beforeEach(() => {
							modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'rpc.blocksCommon-Empty',
							});
							return modules.blocks.chain.recoverChain.callsArgWith(
								0,
								null,
								true
							);
						});

						describe('when consensus is low', () => {
							beforeEach(() => {
								return modules.transport.poorConsensus.returns(true);
							});

							it('should perform chain recovery', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.be.null;
										expect(block).to.be.true;
										expect(modules.blocks.chain.recoverChain.calledOnce).to.be
											.true;
										done();
									}
								);
							});
						});

						describe('when consensus is high', () => {
							beforeEach(() => {
								return modules.transport.poorConsensus.returns(false);
							});

							it('should call a callback with error ', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.equal(
											'Chain comparison failed with peer: ip:wsPort using ids: rpc.blocksCommon-Empty'
										);
										expect(block).to.be.undefined;
										expect(modules.blocks.chain.recoverChain.calledOnce).to.be
											.false;
										done();
									}
								);
							});
						});
					});

					describe('when succeeds', () => {
						beforeEach(() => {
							return modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'OK',
							});
						});

						describe('library.schema.validate', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return library.schema.validate.callsArgWith(
										2,
										[{ message: 'schema.validate-ERR' }],
										undefined
									);
								});

								it('should call a callback with error', done => {
									blocksProcessModule.getCommonBlock(
										{ ip: 1, wsPort: 2 },
										10,
										(err, block) => {
											expect(err).to.equal('schema.validate-ERR');
											expect(block).to.be.undefined;
											done();
										}
									);
								});
							});

							describe('when succeeds', () => {
								beforeEach(() => {
									return library.schema.validate.callsArgWith(2, null, {
										ip: 1,
										wsPort: 2,
									});
								});

								describe('library.db.blocks.getCommonBlock', () => {
									describe('when fails', () => {
										beforeEach(() => {
											return library.db.blocks.getCommonBlock.rejects(
												new Error('blocks.getCommonBlock-REJECTS')
											);
										});

										it('should call a callback with error', done => {
											blocksProcessModule.getCommonBlock(
												{ ip: 1, wsPort: 2 },
												10,
												(err, block) => {
													expect(err).to.equal('Blocks#getCommonBlock error');
													expect(block).to.be.undefined;
													expect(loggerStub.error.args[0][0]).to.contains(
														'Error: blocks.getCommonBlock-REJECTS'
													);
													done();
												}
											);
										});
									});

									describe('when comparison failed', () => {
										beforeEach(() => {
											library.db.blocks.getCommonBlock.resolves([]);
											return modules.blocks.chain.recoverChain.callsArgWith(
												0,
												null,
												true
											);
										});

										describe('when consensus is low', () => {
											beforeEach(() => {
												return modules.transport.poorConsensus.returns(true);
											});

											it('should perform chain recovery', done => {
												blocksProcessModule.getCommonBlock(
													{ ip: 1, wsPort: 2 },
													10,
													(err, block) => {
														expect(err).to.be.null;
														expect(block).to.be.true;
														expect(modules.blocks.chain.recoverChain.calledOnce)
															.to.be.true;
														done();
													}
												);
											});
										});

										describe('when consensus is high', () => {
											beforeEach(() => {
												return modules.transport.poorConsensus.returns(false);
											});

											it('should call a callback with error ', done => {
												blocksProcessModule.getCommonBlock(
													{ ip: 1, wsPort: 2 },
													10,
													(err, block) => {
														expect(err).to.equal(
															`Chain comparison failed with peer: ip:wsPort using block: ${JSON.stringify(
																dummyCommonBlock
															)}`
														);
														expect(block).to.be.undefined;
														done();
													}
												);
											});
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											return library.db.blocks.getCommonBlock.resolves([
												{ count: 1 },
											]);
										});

										it('should return common block', done => {
											blocksProcessModule.getCommonBlock(
												{ ip: 1, wsPort: 2 },
												10,
												(err, block) => {
													expect(err).to.be.null;
													expect(block).to.deep.equal(dummyCommonBlock);
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

	describe('loadBlocksOffset', () => {
		afterEach(() => {
			return expect(loggerStub.debug.args[0][0]).to.equal(
				'Loading blocks offset'
			);
		});

		describe('library.db.blocks.loadBlocksOffset', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return library.db.blocks.loadBlocksOffset.rejects(
						'blocks.loadBlocksOffset-REJECTS'
					);
				});

				it('should call a callback with error', done => {
					blocksProcessModule.loadBlocksOffset(100, 0, (err, lastBlock) => {
						expect(err).to.equal(
							'Blocks#loadBlocksOffset error: blocks.loadBlocksOffset-REJECTS'
						);
						expect(lastBlock).to.be.undefined;
						expect(loggerStub.error.args[0][0].stack).to.contains(
							'blocks.loadBlocksOffset-REJECTS'
						);
						done();
					});
				});
			});

			describe('when succeeds', () => {
				describe('when query returns empty array', () => {
					beforeEach(() => {
						library.db.blocks.loadBlocksOffset.resolves([]);
						return modules.blocks.utils.readDbRows.returns([]);
					});

					afterEach(() => {
						expect(modules.blocks.utils.readDbRows.calledOnce).to.be.true;
						expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
						return expect(modules.blocks.isCleaning.get.calledOnce).to.be.false;
					});

					it('should return without process', done => {
						blocksProcessModule.loadBlocksOffset(100, 0, (err, lastBlock) => {
							expect(err).to.be.null;
							expect(lastBlock).to.deep.equal({
								id: '2',
								height: 2,
							});
							done();
						});
					});
				});

				describe('when query returns rows', () => {
					beforeEach(() => {
						return library.db.blocks.loadBlocksOffset.resolves([dummyBlock]);
					});

					afterEach(() => {
						return expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
					});

					describe('modules.blocks.isCleaning.get', () => {
						describe('when returns true, node shutdown is requested', () => {
							beforeEach(() => {
								return modules.blocks.isCleaning.get.returns(true);
							});
							afterEach(() => {
								return expect(loggerStub.debug.args[0][1]).to.deep.equal({
									limit: 100,
									offset: 0,
								});
							});

							it('should break processing and call a callback with no error', done => {
								blocksProcessModule.loadBlocksOffset(
									100,
									0,
									(err, lastBlock) => {
										expect(err).to.be.null;
										expect(lastBlock).to.deep.equal({
											id: '2',
											height: 2,
										});
										expect(loggerStub.debug.args.length).to.equal(1);
										done();
									}
								);
							});
						});

						describe('when returns false', () => {
							beforeEach(() => {
								return modules.blocks.isCleaning.get.returns(false);
							});

							describe('when block id is genesis block', () => {
								beforeEach(() => {
									return modules.blocks.utils.readDbRows.returns([
										{
											id: '6524861224470851795',
											height: 1,
											timestamp: 0,
											reward: 0,
										},
									]);
								});
								afterEach(() => {
									return expect(loggerStub.debug.args[0][1]).to.deep.equal({
										limit: 100,
										offset: 0,
									});
								});

								describe('modules.blocks.chain.applyGenesisBlock', () => {
									describe('when fails', () => {
										beforeEach(() => {
											return modules.blocks.chain.applyGenesisBlock.callsArgWith(
												1,
												'chain.applyGenesisBlock-ERR',
												null
											);
										});

										it('should call a callback with error', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												(err, lastBlock) => {
													expect(err).to.equal('chain.applyGenesisBlock-ERR');
													expect(lastBlock).to.deep.equal({
														id: '2',
														height: 2,
													});
													expect(modules.blocks.lastBlock.get.calledOnce).to.be
														.true;
													done();
												}
											);
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											modules.blocks.chain.applyGenesisBlock.callsArgWith(
												1,
												null,
												'chain.applyGenesisBlock-OK'
											);
											return modules.blocks.lastBlock.get.returns(dummyBlock);
										});

										it('should return lastBlock and no errors', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												(err, lastBlock) => {
													expect(err).to.be.null;
													expect(lastBlock).to.deep.equal(dummyBlock);
													done();
												}
											);
										});
									});
								});
							});

							describe('when block id is not genesis block', () => {
								beforeEach(() => {
									return modules.blocks.utils.readDbRows.returns([dummyBlock]);
								});

								afterEach(() => {
									expect(loggerStub.debug.args[1][0]).to.equal(
										'Processing block'
									);
									expect(loggerStub.debug.args[1][1]).to.equal('4');
									return expect(loggerStub.debug.args[0][1]).to.deep.equal({
										limit: 100,
										offset: 0,
									});
								});

								describe('modules.blocks.verify.processBlock', () => {
									describe('when fails', () => {
										beforeEach(() => {
											return modules.blocks.verify.processBlock.callsArgWith(
												3,
												'verify.processBlock-ERR',
												null
											);
										});

										it('should call a callback with error', done => {
											blocksProcessModule.loadBlocksOffset(100, 0, err => {
												expect(modules.blocks.verify.processBlock).to.be
													.calledOnce;
												expect(err).to.equal('verify.processBlock-ERR');
												expect(loggerStub.debug).to.be.calledWithExactly(
													'Block processing failed',
													{
														id: dummyBlock.id,
														err: 'verify.processBlock-ERR',
														module: 'blocks',
														block: dummyBlock,
													}
												);
												done();
											});
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											modules.blocks.verify.processBlock.callsArgWith(
												3,
												null,
												'verify.processBlock-OK'
											);
											return modules.blocks.lastBlock.get.returns(dummyBlock);
										});

										it('should return lastBlock and no errors', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												(err, lastBlock) => {
													expect(err).to.be.null;
													expect(lastBlock).to.deep.equal(dummyBlock);
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

	describe('loadBlocksFromPeer', () => {
		afterEach(() => {
			expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			return expect(loggerStub.info.args[0][0]).to.equal(
				'Loading blocks from: ip:wsPort'
			);
		});

		describe('getFromPeer', () => {
			describe('peer.rpc.blocks', () => {
				describe('when blocks.lastBlock.get fails', () => {
					describe('err parameter', () => {
						beforeEach(() => {
							return modules.blocks.lastBlock.get.returns({
								id: 'ERR',
								peer: 'me',
							});
						});

						it('should call a callback with error', done => {
							blocksProcessModule.loadBlocksFromPeer(
								{ id: 1, string: 'test' },
								(err, lastBlock) => {
									expect(err).to.equal('Error loading blocks: rpc.blocks-ERR');
									expect(lastBlock).to.deep.equal({ id: 'ERR', peer: 'me' });
									done();
								}
							);
						});

						it('should call modules.peers.remove', done => {
							blocksProcessModule.loadBlocksFromPeer(
								{ id: 1, string: 'test' },
								() => {
									expect(modules.peers.remove).to.have.been.calledOnce;
									done();
								}
							);
						});
					});

					describe('cb parameter', () => {
						beforeEach(() => {
							return modules.blocks.lastBlock.get.returns({
								id: 'cb-ERR',
								peer: 'me',
							});
						});

						it('should call a callback with error', done => {
							blocksProcessModule.loadBlocksFromPeer(
								{ id: 1, string: 'test' },
								(err, lastBlock) => {
									expect(err).to.equal(
										'Error loading blocks: rpc.blocks-cb-ERR'
									);
									expect(lastBlock).to.deep.equal({ id: 'cb-ERR', peer: 'me' });
									done();
								}
							);
						});
					});
				});

				describe('when succeeds', () => {
					beforeEach(() => {
						return modules.blocks.lastBlock.get.returns({
							id: '3',
							peer: 'me',
						});
					});

					describe('validateBlocks', () => {
						describe('library.schema.validate', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return library.schema.validate.returns(false);
								});

								it('should call a callback with error', done => {
									blocksProcessModule.loadBlocksFromPeer(
										{ id: 1, string: 'test' },
										(err, lastBlock) => {
											expect(err).to.equal(
												'Error loading blocks: Received invalid blocks data'
											);
											expect(lastBlock).to.deep.equal({ id: '3', peer: 'me' });
											done();
										}
									);
								});
							});

							describe('when succeeds', () => {
								beforeEach(() => {
									return library.schema.validate.returns(true);
								});

								describe('processBlocks', () => {
									describe('when receives no block', () => {
										beforeEach(() => {
											return modules.blocks.lastBlock.get.returns({
												id: 'empty',
												peer: 'me',
											});
										});

										it('should break processing and call a callback with no error', done => {
											blocksProcessModule.loadBlocksFromPeer(
												{ id: 1, string: 'test' },
												(err, lastBlock) => {
													expect(err).to.be.null;
													expect(lastBlock).to.deep.equal({
														id: 'empty',
														peer: 'me',
													});
													done();
												}
											);
										});
									});

									describe('when receives blocks', () => {
										describe('modules.blocks.utils.readDbRows', () => {
											describe('when fails', () => {
												beforeEach(() => {
													return modules.blocks.utils.readDbRows.returns(
														new Error('readDbRows err')
													);
												});

												it('should break processing and call a callback with no error', done => {
													blocksProcessModule.loadBlocksFromPeer(
														{ id: 1, string: 'test' },
														(err, lastBlock) => {
															expect(err).to.be.null;
															expect(lastBlock).to.deep.equal({
																id: '3',
																peer: 'me',
															});
															expect(modules.blocks.isCleaning.get.calledOnce)
																.to.be.false;
															done();
														}
													);
												});
											});

											describe('when succeeds', () => {
												beforeEach(() => {
													return modules.blocks.utils.readDbRows.returns([
														dummyBlock,
													]);
												});

												describe('modules.blocks.isCleaning.get', () => {
													afterEach(() => {
														return expect(
															modules.blocks.isCleaning.get.calledOnce
														).to.be.true;
													});

													describe('when returns true, node shutdown is requested', () => {
														beforeEach(() => {
															return modules.blocks.isCleaning.get.returns(
																true
															);
														});

														it('should return immediate', done => {
															blocksProcessModule.loadBlocksFromPeer(
																{ id: 1, string: 'test' },
																(err, lastBlock) => {
																	expect(err).to.be.null;
																	expect(lastBlock).to.deep.equal({
																		id: '3',
																		peer: 'me',
																	});
																	done();
																}
															);
														});
													});

													describe('when returns false', () => {
														beforeEach(() => {
															return modules.blocks.isCleaning.get.returns(
																false
															);
														});

														describe('processBlock', () => {
															describe('modules.blocks.verify.processBlock', () => {
																describe('when fails', () => {
																	beforeEach(() => {
																		return modules.blocks.verify.processBlock.callsArgWith(
																			3,
																			'verify.processBlock-ERR',
																			null
																		);
																	});

																	it('should call a callback with error', done => {
																		blocksProcessModule.loadBlocksFromPeer(
																			{ id: 1, string: 'test' },
																			(err, lastBlock) => {
																				expect(err).to.equal(
																					'Error loading blocks: verify.processBlock-ERR'
																				);
																				expect(lastBlock).to.deep.equal({
																					id: '3',
																					peer: 'me',
																				});
																				expect(
																					loggerStub.debug.args[0][0]
																				).to.equal('Block processing failed');
																				expect(
																					loggerStub.debug.args[0][1]
																				).to.deep.equal({
																					block: dummyBlock,
																					err: 'verify.processBlock-ERR',
																					id: '4',
																					module: 'blocks',
																				});
																				done();
																			}
																		);
																	});
																});

																describe('when succeeds', () => {
																	beforeEach(() => {
																		return modules.blocks.verify.processBlock.callsArgWith(
																			3,
																			null,
																			true
																		);
																	});

																	it('should return last valid block and no error', done => {
																		blocksProcessModule.loadBlocksFromPeer(
																			{ id: 1, string: 'test' },
																			(err, lastBlock) => {
																				expect(err).to.be.null;
																				expect(lastBlock).to.deep.equal(
																					dummyBlock
																				);
																				expect(
																					loggerStub.info.args[1][0]
																				).to.equal(
																					'Block 4 loaded from: ip:wsPort'
																				);
																				expect(
																					loggerStub.info.args[1][1]
																				).to.equal('height: 4');
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
							});
						});
					});
				});
			});
		});
	});

	describe('generateBlock', () => {
		describe('modules.transactions.getUnconfirmedTransactionList', () => {
			describe('when query returns empty array', () => {
				beforeEach(() => {
					modules.transactions.getUnconfirmedTransactionList.returns([]);
					return modules.blocks.verify.processBlock.callsArgWith(
						3,
						null,
						modules.blocks.verify.processBlock.args
					);
				});

				it('should generate block without transactions', done => {
					blocksProcessModule.generateBlock(
						{ publicKey: '123abc', privateKey: 'aaa' },
						41287231,
						err => {
							expect(err).to.be.null;
							expect(library.logic.transaction.verify.calledOnce).to.be.false;
							expect(
								modules.blocks.verify.processBlock.args[0][0].transactions
									.length
							).to.equal(0);
							done();
						}
					);
				});
			});

			describe('when query returns undefined', () => {
				beforeEach(() => {
					modules.transactions.getUnconfirmedTransactionList.returns(undefined);
					return modules.blocks.verify.processBlock.callsArgWith(
						3,
						null,
						modules.blocks.verify.processBlock.args
					);
				});

				it('should generate block without transactions', done => {
					blocksProcessModule.generateBlock(
						{ publicKey: '123abc', privateKey: 'aaa' },
						41287231,
						err => {
							expect(err).to.be.null;
							expect(library.logic.transaction.verify.calledOnce).to.be.false;
							expect(
								modules.blocks.verify.processBlock.args[0][0].transactions
									.length
							).to.equal(0);
							done();
						}
					);
				});
			});

			describe('when query returns transactions', () => {
				beforeEach(() => {
					modules.transactions.getUnconfirmedTransactionList.returns([
						{ id: 1, type: 0 },
						{ id: 2, type: 1 },
					]);
					return modules.blocks.verify.processBlock.callsArgWith(
						3,
						null,
						modules.blocks.verify.processBlock.args
					);
				});

				describe('modules.accounts.getAccount', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return modules.accounts.getAccount.callsArgWith(
								1,
								'accounts.getAccount-ERR',
								null
							);
						});

						it('should call a callback with error', done => {
							blocksProcessModule.generateBlock(
								{ publicKey: '123abc', privateKey: 'aaa' },
								41287231,
								err => {
									expect(err).to.equal('Sender not found');
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() => {
							return modules.accounts.getAccount.callsArgWith(1, null, true);
						});
						afterEach(() => {
							return expect(modules.blocks.verify.processBlock.calledOnce).to.be
								.true;
						});

						describe('library.logic.transaction.ready', () => {
							describe('when returns false', () => {
								beforeEach(() => {
									return library.logic.transaction.ready.returns(false);
								});

								it('should generate block without transactions', done => {
									blocksProcessModule.generateBlock(
										{ publicKey: '123abc', privateKey: 'aaa' },
										41287231,
										err => {
											expect(err).to.be.null;
											expect(library.logic.transaction.verify.calledOnce).to.be
												.false;
											expect(
												modules.blocks.verify.processBlock.args[0][0]
													.transactions.length
											).to.equal(0);
											done();
										}
									);
								});
							});

							describe('when returns true', () => {
								beforeEach(() => {
									return library.logic.transaction.ready.returns(true);
								});

								describe('library.logic.transaction.verify', () => {
									describe('when fails', () => {
										beforeEach(() => {
											return library.logic.transaction.verify.callsArgWith(
												4,
												'transaction.verify-ERR',
												null
											);
										});

										it('should generate block without transactions', done => {
											blocksProcessModule.generateBlock(
												{ publicKey: '123abc', privateKey: 'aaa' },
												41287231,
												err => {
													expect(err).to.be.null;
													expect(
														modules.blocks.verify.processBlock.args[0][0]
															.transactions.length
													).to.equal(0);
													done();
												}
											);
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											return library.logic.transaction.verify.callsArgWith(
												4,
												null,
												true
											);
										});

										it('should generate block with transactions', done => {
											blocksProcessModule.generateBlock(
												{ publicKey: '123abc', privateKey: 'aaa' },
												41287231,
												err => {
													expect(err).to.be.null;
													expect(
														modules.blocks.verify.processBlock.args[0][0]
															.transactions.length
													).to.equal(2);
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

				describe('library.logic.block.create', () => {
					beforeEach(() => {
						modules.accounts.getAccount.callsArgWith(1, null, true);
						library.logic.transaction.ready.returns(true);
						return library.logic.transaction.verify.callsArgWith(4, null, true);
					});

					describe('when fails', () => {
						beforeEach(done => {
							library.logic.block.create = sinonSandbox.stub();
							library.logic.block.create.throws('block-create-ERR');
							done();
						});

						it('should call a callback with error', done => {
							blocksProcessModule.generateBlock(
								{ publicKey: '123abc', privateKey: 'aaa' },
								41287231,
								err => {
									expect(err.name).to.equal('block-create-ERR');
									expect(loggerStub.error.args[0][0]).to.contains(
										'block-create-ERR'
									);
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						describe('modules.blocks.verify.processBlock', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return modules.blocks.verify.processBlock.callsArgWith(
										3,
										'verify.processBlock-ERR',
										null
									);
								});

								it('should call a callback with error', done => {
									blocksProcessModule.generateBlock(
										{ publicKey: '123abc', privateKey: 'aaa' },
										41287231,
										err => {
											expect(err).to.equal('verify.processBlock-ERR');
											done();
										}
									);
								});
							});

							describe('when succeeds', () => {
								it('should call modules.blocks.verify.processBlock with proper args', done => {
									blocksProcessModule.generateBlock(
										{ publicKey: '123abc', privateKey: 'aaa' },
										41287231,
										err => {
											expect(err).to.be.null;
											expect(modules.blocks.verify.processBlock.calledOnce).to
												.be.true;
											expect(
												modules.blocks.verify.processBlock.args[0][0]
													.transactions.length
											).to.equal(2);
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

	describe('__private.validateBlockSlot', () => {
		describe('lastBlock.height % ACTIVE_DELEGATES === 0', () => {
			describe('validateBlockSlotAgainstPreviousRound', () => {
				describe('when fails', () => {
					beforeEach(() => {
						return modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
							1,
							'round-ERR',
							null
						);
					});

					it('should call a callback with error', done => {
						__private.validateBlockSlot(
							{ height: 10 },
							{ height: 202 },
							err => {
								expect(err).to.equal('round-ERR');
								expect(
									modules.delegates.validateBlockSlotAgainstPreviousRound
										.calledOnce
								).to.be.true;
								done();
							}
						);
					});
				});

				describe('when succeeds', () => {
					beforeEach(() => {
						return modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
							1,
							null,
							true
						);
					});

					it('should call a callback with no error', done => {
						__private.validateBlockSlot(
							{ height: 10 },
							{ height: 202 },
							err => {
								expect(err).to.be.null;
								expect(
									modules.delegates.validateBlockSlotAgainstPreviousRound
										.calledOnce
								).to.be.true;
								done();
							}
						);
					});
				});
			});
		});

		describe('lastBlock.height % ACTIVE_DELEGATES !== 0', () => {
			describe('roundLastBlock < roundNextBlock', () => {
				describe('validateBlockSlotAgainstPreviousRound', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
								1,
								'round-ERR',
								null
							);
						});

						it('should call a callback with error', done => {
							__private.validateBlockSlot(
								{ height: 400 },
								{ height: 200 },
								err => {
									expect(err).to.equal('round-ERR');
									expect(
										modules.delegates.validateBlockSlotAgainstPreviousRound
											.calledOnce
									).to.be.true;
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() => {
							return modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
								1,
								null,
								true
							);
						});

						it('should call a callback with no error', done => {
							__private.validateBlockSlot(
								{ height: 400 },
								{ height: 200 },
								err => {
									expect(err).to.be.null;
									expect(
										modules.delegates.validateBlockSlotAgainstPreviousRound
											.calledOnce
									).to.be.true;
									done();
								}
							);
						});
					});
				});
			});

			describe('roundLastBlock >= roundNextBlock', () => {
				describe('validateBlockSlot', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return modules.delegates.validateBlockSlot.callsArgWith(
								1,
								'round-ERR',
								null
							);
						});

						it('should call a callback with error', done => {
							__private.validateBlockSlot(
								{ height: 10 },
								{ height: 200 },
								err => {
									expect(err).to.equal('round-ERR');
									expect(modules.delegates.validateBlockSlot.calledOnce).to.be
										.true;
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() => {
							return modules.delegates.validateBlockSlot.callsArgWith(
								1,
								null,
								true
							);
						});

						it('should call a callback with no error', done => {
							__private.validateBlockSlot(
								{ height: 10 },
								{ height: 200 },
								err => {
									expect(err).to.be.null;
									expect(modules.delegates.validateBlockSlot.calledOnce).to.be
										.true;
									done();
								}
							);
						});
					});
				});
			});
		});
	});

	describe('onReceiveBlock', () => {
		var tempReceiveBlock;
		var tempReceiveForkOne;
		var tempReceiveForkFive;

		beforeEach(done => {
			tempReceiveBlock = __private.receiveBlock;
			tempReceiveForkOne = __private.receiveForkOne;
			tempReceiveForkFive = __private.receiveForkFive;
			done();
		});

		afterEach(done => {
			__private.receiveBlock = tempReceiveBlock;
			__private.receiveForkOne = tempReceiveForkOne;
			__private.receiveForkFive = tempReceiveForkFive;
			done();
		});

		describe('Client is syncing and not ready to receive block', () => {
			describe('when __private.loaded is false', () => {
				beforeEach(done => {
					__private.loaded = false;
					done();
				});

				afterEach(done => {
					__private.loaded = true;
					done();
				});

				it('should return without process block', () => {
					blocksProcessModule.onReceiveBlock({ id: 5 });

					expect(loggerStub.debug.args[0][0]).to.equal(
						'Client is not ready to receive block'
					);
					expect(loggerStub.debug.args[0][1]).to.equal(5);
					return expect(modules.blocks.lastBlock.get.calledOnce).to.be.false;
				});
			});

			describe('when modules.loader.syncing is true', () => {
				beforeEach(() => {
					return modules.loader.syncing.returns(true);
				});

				afterEach(() => {
					return modules.loader.syncing.returns(false);
				});

				it('should return without process block', () => {
					blocksProcessModule.onReceiveBlock({ id: 5 });

					expect(loggerStub.debug.args[0][0]).to.equal(
						"Client is syncing. Can't receive block at the moment."
					);
					expect(loggerStub.debug.args[0][1]).to.equal(5);
					return expect(modules.blocks.lastBlock.get.calledOnce).to.be.false;
				});
			});
		});

		describe('client ready to receive block', () => {
			afterEach(() => {
				return expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			});

			describe('when block.previousBlock === lastBlock.id && lastBlock.height + 1 === block.height', () => {
				beforeEach(done => {
					__private.receiveBlock = sinonSandbox
						.stub()
						.callsArgWith(1, null, true);
					done();
				});

				afterEach(() => {
					return expect(__private.receiveBlock.calledOnce).to.be.true;
				});

				it('should call __private.receiveBlock', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: 5,
						previousBlock: '2',
						height: 3,
					});
				});
			});

			describe('when block.previousBlock !== lastBlock.id && lastBlock.height + 1 === block.height', () => {
				beforeEach(done => {
					__private.receiveForkOne = sinonSandbox
						.stub()
						.callsArgWith(2, null, true);
					done();
				});

				afterEach(() => {
					expect(__private.receiveForkOne.calledOnce).to.be.true;
					expect(__private.receiveForkOne.args[0][0]).to.deep.equal({
						id: 5,
						previousBlock: '3',
						height: 3,
					});
					expect(__private.receiveForkOne.args[0][1]).to.deep.equal({
						id: '2',
						height: 2,
					});
					return expect(__private.receiveForkOne.args[0][2]).to.be.an(
						'function'
					);
				});

				it('should call __private.receiveForkOne', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: 5,
						previousBlock: '3',
						height: 3,
					});
				});
			});

			describe('when block.previousBlock === lastBlock.previousBlock && block.height === lastBlock.height && block.id !== lastBlock.id', () => {
				beforeEach(() => {
					__private.receiveForkFive = sinonSandbox
						.stub()
						.callsArgWith(2, null, true);
					return modules.blocks.lastBlock.get.returns({
						id: '2',
						height: 2,
						previousBlock: '1',
					});
				});

				afterEach(() => {
					expect(__private.receiveForkFive.calledOnce).to.be.true;
					expect(__private.receiveForkFive.args[0][0]).to.deep.equal({
						id: 5,
						previousBlock: '1',
						height: 2,
					});
					expect(__private.receiveForkFive.args[0][1]).to.deep.equal({
						id: '2',
						previousBlock: '1',
						height: 2,
					});
					return expect(__private.receiveForkFive.args[0][2]).to.be.an(
						'function'
					);
				});

				it('should call __private.receiveForkFive', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: 5,
						previousBlock: '1',
						height: 2,
					});
				});
			});

			describe('when block.id === lastBlock.id', () => {
				afterEach(done => {
					expect(loggerStub.debug.args[0][0]).to.equal(
						'Block already processed'
					);
					expect(loggerStub.debug.args[0][1]).to.equal('2');
					done();
				});

				it('should log debug message and call a callback', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: '2',
						previousBlock: '1',
						height: 2,
					});
				});
			});

			describe('when block.id !== lastBlock.id', () => {
				afterEach(() => {
					return expect(loggerStub.warn.args[0][0]).to.equal(
						'Discarded block that does not match with current chain: 7 height: 11 round: 1 slot: 544076 generator: a1'
					);
				});

				it('should discard block, when it does not match with current chain', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: '7',
						previousBlock: '6',
						height: 11,
						timestamp: 5440768,
						generatorPublicKey: 'a1',
					});
				});
			});
		});
	});

	describe('onBind', () => {
		beforeEach(done => {
			loggerStub.trace.reset();
			__private.loaded = false;
			blocksProcessModule.onBind(modulesStub);
			done();
		});

		it('should call library.logger.trace with "Blocks->Process: Shared modules bind."', () => {
			return expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Process: Shared modules bind.'
			);
		});

		it('should assign params to modules', done => {
			expect(modules.accounts).to.equal(modulesStub.accounts);
			expect(modules.blocks).to.equal(modulesStub.blocks);
			expect(modules.delegates).to.equal(modulesStub.delegates);
			expect(modules.loader).to.equal(modulesStub.loader);
			expect(modules.rounds).to.equal(modulesStub.rounds);
			expect(modules.transactions).to.equal(modulesStub.transactions);
			expect(modules.transport).to.equal(modulesStub.transport);
			done();
		});

		it('should assign definitions with swagger.definitions', () => {
			return expect(definitions).to.equal(modulesStub.swagger.definitions);
		});

		it('should set __private.loaded to true', () => {
			return expect(__private.loaded).to.be.true;
		});
	});
});
