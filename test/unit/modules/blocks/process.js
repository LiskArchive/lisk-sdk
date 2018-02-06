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

	describe('constructor', () => {
		var blockStub;
		var transactionStub;
		var peersStub;
		var schemaStub;

		before(done => {
			dbStub = {
				blocks: {
					getCommonBlock: sinonSandbox.stub(),
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
			done();
		});

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
		var modulesStub;
		var definitions;

		before(() => {
			dummyBlock = {
				id: '1',
				height: 1,
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
				},
				chain: {
					deleteLastBlock: sinonSandbox.stub(),
					recoverChain: sinonSandbox.stub(),
				},
				utils: {
					getIdSequence: sinonSandbox.stub(),
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

			loggerStub.trace.reset();
			__private.loaded = false;

			blocksProcessModule.onBind(modulesStub);
			modules = BlocksProcess.__get__('modules');
			definitions = BlocksProcess.__get__('definitions');
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
		beforeEach(done => {
			loggerStub.info.reset();
			modules.blocks.lastReceipt.update.reset();
			done();
		});

		it('should return error when block is not valid', done => {
			modules.blocks.verify.processBlock.callsArgWith(
				3,
				'verify.processBlock-ERR',
				null
			);

			__private.receiveBlock({ id: 'ERR' }, (err, cb) => {
				expect(err).to.equal('verify.processBlock-ERR');
				expect(cb).to.be.null;
				expect(modules.blocks.lastReceipt.update.called).to.be.true;
				done();
			});
		});

		it('should return cb when block is valid', done => {
			modules.blocks.verify.processBlock.callsArgWith(3, null, true);

			__private.receiveBlock(dummyBlock, (err, cb) => {
				expect(err).to.be.null;
				expect(cb).to.be.true;
				expect(loggerStub.info.args[0]).to.contains(
					'Received new block id: 1 height: 1 round: 1 slot: 4128723 reward: 100'
				);
				expect(modules.blocks.lastReceipt.update.called).to.be.true;
				done();
			});
		});
	});

	describe('__private.receiveForkOne', () => {
		describe('Last block stands', () => {
			beforeEach(done => {
				loggerStub.info.reset();
				modules.delegates.fork.reset();
				done();
			});

			afterEach(done => {
				expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				).to.be.true;
				done();
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
			beforeEach(done => {
				loggerStub.info.reset();
				loggerStub.error.reset();
				modules.delegates.fork.reset();
				done();
			});

			afterEach(done => {
				expect(loggerStub.info.args[0][0]).to.equal(
					'Last block and parent loses'
				);
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				).to.be.true;
				done();
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
				library.logic.block.objectNormalize.returns(
					library.logic.block.objectNormalize.getCall(0).args[0]
				);
				__private.validateBlockSlot = sinonSandbox
					.stub()
					.callsArgWith(2, 'validateBlockSlot-ERR', null);

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
				modules.blocks.verify.verifyReceipt.returns({ verified: true });
				modules.blocks.chain.deleteLastBlock
					.onCall(0)
					.callsArgWith(0, 'deleteLastBlock-ERR-call-1', null);
				modules.blocks.chain.deleteLastBlock
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
				modules.blocks.chain.deleteLastBlock.reset();
				modules.blocks.chain.deleteLastBlock
					.onCall(0)
					.callsArgWith(0, null, 'delete block 1 ok');
				modules.blocks.chain.deleteLastBlock
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
				modules.blocks.chain.deleteLastBlock.reset();
				modules.blocks.chain.deleteLastBlock
					.onCall(0)
					.callsArgWith(0, null, 'delete block 1 ok');
				modules.blocks.chain.deleteLastBlock
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
			beforeEach(done => {
				loggerStub.warn.reset();
				done();
			});

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
			beforeEach(done => {
				loggerStub.info.reset();
				modules.delegates.fork.reset();
				done();
			});

			afterEach(done => {
				expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
				done();
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
			beforeEach(done => {
				loggerStub.info.reset();
				loggerStub.error.reset();
				modules.delegates.fork.reset();
				done();
			});

			afterEach(done => {
				expect(loggerStub.info.args[0][0]).to.equal('Last block loses');
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 5)
				).to.be.true;
				done();
			});

			it('should throw error when library.logic.block.objectNormalize fails', done => {
				library.logic.block.objectNormalize.throws('objectNormalize-ERR');

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

			it('should return error when __private.validateBlockSlot fails', done => {
				library.logic.block.objectNormalize.returns(
					library.logic.block.objectNormalize.getCall(0).args[0]
				);
				__private.validateBlockSlot.callsArgWith(
					2,
					'validateBlockSlot-ERR',
					null
				);

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

			it('should return error when modules.blocks.verify.verifyReceipt fails', done => {
				__private.validateBlockSlot.callsArgWith(2, null, true);
				modules.blocks.verify.verifyReceipt.returns({
					verified: false,
					errors: ['verifyReceipt-ERR', 'ERR2'],
				});

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
						expect(loggerStub.error.args[1][1]).to.equal('verifyReceipt-ERR');
						done();
					}
				);
			});

			it('should return error when modules.blocks.chain.deleteLastBlock fails', done => {
				modules.blocks.verify.verifyReceipt.returns({ verified: true });
				modules.blocks.chain.deleteLastBlock.callsArgWith(
					0,
					'deleteLastBlock-ERR',
					null
				);

				__private.receiveForkFive(
					{ timestamp: 10, id: 2 },
					{ timestamp: 20, id: 1 },
					(err, cb) => {
						expect(err).to.equal('deleteLastBlock-ERR');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.equal(
							'Fork recovery failed'
						);
						expect(loggerStub.error.args[0][1]).to.equal('deleteLastBlock-ERR');
						done();
					}
				);
			});

			it('should return error when __private.receiveBlock fails', done => {
				modules.blocks.chain.deleteLastBlock.callsArgWith(
					0,
					null,
					'delete block ok'
				);
				__private.receiveBlock = sinonSandbox
					.stub()
					.callsArgWith(1, 'receiveBlock-ERR', null);

				__private.receiveForkFive(
					{ timestamp: 10, id: 2 },
					{ timestamp: 20, id: 1 },
					(err, cb) => {
						expect(err).to.equal('receiveBlock-ERR');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.equal(
							'Fork recovery failed'
						);
						expect(loggerStub.error.args[0][1]).to.equal('receiveBlock-ERR');
						done();
					}
				);
			});

			it('should return no error', done => {
				__private.receiveBlock.callsArgWith(1, null, 'receiveBlock ok');

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

	describe('getCommonBlock', () => {
		describe('consensus high', () => {
			before(() => {
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
					(err, cb) => {
						expect(err).to.equal('getIdSequence-ERR');
						expect(cb).to.be.undefined;
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
					(err, cb) => {
						expect(
							library.logic.peers.applyHeaders.calledWithExactly({ state: 1 })
						).to.be.true;
						expect(err).to.equal('rpc.blocksCommon-ERR');
						expect(cb).to.be.undefined;
						done();
					}
				);
			});

			it('should return error when peer.rpc.blocksCommon chain comparison fails', done => {
				library.logic.peers.applyHeaders.reset();
				modules.blocks.utils.getIdSequence.callsArgWith(1, null, {
					ids: 'rpc.blocksCommon-Empty',
				});

				blocksProcessModule.getCommonBlock(
					{ ip: 1, wsPort: 2 },
					10,
					(err, cb) => {
						expect(library.logic.peers.applyHeaders.called).to.be.false;
						expect(err).to.equal(
							'Chain comparison failed with peer: ip:wsPort using ids: rpc.blocksCommon-Empty'
						);
						expect(cb).to.be.undefined;
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
					(err, cb) => {
						expect(err).to.equal('schema.validate-ERR');
						expect(cb).to.be.undefined;
						done();
					}
				);
			});

			it('should throw error when library.db.blocks.getCommonBlock fails', done => {
				loggerStub.error.reset();
				library.schema.validate.callsArgWith(
					2,
					null,
					library.schema.validate.getCall(0).args[0]
				);
				library.db.blocks.getCommonBlock.rejects(
					new Error('blocks.getCommonBlock-REJECTS')
				);

				blocksProcessModule.getCommonBlock(
					{ ip: 1, wsPort: 2 },
					10,
					(err, cb) => {
						expect(err).to.equal('Blocks#getCommonBlock error');
						expect(cb).to.be.undefined;
						expect(loggerStub.error.args[0][0]).to.contains(
							'Error: blocks.getCommonBlock-REJECTS'
						);
						done();
					}
				);
			});

			it('should return error when library.db.blocks.getCommonBlock returns empty', done => {
				library.db.blocks.getCommonBlock.resolves([]);

				blocksProcessModule.getCommonBlock(
					{ ip: 1, wsPort: 2 },
					10,
					(err, cb) => {
						expect(err).to.equal(
							`Chain comparison failed with peer: ip:wsPort using block: ${JSON.stringify(
								dummyCommonBlock
							)}`
						);
						expect(cb).to.be.undefined;
						done();
					}
				);
			});

			it('should return common block', done => {
				library.db.blocks.getCommonBlock.resolves([{ count: 1 }]);

				blocksProcessModule.getCommonBlock(
					{ ip: 1, wsPort: 2 },
					10,
					(err, cb) => {
						expect(err).to.be.null;
						expect(cb).to.deep.equal(dummyCommonBlock);
						done();
					}
				);
			});
		});

		describe('consensus low', () => {
			before(() => {
				modules.transport.poorConsensus.returns(true);
			});

			describe('perform chain recovery', () => {
				describe('when peer.rpc.blocksCommon chain comparison fails', () => {
					before(() => {
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
					before(() => {
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
});
