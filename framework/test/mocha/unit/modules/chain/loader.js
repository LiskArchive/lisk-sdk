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
const application = require('../../../common/application');

const { ACTIVE_DELEGATES } = __testContext.config.constants;

describe('loader', () => {
	let library;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_unit_module_loader' } },
			(err, scope) => {
				library = scope;
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('__private.rebuildAccounts', () => {
		let __privateVar;
		let libraryVar;
		let validScope;
		let loggerStub;
		let loadBlocksOffsetStub;
		let resetMemTablesStub;
		let deleteStub;
		let RewiredLoader;

		beforeEach(async () => {
			resetMemTablesStub = sinonSandbox.stub().resolves();
			loadBlocksOffsetStub = sinonSandbox.stub().callsArgWith(2, null, true);
			deleteStub = sinonSandbox.stub().resolves();

			loggerStub = {
				trace: sinonSandbox.spy(),
				info: sinonSandbox.spy(),
				error: sinonSandbox.spy(),
				warn: sinonSandbox.spy(),
				debug: sinonSandbox.spy(),
			};

			validScope = {
				components: {
					logger: loggerStub,
					storage: {
						entities: {
							Account: {
								resetMemTables: resetMemTablesStub,
							},
							Block: {
								delete: deleteStub,
							},
						},
					},
				},
				channel: {
					publish: sinonSandbox.stub(),
					once: sinonSandbox.stub(),
				},
				schema: sinonSandbox.stub(),
				sequence: sinonSandbox.stub(),
				bus: { message: sinonSandbox.stub() },
				genesisBlock: sinonSandbox.stub(),
				balancesSequence: sinonSandbox.stub(),
				logic: {
					peers: sinonSandbox.stub(),
				},
				config: {
					loading: {
						loadPerIteration: 1000,
						rebuildUpToRound: 1,
					},
					syncing: {
						active: true,
					},
				},
			};

			const bindingsStub = {
				applicationState: sinonSandbox.stub(),
				components: {
					cache: sinonSandbox.stub(),
				},
				modules: {
					transactions: sinonSandbox.stub(),
					blocks: { process: { loadBlocksOffset: loadBlocksOffsetStub } },
					peers: sinonSandbox.stub(),
					rounds: sinonSandbox.stub(),
					transport: sinonSandbox.stub(),
					multisignatures: sinonSandbox.stub(),
				},
				swagger: { definitions: null },
			};
			RewiredLoader = rewire('../../../../../src/modules/chain/loader');
			__privateVar = RewiredLoader.__get__('__private');
			const __loader = new RewiredLoader(validScope);
			sinonSandbox.stub(__loader, 'loadBlockChain');
			libraryVar = RewiredLoader.__get__('library');
			__loader.onBind(bindingsStub);
		});

		it('should throw an error when called with height below active delegates count', done => {
			try {
				__privateVar.rebuildAccounts(ACTIVE_DELEGATES - 1);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, blockchain should contain at least one round of blocks'
				);
				done();
			}
		});

		it('should throw an error when called with rebuildUpToRound = string', done => {
			try {
				libraryVar.config.loading.rebuildUpToRound = 'type string = invalid';

				__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should throw an error when called with rebuildUpToRound = boolean', done => {
			try {
				libraryVar.config.loading.rebuildUpToRound = true;

				__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should not throw an error when called with rebuildUpToRound = integer as string', done => {
			libraryVar.config.loading.rebuildUpToRound = '2';
			__privateVar.rebuildFinished = err => {
				expect(err).to.not.exist;
				done();
			};

			__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
		});

		it('should throw an error when called with rebuildUpToRound = ""', done => {
			try {
				libraryVar.config.loading.rebuildUpToRound = '';

				__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should throw an error when called with rebuildUpToRound = undefined', done => {
			try {
				libraryVar.config.loading.rebuildUpToRound = undefined;

				__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should emit an event with proper error when resetMemTables fails', done => {
			resetMemTablesStub.rejects();
			__privateVar.rebuildFinished = err => {
				expect(err.message).to.eql('Account#resetMemTables error');
				done();
			};

			__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
		});

		it('should emit an event with proper error when loadBlocksOffset fails', done => {
			loadBlocksOffsetStub.callsArgWith(2, 'loadBlocksOffsetStub#ERR', true);
			__privateVar.rebuildFinished = err => {
				expect(err).to.eql('loadBlocksOffsetStub#ERR');
				done();
			};

			__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
		});

		it('should emit an event with proper error when storage.entities.Block.delete fails', done => {
			deleteStub.rejects('beginStub#ERR');

			__privateVar.rebuildFinished = err => {
				expect(err.name).to.eql('beginStub#ERR');
				done();
			};

			__privateVar.rebuildAccounts(ACTIVE_DELEGATES);
		});

		describe('should emit an event with no error', () => {
			let blocksAvailable;
			let deleteBlocksAfterHeight;
			let rebuildUpToRound;

			afterEach(() => sinonSandbox.restore());

			it('and rebuild to end of round 1 when rebuildUpToRound = 1 and 101 blocks available', done => {
				rebuildUpToRound = 1;
				blocksAvailable = ACTIVE_DELEGATES;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * rebuildUpToRound,
				};

				libraryVar.config.loading.rebuildUpToRound = 1;
				__privateVar.rebuildFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.rebuildAccounts(blocksAvailable);
			});

			it('and rebuild to end of round 1 when rebuildUpToRound = 1 and 202 blocks available', done => {
				rebuildUpToRound = 1;
				blocksAvailable = ACTIVE_DELEGATES * 2;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * rebuildUpToRound,
				};

				libraryVar.config.loading.rebuildUpToRound = rebuildUpToRound;

				__privateVar.rebuildFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.rebuildAccounts(blocksAvailable);
			});

			it('and rebuild to end of round 2 when rebuildUpToRound = 2 and 202 blocks available', done => {
				rebuildUpToRound = 2;
				blocksAvailable = ACTIVE_DELEGATES * 2;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * rebuildUpToRound,
				};

				libraryVar.config.loading.rebuildUpToRound = rebuildUpToRound;
				__privateVar.rebuildFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledTwice;
					expect(loadBlocksOffsetStub.firstCall).to.be.calledWith(
						ACTIVE_DELEGATES,
						1
					);
					expect(loadBlocksOffsetStub.secondCall).to.be.calledWith(
						ACTIVE_DELEGATES,
						1 + ACTIVE_DELEGATES
					);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.rebuildAccounts(blocksAvailable);
			});

			it('and rebuild to end of round 2 when rebuildUpToRound = 2 and 303 blocks available', done => {
				rebuildUpToRound = 2;
				blocksAvailable = ACTIVE_DELEGATES * 3;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * rebuildUpToRound,
				};

				libraryVar.config.loading.rebuildUpToRound = rebuildUpToRound;
				__privateVar.rebuildFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledTwice;
					expect(loadBlocksOffsetStub.firstCall).to.be.calledWith(
						ACTIVE_DELEGATES,
						1
					);
					expect(loadBlocksOffsetStub.secondCall).to.be.calledWith(
						ACTIVE_DELEGATES,
						1 + ACTIVE_DELEGATES
					);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.rebuildAccounts(blocksAvailable);
			});

			it('and rebuild to end of round 1 when rebuildUpToRound = 2 and 101 blocks available', done => {
				rebuildUpToRound = 2;
				blocksAvailable = ACTIVE_DELEGATES;
				deleteBlocksAfterHeight = { height_gt: ACTIVE_DELEGATES };

				library.config.loading.rebuildUpToRound = rebuildUpToRound;
				__privateVar.rebuildFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.rebuildAccounts(blocksAvailable);
			});
		});
	});
});
