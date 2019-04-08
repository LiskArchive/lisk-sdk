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
const application = require('../../../../common/application');

const { ACTIVE_DELEGATES } = __testContext.config.constants;

describe('loader', () => {
	let library;
	let __private;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_unit_module_loader' } },
			(err, scope) => {
				library = scope;
				__private = library.rewiredModules.loader.__get__('__private');
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

	describe('__private.syncTrigger', () => {
		let turnOn;
		let loggerStub;
		let channelStub;
		let restoreLogger;
		let restoreChannel;

		beforeEach(async () => {
			loggerStub = {
				trace: sinonSandbox.stub(),
			};
			channelStub = {
				publish: sinonSandbox.stub(),
			};
			restoreLogger = library.rewiredModules.loader.__set__(
				'library.logger',
				loggerStub
			);
			restoreChannel = library.rewiredModules.loader.__set__(
				'library.channel',
				channelStub
			);
			__private.syncTrigger(turnOn);
		});

		afterEach(async () => {
			restoreLogger();
			restoreChannel();
		});

		describe('if turnOn === false and __private.syncIntervalId !== null', () => {
			const originalSyncIntervalId = 3;
			let restoreSyncIntervalId;

			beforeEach(async () => {
				turnOn = false;
				restoreSyncIntervalId = library.rewiredModules.loader.__set__(
					'__private.syncIntervalId',
					originalSyncIntervalId
				);
				__private.syncTrigger(turnOn);
			});

			afterEach(async () => {
				restoreSyncIntervalId();
			});

			it('should call logger.trace with "Clearing sync interval"', async () => {
				expect(loggerStub.trace).to.be.calledWith('Clearing sync interval');
			});

			it('should assign null to __private.syncIntervalId', async () => {
				expect(__private.syncIntervalId).to.be.null;
			});
		});

		describe('if turnOn === true and __private.syncInternalId is null', () => {
			let restoreSyncIntervalId;
			let lastBlockGetStub;
			const expectedBlockHeight = 1;

			beforeEach(async () => {
				turnOn = true;
				restoreSyncIntervalId = library.rewiredModules.loader.__set__(
					'__private.syncIntervalId',
					null
				);
				lastBlockGetStub = sinonSandbox
					.stub(library.modules.blocks.lastBlock, 'get')
					.returns({ height: expectedBlockHeight });
				__private.syncTrigger(turnOn);
			});

			afterEach(async () => {
				restoreSyncIntervalId();
				lastBlockGetStub.restore();
			});

			it('should call logger.trace with "Setting sync interval"', async () => {
				expect(loggerStub.trace).to.be.calledWith('Setting sync interval');
			});

			it('should call library.channel.publish with "chain:loader:sync"', async () => {
				expect(channelStub.publish).to.be.calledWith('chain:loader:sync', {
					blocks: __private.blocksToSync,
					height: expectedBlockHeight,
				});
			});
		});
	});

	describe('__private.createSnapshot', () => {
		let __privateVar;
		let libraryVar;
		let validScope;
		let loggerStub;
		let loadBlocksOffsetStub;
		let resetMemTablesStub;
		let deleteStub;
		let RewiredLoader;

		beforeEach(done => {
			resetMemTablesStub = sinonSandbox.stub().callsArgWith(0, null, true);
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
							Block: {
								delete: deleteStub,
							},
						},
					},
				},
				channel: {
					publish: sinonSandbox.stub(),
				},
				schema: sinonSandbox.stub(),
				sequence: sinonSandbox.stub(),
				bus: { message: sinonSandbox.stub() },
				genesisBlock: sinonSandbox.stub(),
				balancesSequence: sinonSandbox.stub(),
				logic: {
					transaction: sinonSandbox.stub(),
					account: { resetMemTables: resetMemTablesStub },
					peers: sinonSandbox.stub(),
				},
				config: {
					loading: {
						loadPerIteration: 1000,
						snapshotRound: 1,
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
			RewiredLoader = rewire(
				'../../../../../../src/modules/chain/submodules/loader'
			);
			__privateVar = RewiredLoader.__get__('__private');
			RewiredLoader.__set__('__private.loadBlockChain', sinonSandbox.stub());
			new RewiredLoader((__err, __loader) => {
				libraryVar = RewiredLoader.__get__('library');
				__loader.onBind(bindingsStub);
				done();
			}, validScope);
		});

		it('should throw an error when called with height below active delegates count', done => {
			try {
				__privateVar.createSnapshot(ACTIVE_DELEGATES - 1);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to create snapshot, blockchain should contain at least one round of blocks'
				);
				done();
			}
		});

		it('should throw an error when called with snapshotRound = string', done => {
			try {
				libraryVar.config.loading.snapshotRound = 'type string = invalid';

				__privateVar.createSnapshot(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to create snapshot, "--snapshot" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should throw an error when called with snapshotRound = boolean', done => {
			try {
				libraryVar.config.loading.snapshotRound = true;

				__privateVar.createSnapshot(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to create snapshot, "--snapshot" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should throw an error when called with snapshotRound = integer as string', done => {
			try {
				libraryVar.config.loading.snapshotRound = '2';

				__privateVar.createSnapshot(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to create snapshot, "--snapshot" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should throw an error when called with snapshotRound = ""', done => {
			try {
				libraryVar.config.loading.snapshotRound = '';

				__privateVar.createSnapshot(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to create snapshot, "--snapshot" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should throw an error when called with snapshotRound = undefined', done => {
			try {
				libraryVar.config.loading.snapshotRound = undefined;

				__privateVar.createSnapshot(ACTIVE_DELEGATES);
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.eql(
					'Unable to create snapshot, "--snapshot" parameter should be an integer equal to or greater than zero'
				);
				done();
			}
		});

		it('should emit an event with proper error when resetMemTables fails', done => {
			resetMemTablesStub.callsArgWith(0, 'resetMemTables#ERR', true);
			__privateVar.snapshotFinished = err => {
				expect(err).to.eql('resetMemTables#ERR');
				done();
			};

			__privateVar.createSnapshot(ACTIVE_DELEGATES);
		});

		it('should emit an event with proper error when loadBlocksOffset fails', done => {
			loadBlocksOffsetStub.callsArgWith(2, 'loadBlocksOffsetStub#ERR', true);
			__privateVar.snapshotFinished = err => {
				expect(err).to.eql('loadBlocksOffsetStub#ERR');
				done();
			};

			__privateVar.createSnapshot(ACTIVE_DELEGATES);
		});

		it('should emit an event with proper error when storage.entities.Block.delete fails', done => {
			deleteStub.rejects('beginStub#ERR');

			__privateVar.snapshotFinished = err => {
				expect(err.name).to.eql('beginStub#ERR');
				done();
			};

			__privateVar.createSnapshot(ACTIVE_DELEGATES);
		});

		describe('should emit an event with no error', () => {
			let blocksAvailable;
			let deleteBlocksAfterHeight;
			let snapshotRound;

			afterEach(() => sinonSandbox.restore());

			it('and snapshot to end of round 1 when snapshotRound = 1 and 101 blocks available', done => {
				snapshotRound = 1;
				blocksAvailable = ACTIVE_DELEGATES;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * snapshotRound,
				};

				libraryVar.config.loading.snapshotRound = 1;
				__privateVar.snapshotFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 1 when snapshotRound = 1 and 202 blocks available', done => {
				snapshotRound = 1;
				blocksAvailable = ACTIVE_DELEGATES * 2;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * snapshotRound,
				};

				libraryVar.config.loading.snapshotRound = snapshotRound;

				__privateVar.snapshotFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 2 when snapshotRound = 2 and 202 blocks available', done => {
				snapshotRound = 2;
				blocksAvailable = ACTIVE_DELEGATES * 2;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * snapshotRound,
				};

				libraryVar.config.loading.snapshotRound = snapshotRound;
				__privateVar.snapshotFinished = err => {
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

				__privateVar.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 2 when snapshotRound = 2 and 303 blocks available', done => {
				snapshotRound = 2;
				blocksAvailable = ACTIVE_DELEGATES * 3;
				deleteBlocksAfterHeight = {
					height_gt: ACTIVE_DELEGATES * snapshotRound,
				};

				libraryVar.config.loading.snapshotRound = snapshotRound;
				__privateVar.snapshotFinished = err => {
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

				__privateVar.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 1 when snapshotRound = 2 and 101 blocks available', done => {
				snapshotRound = 2;
				blocksAvailable = ACTIVE_DELEGATES;
				deleteBlocksAfterHeight = { height_gt: ACTIVE_DELEGATES };

				library.config.loading.snapshotRound = snapshotRound;
				__privateVar.snapshotFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteStub).to.be.calledWith(deleteBlocksAfterHeight);
					done();
				};

				__privateVar.createSnapshot(blocksAvailable);
			});
		});
	});
});
