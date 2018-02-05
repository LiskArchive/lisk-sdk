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

			dbStub.blocks.getCommonBlock
				.withArgs(
					sinonSandbox.match({ id: '3', previousBlock: '1', height: '3' })
				)
				.resolves([])
				.withArgs(
					sinonSandbox.match({ id: '3', previousBlock: '2', height: '3' })
				)
				.resolves([{ id: '3', previousBlock: '2', height: '3' }]);

			blockStub = {
				objectNormalize: sinonSandbox.stub(),
			};
			/*
			blockStub.objectNormalize
				.withArgs(sinonSandbox.match({ test: 'objectNormalize-ERR' }))
				.throws(new Error('objectNormalize-ERR'));
			blockStub.objectNormalize
				.withArgs(sinonSandbox.match({ test: 'objectNormalize-ERR' }))
				.returns('ok');
			console.log("test: 'objectNormalize-ERR'", blockStub.objectNormalize({ test: 'objectNormalize-ERR' }));
			console.log("{ id: 1, test:2, height:3 }", blockStub.objectNormalize({ id: 1, test:2, height:3 }));
			*/
			peersStub = {
				create: function() {
					return {
						rpc: {
							blocksCommon: sinonSandbox
								.stub()
								.withArgs(sinonSandbox.match({ ids: 'ERRL' }))
								.callsArgWith(1, 'Ids Error Stub', null)
								.withArgs(sinonSandbox.match({ ids: 'No-common' }))
								.callsArgWith(1, null, undefined)
								.withArgs(sinonSandbox.match({ ids: 'OK' }))
								.callsArgWith(1, null, {
									common: { id: '3', previousBlock: '2', height: '3' },
								}),
							blocks: sinonSandbox.stub(),
						},
					};
				},
				me: function() {
					return '1.0.0.0';
				},
			};
			transactionStub = {
				ready: sinonSandbox.stub(),
				verify: sinonSandbox.stub(),
			};

			loggerStub = {
				trace: sinonSandbox.spy(),
				info: sinonSandbox.spy(),
				error: sinonSandbox.spy(),
			};

			schemaStub = {
				validate: sinonSandbox.spy(),
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

		before(() => {
			dummyBlock = {
				id: '1',
				height: 1,
				timestamp: 41287231,
				reward: 100,
			};

			var dummyFunction = function() {};

			var modulesAccountsStub = sinonSandbox.stub();
			var modulesBlocksStub = {
				lastReceipt: {
					update: dummyFunction,
				},
				verify: {
					processBlock: sinonSandbox.stub(),
					verifyReceipt: sinonSandbox.stub(),
				},
				chain: {
					deleteLastBlock: sinonSandbox.stub(),
				},
			};

			modulesBlocksStub.verify.processBlock
				.withArgs(sinonSandbox.match({ id: 'ERR' }, true, true))
				.callsArgWith(3, 'processBlock block Error Stub', null)
				.withArgs(sinonSandbox.match(dummyBlock, true, true))
				.callsArgWith(3, null, true);

			var modulesDelegatesStub = {
				fork: sinonSandbox.stub(),
				validateBlockSlotAgainstPreviousRound: sinonSandbox.stub(),
				validateBlockSlot: sinonSandbox.stub(),
			};

			var modulesLoaderStub = sinonSandbox.stub();
			var modulesRoundsStub = sinonSandbox.stub();
			var modulesTransactionsStub = sinonSandbox.stub();
			var modulesTransportStub = sinonSandbox.stub();
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
			done();
		});

		it('should return error when block is not valid', done => {
			__private.receiveBlock({ id: 'ERR' }, (err, cb) => {
				expect(err).to.equal('processBlock block Error Stub');
				expect(cb).to.be.null;
				done();
			});
		});

		it('should return cb when block is valid', done => {
			__private.receiveBlock(dummyBlock, (err, cb) => {
				expect(err).to.be.null;
				expect(cb).to.be.true;
				expect(loggerStub.info.args[0]).to.contains(
					'Received new block id: 1 height: 1 round: 1 slot: 4128723 reward: 100'
				);
				done();
			});
		});
	});

	describe('__private.receiveForkOne', () => {
		describe('Last block stands', () => {
			beforeEach(done => {
				loggerStub.info.reset();
				done();
			});

			afterEach(done => {
				expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				);
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

			it('should return when timestamps are the and block.id > lastBlock.id', done => {
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
				done();
			});

			afterEach(done => {
				expect(loggerStub.info.args[0][0]).to.equal(
					'Last block and parent loses'
				);
				expect(
					modules.delegates.fork.calledWithExactly(sinonSandbox.match.object, 1)
				);
				done();
			});

			it('should throw error when objectNormalize fails', done => {
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
				modules.delegates.validateBlockSlot.callsArgWith(
					1,
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

			it('should return error when verifyReceipt fails', done => {
				modules.delegates.validateBlockSlot.callsArgWith(1, null, true);
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

			it('should return error when deleteLastBlock fails on first call', done => {
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

			it('should return error when deleteLastBlock fails on second call', done => {
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
});
