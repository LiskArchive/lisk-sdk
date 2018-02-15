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
	var dbSequenceStub;
	var sequenceStub;
	var genesisblockStub;
	var modulesStub;
	var definitions;

	beforeEach(() => {
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
		dummyCommonBlock = { id: '3', previousBlock: '2', height: '3' };
		peerStub.rpc.blocksCommon
			.withArgs(sinonSandbox.match({ ids: 'ERR' }))
			.callsArgWith(1, 'rpc.blocksCommon-ERR', null)
			.withArgs(sinonSandbox.match({ ids: 'rpc.blocksCommon-Empty' }))
			.callsArgWith(1, null, { common: undefined })
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
		dbSequenceStub = {
			add: (cb, cbp) => {
				cb(cbp);
			},
		};
		sequenceStub = {
			add: sinonSandbox.stub(),
		};
		genesisblockStub = {
			block: {
				id: '6524861224470851795',
				height: 1,
			},
		};
		blocksProcessModule = new BlocksProcess(
			loggerStub,
			blockStub,
			peersStub,
			transactionStub,
			schemaStub,
			dbStub,
			dbSequenceStub,
			sequenceStub,
			genesisblockStub
		);
		library = BlocksProcess.__get__('library');
		__private = BlocksProcess.__get__('__private');
		// Modules
		dummyBlock = {
			id: '4',
			height: 4,
			timestamp: 41287231,
			reward: 100,
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
		var swaggerDefinitionsStub = sinonSandbox.stub();

		modulesStub = {
			accounts: modulesAccountsStub,
			blocks: modulesBlocksStub,
			delegates: modulesDelegatesStub,
			loader: modulesLoaderStub,
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
	});

	afterEach(() => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.schema).to.eql(schemaStub);
			expect(library.db).to.eql(dbStub);
			expect(library.dbSequence).to.eql(dbSequenceStub);
			expect(library.sequence).to.eql(sequenceStub);
			expect(library.genesisblock).to.eql(genesisblockStub);
			expect(library.logic.block).to.eql(blockStub);
			expect(library.logic.peers).to.eql(peersStub);
			expect(library.logic.transaction).to.eql(transactionStub);
		});

		it('should call library.logger.trace with "Blocks->Process: Submodule initialized."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
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
			expect(blocksProcessModule.onBind).to.be.a('function');
		});
	});

	describe('__private.receiveBlock', () => {
		beforeEach(() => {
			modules.blocks.verify.processBlock.callsArgWith(3, null, true);
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
		before(() => {
			tempValidateBlockSlot = __private.validateBlockSlot;
		});

		after(() => {
			__private.validateBlockSlot = tempValidateBlockSlot;
		});

		describe('Last block stands', () => {
			afterEach(() => {
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				).to.be.true;
				expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
			});

			it('should return when block.timestamp > lastBlock.timestamp', done => {
				const block = { timestamp: 2 };
				const lastBlock = { timestamp: 1 };
				__private.receiveForkOne(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should return when timestamps are equals and block.id > lastBlock.id', done => {
				const block = { timestamp: 1, id: 2 };
				const lastBlock = { timestamp: 1, id: 1 };
				__private.receiveForkOne(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});

		describe('Last block and parent loses', () => {
			beforeEach(() => {
				__private.validateBlockSlot = sinonSandbox.stub();
			});

			afterEach(() => {
				expect(loggerStub.info.args[0][0]).to.equal(
					'Last block and parent loses'
				);
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				).to.be.true;
			});

			describe('library.logic.block.objectNormalize', () => {
				describe('when fails', () => {
					beforeEach(() => {
						library.logic.block.objectNormalize.throws('objectNormalize-ERR');
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
								__private.validateBlockSlot.callsArgWith(
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
										modules.blocks.verify.verifyReceipt.returns({
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
												modules.blocks.chain.deleteLastBlock
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
														modules.blocks.chain.deleteLastBlock
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
														modules.blocks.chain.deleteLastBlock
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
		before(() => {
			tempValidateBlockSlot = __private.validateBlockSlot;
		});

		after(() => {
			__private.validateBlockSlot = tempValidateBlockSlot;
		});

		describe('Delegate forgin on multiple nodes', () => {
			it('should warn when delegate forged on more than one node', done => {
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

			it('should not warn when delegate forged on only one node', done => {
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

		describe('Last block stands', () => {
			afterEach(() => {
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
				expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
			});

			it('should return when block.timestamp > lastBlock.timestamp', done => {
				const block = { timestamp: 2 };
				const lastBlock = { timestamp: 1 };
				__private.receiveForkFive(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should return when timestamps are equals and block.id > lastBlock.id', done => {
				const block = { timestamp: 1, id: 2 };
				const lastBlock = { timestamp: 1, id: 1 };
				__private.receiveForkFive(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});

		describe('Last block loses', () => {
			beforeEach(() => {
				__private.validateBlockSlot = sinonSandbox.stub();
				__private.receiveBlock = sinonSandbox.stub();
			});

			afterEach(() => {
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
				expect(loggerStub.info.args[0][0]).to.equal('Last block loses');
			});

			describe('library.logic.block.objectNormalize', () => {
				describe('when fails', () => {
					beforeEach(() => {
						library.logic.block.objectNormalize.throws('objectNormalize-ERR');
					});

					it('should throw error', done => {
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
						library.logic.block.objectNormalize.returns({
							timestamp: 1,
							id: 2,
						});
					});

					describe('__private.validateBlockSlot', () => {
						describe('when fails', () => {
							beforeEach(() => {
								__private.validateBlockSlot.callsArgWith(
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
								__private.validateBlockSlot.callsArgWith(2, null, true);
							});

							describe('modules.blocks.verify.verifyReceipt', () => {
								describe('when fails', () => {
									beforeEach(() => {
										modules.blocks.verify.verifyReceipt.returns({
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
										modules.blocks.verify.verifyReceipt.returns({
											verified: true,
										});
									});

									describe('modules.blocks.chain.deleteLastBlock', () => {
										describe('when fails', () => {
											beforeEach(() => {
												modules.blocks.chain.deleteLastBlock.callsArgWith(
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
												modules.blocks.chain.deleteLastBlock.callsArgWith(
													0,
													null,
													'delete block ok'
												);
											});
											describe('__private.receiveBlock', () => {
												describe('when fails', () => {
													beforeEach(() => {
														__private.receiveBlock.callsArgWith(
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
														__private.receiveBlock.callsArgWith(
															1,
															null,
															'receiveBlock ok'
														);
													});

													it('should return no error', done => {
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
					modules.blocks.utils.getIdSequence.callsArgWith(
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
							modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'ERR',
							});
						});

						it('should call a callback with error', done => {
							blocksProcessModule.getCommonBlock(
								{ ip: 1, wsPort: 2 },
								10,
								(err, block) => {
									expect(
										library.logic.peers.applyHeaders.calledWithExactly({
											state: 1,
										})
									).to.be.true;
									expect(err).to.equal('rpc.blocksCommon-ERR');
									expect(block).to.be.undefined;
									done();
								}
							);
						});
					});

					describe('when comparaison failed', () => {
						beforeEach(() => {
							modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'rpc.blocksCommon-Empty',
							});
							modules.blocks.chain.recoverChain.callsArgWith(0, null, true);
						});

						describe('and consensus is low', () => {
							beforeEach(() => {
								modules.transport.poorConsensus.returns(true);
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

						describe('and consensus is high', () => {
							beforeEach(() => {
								modules.transport.poorConsensus.returns(false);
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
							modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'OK',
							});
						});
						describe('library.schema.validate', () => {
							describe('when fails', () => {
								beforeEach(() => {
									library.schema.validate.callsArgWith(
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
									library.schema.validate.callsArgWith(2, null, {
										ip: 1,
										wsPort: 2,
									});
								});

								describe('library.db.blocks.getCommonBlock', () => {
									describe('when fails', () => {
										beforeEach(() => {
											library.db.blocks.getCommonBlock.rejects(
												new Error('blocks.getCommonBlock-REJECTS')
											);
										});

										it('should throw error', done => {
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

									describe('when comparaison failed', () => {
										beforeEach(() => {
											library.db.blocks.getCommonBlock.resolves([]);
											modules.blocks.chain.recoverChain.callsArgWith(
												0,
												null,
												true
											);
										});

										describe('and consensus is low', () => {
											beforeEach(() => {
												modules.transport.poorConsensus.returns(true);
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

										describe('and consensus is high', () => {
											beforeEach(() => {
												modules.transport.poorConsensus.returns(false);
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
											library.db.blocks.getCommonBlock.resolves([{ count: 1 }]);
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
			expect(loggerStub.debug.args[0][0]).to.equal('Loading blocks offset');
		});

		describe('library.db.blocks.loadBlocksOffset', () => {
			describe('when fails', () => {
				beforeEach(() => {
					library.db.blocks.loadBlocksOffset.rejects(
						'blocks.loadBlocksOffset-REJECTS'
					);
				});

				it('should throw error', done => {
					blocksProcessModule.loadBlocksOffset(
						100,
						0,
						true,
						(err, lastBlock) => {
							expect(err).to.equal(
								'Blocks#loadBlocksOffset error: blocks.loadBlocksOffset-REJECTS'
							);
							expect(lastBlock).to.be.undefined;
							expect(loggerStub.error.args[0][0].stack).to.contains(
								'blocks.loadBlocksOffset-REJECTS'
							);
							done();
						}
					);
				});
			});

			describe('when succeeds', () => {
				describe('if returns empty', () => {
					beforeEach(() => {
						library.db.blocks.loadBlocksOffset.resolves([]);
						modules.blocks.utils.readDbRows.returns([]);
					});

					afterEach(() => {
						expect(modules.blocks.utils.readDbRows.calledOnce).to.be.true;
						expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
						expect(modules.blocks.isCleaning.get.calledOnce).to.be.false;
					});

					it('should return without process', done => {
						blocksProcessModule.loadBlocksOffset(
							100,
							0,
							true,
							(err, lastBlock) => {
								expect(err).to.be.null;
								expect(lastBlock).to.deep.equal({
									id: '2',
									height: 2,
								});
								done();
							}
						);
					});
				});

				describe('if returns rows', () => {
					beforeEach(() => {
						library.db.blocks.loadBlocksOffset.resolves([dummyBlock]);
						modules.blocks.utils.readDbRows.returns([dummyBlock]);
					});

					afterEach(() => {
						expect(modules.blocks.utils.readDbRows.calledOnce).to.be.true;
						expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
					});

					describe('modules.blocks.isCleaning.get', () => {
						describe('when returns true, node shutdown is requested', () => {
							beforeEach(() => {
								modules.blocks.isCleaning.get.returns(true);
							});
							afterEach(() => {
								expect(loggerStub.debug.args[0][1]).to.deep.equal({
									limit: 100,
									offset: 0,
									verify: true,
								});
							});

							it('should return immediate', done => {
								blocksProcessModule.loadBlocksOffset(
									100,
									0,
									true,
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
								modules.blocks.isCleaning.get.returns(false);
							});

							describe('when verify is true and block id is not genesis block', () => {
								afterEach(() => {
									expect(loggerStub.debug.args[1][0]).to.equal(
										'Processing block'
									);
									expect(loggerStub.debug.args[1][1]).to.equal('4');
									expect(loggerStub.debug.args[0][1]).to.deep.equal({
										limit: 100,
										offset: 0,
										verify: true,
									});
								});

								describe('library.logic.block.objectNormalize', () => {
									describe('when fails', () => {
										beforeEach(() => {
											library.logic.block.objectNormalize.throws(
												'objectNormalize-ERR'
											);
										});

										it('should call a callback with error', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												true,
												(err, lastBlock) => {
													expect(err.name).to.equal('objectNormalize-ERR');
													expect(lastBlock).to.deep.equal({
														id: '2',
														height: 2,
													});
													done();
												}
											);
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											library.logic.block.objectNormalize.returns(dummyBlock);
										});
										describe('modules.blocks.verify.verifyBlock', () => {
											describe('when fails', () => {
												beforeEach(() => {
													modules.blocks.verify.verifyBlock.returns({
														verified: false,
														errors: ['verifyBlock-ERR'],
													});
												});

												it('should call a callback with error', done => {
													blocksProcessModule.loadBlocksOffset(
														100,
														0,
														true,
														(err, lastBlock) => {
															expect(err).to.equal('verifyBlock-ERR');
															expect(lastBlock).to.deep.equal({
																id: '2',
																height: 2,
															});
															expect(loggerStub.error.args[0][0]).to.equal(
																'Block 4 verification failed'
															);
															expect(loggerStub.error.args[0][1]).to.equal(
																'verifyBlock-ERR'
															);
															done();
														}
													);
												});
											});

											describe('when succeeds', () => {
												beforeEach(() => {
													modules.blocks.verify.verifyBlock.returns({
														verified: true,
													});
												});
												describe('modules.blocks.chain.applyBlock ', () => {
													describe('when fails', () => {
														beforeEach(() => {
															modules.blocks.chain.applyBlock.callsArgWith(
																2,
																'chain.applyBlock-ERR',
																null
															);
														});

														it('should call a callback with error', done => {
															blocksProcessModule.loadBlocksOffset(
																100,
																0,
																true,
																(err, lastBlock) => {
																	expect(err).to.equal('chain.applyBlock-ERR');
																	expect(lastBlock).to.deep.equal({
																		id: '2',
																		height: 2,
																	});
																	done();
																}
															);
														});
													});

													describe('when succeeds', () => {
														beforeEach(() => {
															modules.blocks.chain.applyBlock.callsArgWith(
																2,
																null,
																dummyBlock
															);
															modules.blocks.lastBlock.get.returns(dummyBlock);
														});

														it('should return lastBlock and no errors', done => {
															blocksProcessModule.loadBlocksOffset(
																100,
																0,
																true,
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

							describe('when block id is genesis block', () => {
								beforeEach(() => {
									modules.blocks.utils.readDbRows.returns([
										{
											id: '6524861224470851795',
											height: 1,
											timestamp: 0,
											reward: 0,
										},
									]);
								});
								afterEach(() => {
									expect(loggerStub.debug.args[0][1]).to.deep.equal({
										limit: 100,
										offset: 0,
										verify: true,
									});
								});

								describe('modules.blocks.chain.applyGenesisBlock', () => {
									describe('when fails', () => {
										beforeEach(() => {
											modules.blocks.chain.applyGenesisBlock.callsArgWith(
												1,
												'chain.applyGenesisBlock-ERR',
												null
											);
										});

										it('should call a callback with error', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												true,
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
											modules.blocks.lastBlock.get.returns(dummyBlock);
										});

										it('should return lastBlock and no errors', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												true,
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

							describe('when verify is false and block id is not genesis block', () => {
								describe('modules.blocks.chain.applyBlock ', () => {
									afterEach(() => {
										expect(loggerStub.debug.args[0][1]).to.deep.equal({
											limit: 100,
											offset: 0,
											verify: false,
										});
									});

									describe('when fails', () => {
										beforeEach(() => {
											modules.blocks.chain.applyBlock.callsArgWith(
												2,
												'chain.applyBlock-ERR',
												null
											);
										});

										it('should call a callback with error', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												false,
												(err, lastBlock) => {
													expect(err).to.equal('chain.applyBlock-ERR');
													expect(lastBlock).to.deep.equal({
														id: '2',
														height: 2,
													});
													done();
												}
											);
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											modules.blocks.chain.applyBlock.callsArgWith(
												2,
												null,
												dummyBlock
											);
											modules.blocks.lastBlock.get.returns(dummyBlock);
										});

										it('should return lastBlock and no errors', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												false,
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
			expect(loggerStub.info.args[0][0]).to.equal(
				'Loading blocks from: ip:wsPort'
			);
		});

		describe('getFromPeer', () => {
			describe('peer.rpc.blocks', () => {
				describe('when fails', () => {
					afterEach(() => {
						expect(library.logic.peers.applyHeaders.calledOnce).to.be.true;
						expect(
							library.logic.peers.applyHeaders.calledWithExactly({ state: 1 })
						).to.be.true;
					});

					describe('err parameter', () => {
						beforeEach(() => {
							modules.blocks.lastBlock.get.returns({
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
					});

					describe('cb parameter', () => {
						beforeEach(() => {
							modules.blocks.lastBlock.get.returns({
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
						modules.blocks.lastBlock.get.returns({
							id: '3',
							peer: 'me',
						});
					});

					describe('validateBlocks', () => {
						describe('library.schema.validate', () => {
							describe('when fails', () => {
								beforeEach(() => {
									library.schema.validate.returns(false);
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
									library.schema.validate.returns(true);
								});

								describe('processBlocks', () => {
									describe('when receives no block', () => {
										beforeEach(() => {
											modules.blocks.lastBlock.get.returns({
												id: 'empty',
												peer: 'me',
											});
										});

										it('should skip', done => {
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
													modules.blocks.utils.readDbRows.returns(
														new Error('readDbRows err')
													);
												});

												it('should skip', done => {
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
													modules.blocks.utils.readDbRows.returns([dummyBlock]);
												});

												describe('modules.blocks.isCleaning.get', () => {
													afterEach(() => {
														expect(modules.blocks.isCleaning.get.calledOnce).to
															.be.true;
													});

													describe('when returns true, node shutdown is requested', () => {
														beforeEach(() => {
															modules.blocks.isCleaning.get.returns(true);
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
															modules.blocks.isCleaning.get.returns(false);
														});

														describe('processBlock', () => {
															describe('modules.blocks.verify.processBlock', () => {
																describe('when fails', () => {
																	beforeEach(() => {
																		modules.blocks.verify.processBlock.callsArgWith(
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
																		modules.blocks.verify.processBlock.callsArgWith(
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
		beforeEach(() => {
			modules.transactions.getUnconfirmedTransactionList.returns([
				{ id: 1, type: 0 },
				{ id: 2, type: 1 },
			]);
			modules.blocks.verify.processBlock.callsArgWith(
				3,
				null,
				modules.blocks.verify.processBlock.args
			);
		});

		describe('modules.accounts.getAccount', () => {
			describe('when fails', () => {
				beforeEach(() => {
					modules.accounts.getAccount.callsArgWith(
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
					modules.accounts.getAccount.callsArgWith(1, null, true);
				});
				afterEach(() => {
					expect(modules.blocks.verify.processBlock.calledOnce).to.be.true;
				});

				describe('library.logic.transaction.ready', () => {
					describe('when returns false', () => {
						beforeEach(() => {
							library.logic.transaction.ready.returns(false);
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
										modules.blocks.verify.processBlock.args[0][0].transactions
											.length
									).to.equal(0);
									done();
								}
							);
						});
					});

					describe('when returns true', () => {
						beforeEach(() => {
							library.logic.transaction.ready.returns(true);
						});

						describe('library.logic.transaction.verify', () => {
							describe('when fails', () => {
								beforeEach(() => {
									library.logic.transaction.verify.callsArgWith(
										2,
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
									library.logic.transaction.verify.callsArgWith(2, null, true);
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
				library.logic.transaction.verify.callsArgWith(2, null, true);
			});

			describe('when fails', () => {
				beforeEach(() => {
					library.logic.block.create = sinonSandbox.stub();
					library.logic.block.create.throws('block-create-ERR');
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
							modules.blocks.verify.processBlock.callsArgWith(
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
						it('should process block', done => {
							blocksProcessModule.generateBlock(
								{ publicKey: '123abc', privateKey: 'aaa' },
								41287231,
								err => {
									expect(err).to.be.null;
									expect(modules.blocks.verify.processBlock.calledOnce).to.be
										.true;
									expect(
										modules.blocks.verify.processBlock.args[0][0].transactions
											.length
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

	describe('__private.validateBlockSlot', () => {
		describe('lastBlock.height % slots.delegates === 0', () => {
			describe('validateBlockSlotAgainstPreviousRound', () => {
				describe('when fails', () => {
					beforeEach(() => {
						modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
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
						modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
							1,
							null,
							true
						);
					});

					it('should validate round', done => {
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

		describe('lastBlock.height % slots.delegates !== 0', () => {
			describe('roundLastBlock < roundNextBlock', () => {
				describe('validateBlockSlotAgainstPreviousRound', () => {
					describe('when fails', () => {
						beforeEach(() => {
							modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
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
							modules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
								1,
								null,
								true
							);
						});

						it('should validate round', done => {
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
							modules.delegates.validateBlockSlot.callsArgWith(
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
							modules.delegates.validateBlockSlot.callsArgWith(1, null, true);
						});

						it('should validate round', done => {
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

		before(() => {
			tempReceiveBlock = __private.receiveBlock;
			tempReceiveForkOne = __private.receiveForkOne;
			tempReceiveForkFive = __private.receiveForkFive;
		});

		after(() => {
			__private.receiveBlock = tempReceiveBlock;
			__private.receiveForkOne = tempReceiveForkOne;
			__private.receiveForkFive = tempReceiveForkFive;
		});

		describe('client not ready to receive block', () => {
			afterEach(() => {
				expect(loggerStub.debug.args[0][0]).to.equal(
					'Client not ready to receive block'
				);
				expect(loggerStub.debug.args[0][1]).to.equal(5);
				expect(modules.blocks.lastBlock.get.calledOnce).to.be.false;
			});

			describe('when __private.loaded is false', () => {
				beforeEach(() => {
					__private.loaded = false;
				});

				afterEach(() => {
					__private.loaded = true;
				});

				it('should return without process block', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({ id: 5 });
				});
			});

			describe('when modules.loader.syncing is true', () => {
				beforeEach(() => {
					modules.loader.syncing.returns(true);
				});

				afterEach(() => {
					modules.loader.syncing.returns(false);
				});

				it('should return without process block', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({ id: 5 });
				});
			});

			describe('when modules.rounds.ticking is true', () => {
				beforeEach(() => {
					modules.rounds.ticking.returns(true);
				});

				afterEach(() => {
					modules.rounds.ticking.returns(false);
				});

				it('should return without process block', done => {
					library.sequence.add = function(cb) {
						var fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({ id: 5 });
				});
			});
		});

		describe('client ready to receive block', () => {
			afterEach(() => {
				expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			});

			describe('when block.previousBlock === lastBlock.id && lastBlock.height + 1 === block.height', () => {
				beforeEach(() => {
					__private.receiveBlock = sinonSandbox
						.stub()
						.callsArgWith(1, null, true);
				});

				afterEach(() => {
					expect(__private.receiveBlock.calledOnce).to.be.true;
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
				beforeEach(() => {
					__private.receiveForkOne = sinonSandbox
						.stub()
						.callsArgWith(2, null, true);
				});

				afterEach(() => {
					expect(__private.receiveForkOne.calledOnce).to.be.true;
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
					modules.blocks.lastBlock.get.returns({
						id: '2',
						height: 2,
						previousBlock: '1',
					});
				});

				afterEach(() => {
					expect(__private.receiveForkFive.calledOnce).to.be.true;
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
				afterEach(() => {
					expect(loggerStub.debug.args[0][0]).to.equal(
						'Block already processed'
					);
					expect(loggerStub.debug.args[0][1]).to.equal('2');
				});

				it('should skip block, already processed', done => {
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

			describe('otherwise', () => {
				afterEach(() => {
					expect(loggerStub.warn.args[0][0]).to.equal(
						'Discarded block that does not match with current chain: 7 height: 11 round: 1 slot: 544076 generator: a1'
					);
				});

				it('should discard block, it does not match with current chain', done => {
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
		beforeEach(() => {
			loggerStub.trace.reset();
			__private.loaded = false;
			blocksProcessModule.onBind(modulesStub);
		});

		it('should call library.logger.trace with "Blocks->Process: Shared modules bind."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Process: Shared modules bind.'
			);
		});

		it('should assign params to modules', () => {
			expect(modules.accounts).to.equal(modulesStub.accounts);
			expect(modules.blocks).to.equal(modulesStub.blocks);
			expect(modules.delegates).to.equal(modulesStub.delegates);
			expect(modules.loader).to.equal(modulesStub.loader);
			expect(modules.rounds).to.equal(modulesStub.rounds);
			expect(modules.transactions).to.equal(modulesStub.transactions);
			expect(modules.transport).to.equal(modulesStub.transport);
		});

		it('should set definitions with swagger.definitions', () => {
			expect(definitions).to.equal(modulesStub.swagger.definitions);
		});

		it('should set __private.loaded to true', () => {
			expect(__private.loaded).to.be.true;
		});
	});
});
