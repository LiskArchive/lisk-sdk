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
	var blocksProcessModule;
	var dbStub;
	var loggerStub;

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

			peersStub = {
				create: function(input) {
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

		it('should call library.logger.trace with "Blocks->Process: Submodule initialized."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Process: Submodule initialized.'
			);
		});
	});
});
