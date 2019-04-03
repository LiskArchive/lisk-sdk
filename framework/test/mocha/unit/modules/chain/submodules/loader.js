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
	let loader_module;
	let blocks_module;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_unit_module_loader' } },
			(err, scope) => {
				library = scope;
				loader_module = library.modules.loader;
				__private = library.rewiredModules.loader.__get__('__private');
				blocks_module = library.modules.blocks;
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

	describe('findGoodPeers', () => {
		const HEIGHT_TWO = 2;
		let getLastBlockStub;

		beforeEach(done => {
			getLastBlockStub = sinonSandbox
				.stub(library.modules.blocks.lastBlock, 'get')
				.returns({ height: HEIGHT_TWO });
			done();
		});

		afterEach(() => getLastBlockStub.restore());

		it('should return peers list sorted by height', async () => {
			const peers = [
				{
					ip: '1.1.1.1',
					wsPort: '4000',
					height: 1,
				},
				{
					ip: '4.4.4.4',
					wsPort: '4000',
					height: 4,
				},
				{
					ip: '3.3.3.3',
					wsPort: '4000',
					height: 3,
				},
				{
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2,
				},
			];

			const goodPeers = loader_module.findGoodPeers(peers);
			expect(goodPeers)
				.to.have.property('height')
				.equal(HEIGHT_TWO); // Good peers - above my height (above and equal 2)
			expect(goodPeers)
				.to.have.property('peers')
				.to.be.an('array')
				.to.have.lengthOf(3);
			return expect(
				_.isEqualWith(
					goodPeers.peers,
					[
						{
							ip: '4.4.4.4',
							wsPort: '4000',
							height: 4,
						},
						{
							ip: '3.3.3.3',
							wsPort: '4000',
							height: 3,
						},
						{
							ip: '2.2.2.2',
							wsPort: '4000',
							height: 2,
						},
					],
					(a, b) =>
						a.ip === b.ip && a.wsPort === b.wsPort && a.height === b.height
				)
			).to.be.ok;
		});
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

	describe('__private.loadBlocksFromNetwork', () => {
		let getRandomPeerFromNetworkStub;
		let getCommonBlockStub;
		let loadBlocksFromPeerStub;
		let getLastBlockStub;

		beforeEach(done => {
			getRandomPeerFromNetworkStub = sinonSandbox.stub(
				loader_module,
				'getRandomPeerFromNetwork'
			);
			getLastBlockStub = sinonSandbox.stub(
				library.modules.blocks.lastBlock,
				'get'
			);
			getCommonBlockStub = sinonSandbox.stub(
				blocks_module.process,
				'getCommonBlock'
			);
			loadBlocksFromPeerStub = sinonSandbox.stub(
				blocks_module.process,
				'loadBlocksFromPeer'
			);
			done();
		});

		afterEach(() => sinonSandbox.restore());

		describe('when getRandomPeerFromNetwork fails', () => {
			it('should call callback with error = null after 5 tries', async () => {
				getRandomPeerFromNetworkStub.callsArgWith(
					0,
					'Failed to get random peer from network'
				);
				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 5);
					expect(getLastBlockStub).to.not.be.called;
					expect(getCommonBlockStub).to.not.be.called;
					expect(loadBlocksFromPeerStub).to.not.be.called;
					expect(err).to.be.undefined;
				});
			});
		});

		describe('when getCommonBlock fails', () => {
			it('should call callback with error = null after 5 tries', async () => {
				const peer = {
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2,
					string: '2.2.2.2:4000',
				};

				getRandomPeerFromNetworkStub.callsArgWith(0, undefined, peer);
				getLastBlockStub.returns({ height: 1 });
				getCommonBlockStub.callsArgWith(2, 'Error in getCommonBlock');

				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 5);
					sinonSandbox.assert.callCount(getLastBlockStub, 5);
					expect(__private.blocksToSync).to.equal(peer.height);
					sinonSandbox.assert.callCount(getCommonBlockStub, 5);
					expect(loadBlocksFromPeerStub).to.not.be.called;
					expect(err).to.be.undefined;
				});
			});
		});

		describe('when no common block found', () => {
			it('should call callback with error = null after 5 tries', async () => {
				const peer = {
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2,
					string: '2.2.2.2:4000',
				};

				getRandomPeerFromNetworkStub.callsArgWith(0, undefined, peer);
				getLastBlockStub.returns({
					height: 4,
				});
				getCommonBlockStub.callsArgWith(2, undefined, undefined);

				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 5);
					sinonSandbox.assert.callCount(getLastBlockStub, 5);
					expect(__private.blocksToSync).to.equal(peer.height);
					sinonSandbox.assert.callCount(getCommonBlockStub, 5);
					expect(loadBlocksFromPeerStub).to.not.be.called;
					expect(err).to.be.undefined;
				});
			});
		});

		describe('when height is 0 (Genesis block)', () => {
			it('should not call getCommonBlock', async () => {
				const peer = {
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2,
					string: '2.2.2.2:4000',
				};

				getRandomPeerFromNetworkStub
					.onFirstCall()
					.callsArgWith(0, undefined, peer);
				getRandomPeerFromNetworkStub.callsArgWith(
					0,
					'Error after first called'
				);
				getLastBlockStub.returns({
					height: 1,
				});
				loadBlocksFromPeerStub.callsArgWith(1, undefined, { id: 1 });

				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 6);
					expect(getLastBlockStub).to.be.calledOnce;
					expect(__private.blocksToSync).to.equal(peer.height);
					expect(getCommonBlockStub).to.be.not.called;
					expect(loadBlocksFromPeerStub).to.be.calledOnce;
					expect(err).to.be.undefined;
				});
			});
		});

		describe('when loadBlocksFromPeerStub fails', () => {
			it('should call callback with error = null after 5 tries', async () => {
				const peer = {
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 3,
					string: '2.2.2.2:4000',
				};

				getRandomPeerFromNetworkStub.callsArgWith(0, undefined, peer);
				getLastBlockStub.returns({
					height: 2,
				});
				getCommonBlockStub.callsArgWith(2, undefined, 1);
				loadBlocksFromPeerStub.callsArgWith(
					1,
					'Failed to load blocks with peer'
				);

				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 5);
					sinonSandbox.assert.callCount(getLastBlockStub, 5);
					expect(__private.blocksToSync).to.equal(peer.height);
					sinonSandbox.assert.callCount(getCommonBlockStub, 5);
					sinonSandbox.assert.callCount(loadBlocksFromPeerStub, 5);
					expect(err).to.be.undefined;
				});
			});
		});

		describe('when getCommonBlock starts failing after the first call', () => {
			it('should call callback with error = null after 6 tries', async () => {
				const peer = {
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 3,
					string: '2.2.2.2:4000',
				};

				getRandomPeerFromNetworkStub
					.onFirstCall()
					.callsArgWith(0, undefined, peer);
				getRandomPeerFromNetworkStub.callsArgWith(
					0,
					'Error after first called'
				);
				getLastBlockStub.returns({
					height: 2,
				});
				getCommonBlockStub.callsArgWith(2, undefined, 1);
				loadBlocksFromPeerStub.callsArgWith(1, undefined, { id: 1 });

				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 6);
					expect(getLastBlockStub).to.be.calledOnce;
					expect(__private.blocksToSync).to.equal(peer.height);
					expect(getCommonBlockStub).to.be.calledOnce;
					expect(loadBlocksFromPeerStub).to.be.calledOnce;
					expect(err).to.be.undefined;
				});
			});
		});

		describe('when a batch of blocks is sucessfully loaded', () => {
			it('should reset counter of failed attemps to load', async () => {
				const peer = {
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 3,
					string: '2.2.2.2:4000',
				};

				getRandomPeerFromNetworkStub
					.onFirstCall()
					.callsArgWith(0, 'Error after first called');
				getRandomPeerFromNetworkStub
					.onSecondCall()
					.callsArgWith(0, undefined, peer);
				getRandomPeerFromNetworkStub.callsArgWith(
					0,
					'Error after first called'
				);
				getLastBlockStub.returns({
					height: 2,
				});
				getCommonBlockStub.callsArgWith(2, undefined, 1);
				loadBlocksFromPeerStub.callsArgWith(1, undefined, { id: 1 });

				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 7);
					expect(getLastBlockStub).to.be.calledOnce;
					expect(__private.blocksToSync).to.equal(peer.height);
					expect(getCommonBlockStub).to.be.calledOnce;
					expect(loadBlocksFromPeerStub).to.be.calledOnce;
					expect(err).to.be.undefined;
				});
			});
		});
	});

	describe('__private.getRandomPeerFromNetwork', () => {
		let listRandomConnectedStub;
		let findGoodPeersSpy;

		beforeEach(done => {
			listRandomConnectedStub = sinonSandbox.stub(
				library.logic.peers,
				'listRandomConnected'
			);
			findGoodPeersSpy = sinonSandbox.spy(loader_module, 'findGoodPeers');
			done();
		});

		afterEach(() => sinonSandbox.restore());

		describe('when there are good peers', () => {
			it('should call callback with error = null and result = random peer', async () => {
				const peers = [
					{
						ip: '2.2.2.2',
						wsPort: '4000',
						height: 2,
					},
				];
				listRandomConnectedStub.returns(peers);

				return loader_module.getRandomPeerFromNetwork((err, peer) => {
					expect(listRandomConnectedStub).to.be.calledOnce;
					expect(findGoodPeersSpy).to.be.calledOnce;
					expect(err).to.be.null;
					expect(peer).to.nested.include(peers[0]);
				});
			});
		});

		describe('when there are no good peers', () => {
			it('should call callback with error = "Failed to find enough good peers"', async () => {
				const peers = [
					{
						ip: '2.2.2.2',
						wsPort: '4000',
						height: 0,
					},
				];

				listRandomConnectedStub.returns(peers);

				return loader_module.getRandomPeerFromNetwork(err => {
					expect(listRandomConnectedStub).to.be.calledOnce;
					expect(findGoodPeersSpy).to.be.calledOnce;
					expect(err).to.equal('Failed to find enough good peers');
				});
			});
		});
	});
});
