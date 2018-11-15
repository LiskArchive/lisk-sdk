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

const rewire = require('rewire');
const application = require('../../common/application');

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

	describe('findGoodPeers', () => {
		const HEIGHT_TWO = 2;
		let getLastBlockStub;

		beforeEach(done => {
			getLastBlockStub = sinonSandbox
				.stub(library.modules.blocks.lastBlock, 'get')
				.returns({ height: HEIGHT_TWO });
			done();
		});

		afterEach(() => {
			return getLastBlockStub.restore();
		});

		it('should return peers list sorted by height', () => {
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
					(a, b) => {
						return (
							a.ip === b.ip && a.wsPort === b.wsPort && a.height === b.height
						);
					}
				)
			).to.be.ok;
		});
	});

	describe('__private.createSnapshot', () => {
		let __private;
		let library;
		let validScope;
		let loggerStub;
		let loadBlocksOffsetStub;
		let resetMemTablesStub;
		let deleteBlocksAfterHeightStub;
		let rewiredLoader;

		beforeEach(done => {
			resetMemTablesStub = sinonSandbox.stub().callsArgWith(0, null, true);
			loadBlocksOffsetStub = sinonSandbox.stub().callsArgWith(2, null, true);
			deleteBlocksAfterHeightStub = sinonSandbox.stub().resolves();

			loggerStub = {
				trace: sinonSandbox.spy(),
				info: sinonSandbox.spy(),
				error: sinonSandbox.spy(),
				warn: sinonSandbox.spy(),
				debug: sinonSandbox.spy(),
			};

			validScope = {
				logger: loggerStub,
				db: {
					blocks: { deleteBlocksAfterHeight: deleteBlocksAfterHeightStub },
				},
				network: sinonSandbox.stub(),
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

			const modulesStub = {
				transactions: sinonSandbox.stub(),
				blocks: { process: { loadBlocksOffset: loadBlocksOffsetStub } },
				peers: sinonSandbox.stub(),
				rounds: sinonSandbox.stub(),
				transport: sinonSandbox.stub(),
				multisignatures: sinonSandbox.stub(),
				system: sinonSandbox.stub(),
				swagger: { definitions: null },
			};

			rewiredLoader = rewire('../../../modules/loader.js');
			__private = rewiredLoader.__get__('__private');
			rewiredLoader.__set__('__private.loadBlockChain', sinonSandbox.stub());
			new rewiredLoader((err, __loader) => {
				library = rewiredLoader.__get__('library');
				__loader.onBind(modulesStub);
				done();
			}, validScope);
		});

		it('should throw an error when called with height below active delegates count', done => {
			try {
				__private.createSnapshot(ACTIVE_DELEGATES - 1);
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
			__private.snapshotFinished = err => {
				expect(err).to.eql('resetMemTables#ERR');
				done();
			};

			__private.createSnapshot(ACTIVE_DELEGATES);
		});

		it('should emit an event with proper error when loadBlocksOffset fails', done => {
			loadBlocksOffsetStub.callsArgWith(2, 'loadBlocksOffsetStub#ERR', true);
			__private.snapshotFinished = err => {
				expect(err).to.eql('loadBlocksOffsetStub#ERR');
				done();
			};

			__private.createSnapshot(ACTIVE_DELEGATES);
		});

		it('should emit an event with proper error when deleteBlocksAfterHeight fails', done => {
			deleteBlocksAfterHeightStub.rejects('deleteBlocksAfterHeightStub#ERR');
			__private.snapshotFinished = err => {
				expect(err.name).to.eql('deleteBlocksAfterHeightStub#ERR');
				done();
			};

			__private.createSnapshot(ACTIVE_DELEGATES);
		});

		describe('should emit an event with no error', () => {
			let blocksAvailable;
			let deleteBlocksAfterHeight;
			let snapshotRound;

			it('and snapshot to end of round 1 when snapshotRound = 1 and 101 blocks available', done => {
				snapshotRound = 1;
				blocksAvailable = ACTIVE_DELEGATES;
				deleteBlocksAfterHeight = ACTIVE_DELEGATES * snapshotRound;

				library.config.loading.snapshotRound = 1;
				__private.snapshotFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteBlocksAfterHeightStub).to.be.calledWith(
						deleteBlocksAfterHeight
					);
					done();
				};

				__private.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 1 when snapshotRound = 1 and 202 blocks available', done => {
				snapshotRound = 1;
				blocksAvailable = ACTIVE_DELEGATES * 2;
				deleteBlocksAfterHeight = ACTIVE_DELEGATES * snapshotRound;

				library.config.loading.snapshotRound = snapshotRound;
				__private.snapshotFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteBlocksAfterHeightStub).to.be.calledWith(
						deleteBlocksAfterHeight
					);
					done();
				};

				__private.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 2 when snapshotRound = 2 and 202 blocks available', done => {
				snapshotRound = 2;
				blocksAvailable = ACTIVE_DELEGATES * 2;
				deleteBlocksAfterHeight = ACTIVE_DELEGATES * snapshotRound;

				library.config.loading.snapshotRound = snapshotRound;
				__private.snapshotFinished = err => {
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
					expect(deleteBlocksAfterHeightStub).to.be.calledWith(
						deleteBlocksAfterHeight
					);
					done();
				};

				__private.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 2 when snapshotRound = 2 and 303 blocks available', done => {
				snapshotRound = 2;
				blocksAvailable = ACTIVE_DELEGATES * 3;
				deleteBlocksAfterHeight = ACTIVE_DELEGATES * snapshotRound;

				library.config.loading.snapshotRound = snapshotRound;
				__private.snapshotFinished = err => {
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
					expect(deleteBlocksAfterHeightStub).to.be.calledWith(
						deleteBlocksAfterHeight
					);
					done();
				};

				__private.createSnapshot(blocksAvailable);
			});

			it('and snapshot to end of round 1 when snapshotRound = 2 and 101 blocks available', done => {
				snapshotRound = 2;
				blocksAvailable = ACTIVE_DELEGATES;
				deleteBlocksAfterHeight = ACTIVE_DELEGATES;

				library.config.loading.snapshotRound = snapshotRound;
				__private.snapshotFinished = err => {
					expect(err).to.not.exist;
					expect(resetMemTablesStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledOnce;
					expect(loadBlocksOffsetStub).to.be.calledWith(ACTIVE_DELEGATES, 1);
					expect(deleteBlocksAfterHeightStub).to.be.calledWith(
						deleteBlocksAfterHeight
					);
					done();
				};

				__private.createSnapshot(blocksAvailable);
			});
		});
	});

	describe('__private.loadBlocksFromNetwork', () => {
		let getRandomPeerFromNetworkStub;
		let getCommonBlockStub;
		let loadBlocksFromPeerStub;

		describe('when tries are < than 5', () => {
			describe('when loaded is false', () => {
				it('should call self.getRandomPeerFromNetwork');

				describe('when self.getRandomPeerFromNetwork fails', () => {
					it('should sum + 1 to tries');
					it('should log error "Failed to get random peer from network"');
					it('should call whilst callback');
				});

				describe('when self.getRandomPeerFromNetwork succeds', () => {
					it('should assign lastBlock');
					it('should result peer');
					it('should assign __private.blocksToSync to peer.height');
					it(
						'should log info trace containing "Looking for common block with:"'
					);
					it(
						'should call modules.blocks.process.getCommonBlock with peer and lastBlock.height'
					);

					describe('when modules.blocks.process.getCommonBlock fails', () => {
						it('should sum + 1 to tries');
						it('should log error');
						it('should call whilst callback');
					});

					describe('when modules.blocks.process.getCommonBlock succeds', () => {
						describe('when commonBlock not found', () => {
							describe('when lastBlock.height higher than genesis (1)', () => {
								it('should sum + 1 to tries');
								it(
									'should log error containning "Failed to find common block with"'
								);
								it('should call whilst callback');
							});

							describe('when lastBlock.height is genesis (1)', () => {
								it(
									'should call modules.blocks.process.loadBlocksFromPeer with peer'
								);
							});
						});

						describe('when commonBlock found', () => {
							it('should log info trace starting by "Found common block:"');
							it(
								'should call modules.blocks.process.loadBlocksFromPeer with peer'
							);

							describe('when modules.blocks.process.loadBlocksFromPeer fails', () => {
								it('should sum + 1 to tries');
								it(
									'should log error containning "Failed to load blocks from:"'
								);
								it('should call next');
							});

							describe('when modules.blocks.process.loadBlocksFromPeer succeds', () => {
								it('should result lastValidBlock');
								it(
									'should modify loaded to true if lastValidBlock and lastBlock are equal'
								);
								it(
									'should modify loaded to false if lastValidBlock and lastBlock are not equal'
								);
								it('should call whilst callback');
							});
						});
					});
				});
			});
			describe('when loaded is true', () => {
				it('should call callback with error = null');
			});
		});

		describe('when tries are >= than 5', () => {
			beforeEach(done => {
				getRandomPeerFromNetworkStub = sinonSandbox
					.stub(loader_module, 'getRandomPeerFromNetwork')
					.callsArgWith(0, 'Failed to get random peer from network');
				getCommonBlockStub = sinonSandbox.spy(
					blocks_module.process,
					'getCommonBlock'
				);
				loadBlocksFromPeerStub = sinonSandbox.spy(
					blocks_module.process,
					'loadBlocksFromPeer'
				);
				done();
			});

			afterEach(() => {
				getRandomPeerFromNetworkStub.restore();
				getCommonBlockStub.restore();
				return loadBlocksFromPeerStub.restore();
			});

			it('should call callback with error = null', () => {
				return __private.loadBlocksFromNetwork(err => {
					sinonSandbox.assert.callCount(getRandomPeerFromNetworkStub, 5);
					expect(getCommonBlockStub).to.not.be.called;
					expect(loadBlocksFromPeerStub).to.not.be.called;
					expect(err).to.be.undefined;
				});
			});
		});

		describe('when unexpected error happens', () => {
			it(
				'should call callback with error = "Failed to load blocks from network"'
			);
		});
	});

	describe('__private.getRandomPeerFromNetwork', () => {
		let listRandomConnectedStub;
		let findGoodPeersSpy;

		afterEach(() => {
			findGoodPeersSpy.restore();
			return listRandomConnectedStub.restore();
		});

		describe('when there are good peers', () => {
			const peers = [
				{
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 2,
				},
			];

			beforeEach(done => {
				listRandomConnectedStub = sinonSandbox
					.stub(library.logic.peers, 'listRandomConnected')
					.returns(peers);
				findGoodPeersSpy = sinonSandbox.spy(loader_module, 'findGoodPeers');
				done();
			});

			it('should call callback with error = null and result = random peer', () => {
				return loader_module.getRandomPeerFromNetwork((err, peer) => {
					expect(listRandomConnectedStub).to.be.calledOnce;
					expect(loader_module.findGoodPeers).to.be.calledOnce;
					expect(err).to.be.null;
					expect(peer).to.nested.include(peers[0]);
				});
			});
		});

		describe('when there are no good peers', () => {
			const peers = [
				{
					ip: '2.2.2.2',
					wsPort: '4000',
					height: 0,
				},
			];

			beforeEach(done => {
				listRandomConnectedStub = sinonSandbox
					.stub(library.logic.peers, 'listRandomConnected')
					.returns(peers);
				findGoodPeersSpy = sinonSandbox.spy(loader_module, 'findGoodPeers');
				done();
			});

			it('should call callback with error = "Failed to find enough good peers"', () => {
				return loader_module.getRandomPeerFromNetwork(err => {
					expect(listRandomConnectedStub).to.be.calledOnce;
					expect(loader_module.findGoodPeers).to.be.calledOnce;
					expect(err).to.equal('Failed to find enough good peers');
				});
			});
		});
	});
});
