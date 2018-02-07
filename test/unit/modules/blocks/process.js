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
var modulesLoader = require('../../../common/modules_loader');
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
			.withArgs(sinonSandbox.match({ ids: 'ERRL' }))
			.callsArgWith(1, 'rpc.blocksCommon-ERR', null)
			.withArgs(sinonSandbox.match({ ids: 'rpc.blocksCommon-Empty' }))
			.callsArgWith(1, null, { common: undefined })
			.withArgs(sinonSandbox.match({ ids: 'OK' }))
			.callsArgWith(1, null, {
				common: dummyCommonBlock,
			});

		peersStub = {
			create: function() {
				return peerStub;
			},
			me: function() {
				return '1.0.0.0';
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

		blocksProcessModule = new BlocksProcess(
			loggerStub,
			blockStub,
			peersStub,
			transactionStub,
			schemaStub,
			dbStub,
			modulesLoader.scope.dbSequence,
			modulesLoader.scope.sequence,
			modulesLoader.scope.genesisblock
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

		var modulesAccountsStub = sinonSandbox.stub();
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
		};

		var modulesLoaderStub = sinonSandbox.stub();
		var modulesRoundsStub = sinonSandbox.stub();
		var modulesTransactionsStub = sinonSandbox.stub();
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
		sinonSandbox.reset();
	});

	describe('constructor', () => {
		describe('library', () => {
			it('should assign logger', () => {
				expect(library.logger).to.eql(loggerStub);
			});

			it('should assign schema', () => {
				expect(library.schema).to.eql(schemaStub);
			});

			it('should assign db', () => {
				expect(library.db).to.eql(dbStub);
			});

			it('should assign dbSequence', () => {
				expect(library.dbSequence).to.eql(modulesLoader.scope.dbSequence);
			});

			it('should assign sequence', () => {
				expect(library.sequence).to.eql(modulesLoader.scope.sequence);
			});

			it('should assign genesisblock', () => {
				expect(library.genesisblock).to.eql(modulesLoader.scope.genesisblock);
			});

			it('should call library.logger.trace with "Blocks->Process: Submodule initialized."', () => {
				expect(loggerStub.trace.args[0][0]).to.equal(
					'Blocks->Process: Submodule initialized.'
				);
			});

			describe('should assign logic', () => {
				it('should assign block', () => {
					expect(library.logic.block).to.eql(blockStub);
				});

				it('should assign peers', () => {
					expect(library.logic.peers).to.eql(peersStub);
				});

				it('should assign transaction', () => {
					expect(library.logic.transaction).to.eql(transactionStub);
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

		it('should create a modules object { blocks: scope.blocks }', () => {
			expect(modules.blocks).to.equal(modulesStub.blocks);
		});

		it('should set __private.loaded to true', () => {
			expect(__private.loaded).to.be.true;
		});

		it('should set definitions with swagger.definitions', () => {
			expect(definitions).to.equal(modulesStub.swagger.definitions);
		});

		describe('modules', () => {
			it('should assign accounts', () => {
				expect(modules.accounts).to.equal(modulesStub.accounts);
			});

			it('should assign blocks', () => {
				expect(modules.blocks).to.equal(modulesStub.blocks);
			});

			it('should assign delegates', () => {
				expect(modules.delegates).to.equal(modulesStub.delegates);
			});

			it('should assign loader', () => {
				expect(modules.loader).to.equal(modulesStub.loader);
			});

			it('should assign rounds', () => {
				expect(modules.rounds).to.equal(modulesStub.rounds);
			});

			it('should assign transactions', () => {
				expect(modules.transactions).to.equal(modulesStub.transactions);
			});

			it('should assign transport', () => {
				expect(modules.transport).to.equal(modulesStub.transport);
			});
		});
	});

	describe('__private.receiveBlock', () => {
		it('should return error when block is not valid', done => {
			modules.blocks.verify.processBlock.callsArgWith(
				3,
				'verify.processBlock-ERR',
				null
			);

			__private.receiveBlock({ id: 'ERR' }, (err, cb) => {
				expect(err).to.equal('verify.processBlock-ERR');
				expect(cb).to.be.null;
				expect(modules.blocks.lastReceipt.update.calledOnce).to.be.true;
				done();
			});
		});

		it('should return cb when block is valid', done => {
			modules.blocks.verify.processBlock.callsArgWith(3, null, true);

			__private.receiveBlock(dummyBlock, (err, cb) => {
				expect(err).to.be.null;
				expect(cb).to.be.true;
				expect(loggerStub.info.args[0]).to.contains(
					'Received new block id: 4 height: 4 round: 1 slot: 4128723 reward: 100'
				);
				expect(modules.blocks.lastReceipt.update.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe('__private.receiveForkOne', () => {
		describe('Last block stands', () => {
			afterEach(() => {
				expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				).to.be.true;
			});

			it('should return when block.timestamp > lastBlock.timestamp', done => {
				__private.receiveForkOne(
					{ timestamp: 2 },
					{ timestamp: 1 },
					(err, cb) => {
						expect(err).to.be.undefined;
						expect(cb).to.be.undefined;
						done();
					}
				);
			});

			it('should return when timestamps are equals and block.id > lastBlock.id', done => {
				__private.receiveForkOne(
					{ timestamp: 1, id: 2 },
					{ timestamp: 1, id: 1 },
					(err, cb) => {
						expect(err).to.be.undefined;
						expect(cb).to.be.undefined;
						done();
					}
				);
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

			it('should throw error when library.logic.block.objectNormalize fails', done => {
				library.logic.block.objectNormalize.throws('objectNormalize-ERR');

				__private.receiveForkOne(
					{ timestamp: 1, id: 2 },
					{ timestamp: 2, id: 1 },
					(err, cb) => {
						expect(err.name).to.equal('objectNormalize-ERR');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.equal(
							'Fork recovery failed'
						);
						expect(loggerStub.error.args[0][1].name).to.equal(
							'objectNormalize-ERR'
						);
						done();
					}
				);
			});

			it('should return error when __private.validateBlockSlot fails', done => {
				library.logic.block.objectNormalize.returns({ timestamp: 1, id: 2 });
				__private.validateBlockSlot.callsArgWith(
					2,
					'validateBlockSlot-ERR',
					null
				);

				__private.receiveForkOne(
					{ timestamp: 1, id: 2 },
					{ timestamp: 2, id: 1 },
					(err, cb) => {
						expect(err).to.equal('validateBlockSlot-ERR');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.equal(
							'Fork recovery failed'
						);
						expect(loggerStub.error.args[0][1]).to.equal(
							'validateBlockSlot-ERR'
						);
						done();
					}
				);
			});

			it('should return error when modules.blocks.verify.verifyReceipt fails', done => {
				library.logic.block.objectNormalize.returns({ timestamp: 1, id: 2 });
				__private.validateBlockSlot.callsArgWith(2, null, true);
				modules.blocks.verify.verifyReceipt.returns({
					verified: false,
					errors: ['verifyReceipt-ERR', 'ERR2'],
				});

				__private.receiveForkOne(
					{ timestamp: 10, id: 2 },
					{ timestamp: 20, id: 1 },
					(err, cb) => {
						expect(err).to.equal('verifyReceipt-ERR');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.equal(
							'Block 2 verification failed'
						);
						expect(loggerStub.error.args[0][1]).to.equal(
							'verifyReceipt-ERR, ERR2'
						);
						expect(loggerStub.error.args[1][0]).to.equal(
							'Fork recovery failed'
						);
						expect(loggerStub.error.args[1][1]).to.equal('verifyReceipt-ERR');
						done();
					}
				);
			});

			it('should return error when modules.blocks.chain.deleteLastBlock fails on first call', done => {
				library.logic.block.objectNormalize.returns({ timestamp: 1, id: 2 });
				__private.validateBlockSlot.callsArgWith(2, null, true);
				modules.blocks.verify.verifyReceipt.returns({ verified: true });
				modules.blocks.chain.deleteLastBlock
					.onCall(0)
					.callsArgWith(0, 'deleteLastBlock-ERR-call-1', null)
					.onCall(1)
					.callsArgWith(0, 'deleteLastBlock-ERR-call-2', null);

				__private.receiveForkOne(
					{ timestamp: 10, id: 2 },
					{ timestamp: 20, id: 1 },
					(err, cb) => {
						expect(err).to.equal('deleteLastBlock-ERR-call-1');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.equal(
							'Fork recovery failed'
						);
						expect(loggerStub.error.args[0][1]).to.equal(
							'deleteLastBlock-ERR-call-1'
						);
						done();
					}
				);
			});

			it('should return error when modules.blocks.chain.deleteLastBlock fails on second call', done => {
				library.logic.block.objectNormalize.returns({ timestamp: 1, id: 2 });
				__private.validateBlockSlot.callsArgWith(2, null, true);
				modules.blocks.verify.verifyReceipt.returns({ verified: true });
				modules.blocks.chain.deleteLastBlock
					.onCall(0)
					.callsArgWith(0, null, 'delete block 1 ok')
					.onCall(1)
					.callsArgWith(0, 'deleteLastBlock-ERR-call-2', null);

				__private.receiveForkOne(
					{ timestamp: 10, id: 2 },
					{ timestamp: 20, id: 1 },
					(err, cb) => {
						expect(err).to.equal('deleteLastBlock-ERR-call-2');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.equal(
							'Fork recovery failed'
						);
						expect(loggerStub.error.args[0][1]).to.equal(
							'deleteLastBlock-ERR-call-2'
						);
						done();
					}
				);
			});

			it('should return no error', done => {
				library.logic.block.objectNormalize.returns({ timestamp: 1, id: 2 });
				__private.validateBlockSlot.callsArgWith(2, null, true);
				modules.blocks.verify.verifyReceipt.returns({ verified: true });
				modules.blocks.chain.deleteLastBlock
					.onCall(0)
					.callsArgWith(0, null, 'delete block 1 ok')
					.onCall(1)
					.callsArgWith(0, null, 'delete block 2 ok');

				__private.receiveForkOne(
					{ timestamp: 10, id: 2 },
					{ timestamp: 20, id: 1 },
					(err, cb) => {
						expect(err).to.be.null;
						expect(cb).to.be.undefined;
						done();
					}
				);
			});
		});
	});

	describe('__private.receiveForkFive', () => {
		describe('Delegate forgin on multiple nodes', () => {
			it('should warn when delegate forged on more than one node', done => {
				__private.receiveForkFive(
					{ timestamp: 1, id: 2, generatorPublicKey: '1a' },
					{ timestamp: 1, id: 1, generatorPublicKey: '1a' },
					(err, cb) => {
						expect(err).to.be.undefined;
						expect(cb).to.be.undefined;
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
					(err, cb) => {
						expect(err).to.be.undefined;
						expect(cb).to.be.undefined;
						expect(loggerStub.warn.args.length).to.equal(0);
						done();
					}
				);
			});
		});

		describe('Last block stands', () => {
			afterEach(() => {
				expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
			});

			it('should return when block.timestamp > lastBlock.timestamp', done => {
				__private.receiveForkFive(
					{ timestamp: 2 },
					{ timestamp: 1 },
					(err, cb) => {
						expect(err).to.be.undefined;
						expect(cb).to.be.undefined;
						done();
					}
				);
			});

			it('should return when timestamps are equals and block.id > lastBlock.id', done => {
				__private.receiveForkFive(
					{ timestamp: 1, id: 2 },
					{ timestamp: 1, id: 1 },
					(err, cb) => {
						expect(err).to.be.undefined;
						expect(cb).to.be.undefined;
						done();
					}
				);
			});
		});

		describe('Last block loses', () => {
			beforeEach(() => {
				__private.validateBlockSlot = sinonSandbox.stub();
				__private.receiveBlock = sinonSandbox.stub();
			});

			afterEach(() => {
				expect(loggerStub.info.args[0][0]).to.equal('Last block loses');
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
			});

			describe('library.logic.block.objectNormalize', () => {
				describe('when fails', () => {
					beforeEach(() => {
						library.logic.block.objectNormalize.throws('objectNormalize-ERR');
					});

					it('should throw error', done => {
						__private.receiveForkFive(
							{ timestamp: 1, id: 2 },
							{ timestamp: 2, id: 1 },
							(err, cb) => {
								expect(err.name).to.equal('objectNormalize-ERR');
								expect(cb).to.be.undefined;
								expect(loggerStub.error.args[0][0]).to.equal(
									'Fork recovery failed'
								);
								expect(loggerStub.error.args[0][1].name).to.equal(
									'objectNormalize-ERR'
								);
								done();
							}
						);
					});
				});

				describe('when success', () => {
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

							it('should return error', done => {
								__private.receiveForkFive(
									{ timestamp: 1, id: 2 },
									{ timestamp: 2, id: 1 },
									(err, cb) => {
										expect(err).to.equal('validateBlockSlot-ERR');
										expect(cb).to.be.undefined;
										expect(loggerStub.error.args[0][0]).to.equal(
											'Fork recovery failed'
										);
										expect(loggerStub.error.args[0][1]).to.equal(
											'validateBlockSlot-ERR'
										);
										done();
									}
								);
							});
						});

						describe('when success', () => {
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

									it('should return error', done => {
										__private.receiveForkFive(
											{ timestamp: 10, id: 2 },
											{ timestamp: 20, id: 1 },
											(err, cb) => {
												expect(err).to.equal('verifyReceipt-ERR');
												expect(cb).to.be.undefined;
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
											}
										);
									});
								});

								describe('when success', () => {
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

											it('should return error', done => {
												__private.receiveForkFive(
													{ timestamp: 10, id: 2 },
													{ timestamp: 20, id: 1 },
													(err, cb) => {
														expect(err).to.equal('deleteLastBlock-ERR');
														expect(cb).to.be.undefined;
														expect(loggerStub.error.args[0][0]).to.equal(
															'Fork recovery failed'
														);
														expect(loggerStub.error.args[0][1]).to.equal(
															'deleteLastBlock-ERR'
														);
														done();
													}
												);
											});
										});
										describe('when success', () => {
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

													it('should return error', done => {
														__private.receiveForkFive(
															{ timestamp: 10, id: 2 },
															{ timestamp: 20, id: 1 },
															(err, cb) => {
																expect(err).to.equal('receiveBlock-ERR');
																expect(cb).to.be.undefined;
																expect(loggerStub.error.args[0][0]).to.equal(
																	'Fork recovery failed'
																);
																expect(loggerStub.error.args[0][1]).to.equal(
																	'receiveBlock-ERR'
																);
																done();
															}
														);
													});
												});
												describe('when success', () => {
													beforeEach(() => {
														__private.receiveBlock.callsArgWith(
															1,
															null,
															'receiveBlock ok'
														);
													});

													it('should return no error', done => {
														__private.receiveForkFive(
															{ timestamp: 10, id: 2 },
															{ timestamp: 20, id: 1 },
															(err, cb) => {
																expect(err).to.be.null;
																expect(cb).to.be.undefined;
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

	describe('getCommonBlock', () => {
		describe('consensus high', () => {
			beforeEach(() => {
				modules.transport.poorConsensus.returns(false);
			});

			it('should return error when modules.blocks.utils.getIdSequence fails', done => {
				modules.blocks.utils.getIdSequence.callsArgWith(
					1,
					'getIdSequence-ERR',
					undefined
				);

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

			it('should return error when peer.rpc.blocksCommon fails', done => {
				modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
					ids: 'ERRL',
				});

				blocksProcessModule.getCommonBlock(
					{ ip: 1, wsPort: 2 },
					10,
					(err, block) => {
						expect(
							library.logic.peers.applyHeaders.calledWithExactly({ state: 1 })
						).to.be.true;
						expect(err).to.equal('rpc.blocksCommon-ERR');
						expect(block).to.be.undefined;
						done();
					}
				);
			});

			it('should return error when peer.rpc.blocksCommon chain comparison fails', done => {
				modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
					ids: 'rpc.blocksCommon-Empty',
				});

				blocksProcessModule.getCommonBlock(
					{ ip: 1, wsPort: 2 },
					10,
					(err, block) => {
						expect(library.logic.peers.applyHeaders.calledOnce).to.be.false;
						expect(err).to.equal(
							'Chain comparison failed with peer: ip:wsPort using ids: rpc.blocksCommon-Empty'
						);
						expect(block).to.be.undefined;
						done();
					}
				);
			});

			it('should return error when library.schema.validate fails', done => {
				modules.blocks.utils.getIdSequence.callsArgWith(1, null, { ids: 'OK' });
				library.schema.validate.callsArgWith(
					2,
					[{ message: 'schema.validate-ERR' }],
					undefined
				);

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

			it('should throw error when library.db.blocks.getCommonBlock fails', done => {
				modules.blocks.utils.getIdSequence.callsArgWith(1, null, { ids: 'OK' });
				library.schema.validate.callsArgWith(2, null, { ip: 1, wsPort: 2 });
				library.db.blocks.getCommonBlock.rejects(
					new Error('blocks.getCommonBlock-REJECTS')
				);

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

			it('should return error when library.db.blocks.getCommonBlock returns empty', done => {
				modules.blocks.utils.getIdSequence.callsArgWith(1, null, { ids: 'OK' });
				library.schema.validate.callsArgWith(2, null, { ip: 1, wsPort: 2 });
				library.db.blocks.getCommonBlock.resolves([]);

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

			it('should return common block', done => {
				modules.blocks.utils.getIdSequence.callsArgWith(1, null, { ids: 'OK' });
				library.schema.validate.callsArgWith(2, null, { ip: 1, wsPort: 2 });
				library.db.blocks.getCommonBlock.resolves([{ count: 1 }]);

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

		describe('consensus low', () => {
			beforeEach(() => {
				modules.transport.poorConsensus.returns(true);
			});

			describe('perform chain recovery', () => {
				describe('when peer.rpc.blocksCommon chain comparison fails', () => {
					beforeEach(() => {
						modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
							ids: 'rpc.blocksCommon-Empty',
						});
					});

					it('should return error when chain.recoverChain fails', done => {
						modules.blocks.chain.recoverChain.callsArgWith(
							0,
							'chain.recoverChain-ERR',
							undefined
						);

						blocksProcessModule.getCommonBlock(
							{ ip: 1, wsPort: 2 },
							10,
							(err, cb) => {
								expect(err).to.equal('chain.recoverChain-ERR');
								expect(cb).to.be.undefined;
								done();
							}
						);
					});

					it('should return no error when chain.recoverChain success', done => {
						modules.blocks.chain.recoverChain.callsArgWith(
							0,
							null,
							'chain.recoverChain-OK'
						);

						blocksProcessModule.getCommonBlock(
							{ ip: 1, wsPort: 2 },
							10,
							(err, cb) => {
								expect(err).to.be.null;
								expect(cb).to.equal('chain.recoverChain-OK');
								done();
							}
						);
					});
				});

				describe('when db.blocks.getCommonBlock block comparison fails', () => {
					beforeEach(() => {
						modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
							ids: 'rpc.blocksCommon-Empty',
						});
						library.db.blocks.getCommonBlock.resolves([]);
					});

					it('should return error when chain.recoverChain fails', done => {
						modules.blocks.chain.recoverChain.callsArgWith(
							0,
							'chain.recoverChain-ERR',
							undefined
						);

						blocksProcessModule.getCommonBlock(
							{ ip: 1, wsPort: 2 },
							10,
							(err, cb) => {
								expect(err).to.equal('chain.recoverChain-ERR');
								expect(cb).to.be.undefined;
								done();
							}
						);
					});

					it('should return no error when chain.recoverChain success', done => {
						modules.blocks.chain.recoverChain.callsArgWith(
							0,
							null,
							'chain.recoverChain-OK'
						);

						blocksProcessModule.getCommonBlock(
							{ ip: 1, wsPort: 2 },
							10,
							(err, cb) => {
								expect(err).to.be.null;
								expect(cb).to.equal('chain.recoverChain-OK');
								done();
							}
						);
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

			describe('when success', () => {
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

					it('should return withou process', done => {
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

										it('should return error', done => {
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

									describe('when success', () => {
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

												it('should return error', done => {
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

											describe('when success', () => {
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

														it('should return error', done => {
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

													describe('when success', () => {
														beforeEach(() => {
															modules.blocks.chain.applyBlock.callsArgWith(
																2,
																null,
																dummyBlock
															);
															modules.blocks.lastBlock.get.returns(dummyBlock);
														});

														it('should return lastBlock when no errors', done => {
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

										it('should return error', done => {
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

									describe('when success', () => {
										beforeEach(() => {
											modules.blocks.chain.applyGenesisBlock.callsArgWith(
												1,
												null,
												'chain.applyGenesisBlock-OK'
											);
											modules.blocks.lastBlock.get.returns(dummyBlock);
										});

										it('should return lastBlock', done => {
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

										it('should return error', done => {
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

									describe('when success', () => {
										beforeEach(() => {
											modules.blocks.chain.applyBlock.callsArgWith(
												2,
												null,
												dummyBlock
											);
											modules.blocks.lastBlock.get.returns(dummyBlock);
										});

										it('should return lastBlock', done => {
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
});
