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
var modulesLoader = require('../../common/modules_loader');
var swaggerHelper = require('../../../helpers/swagger');

const { ACTIVE_DELEGATES } = __testContext.config.constants;

describe('loader', () => {
	var loaderModule;
	var blocksModuleMock;
	var loadBlockChainStub;

	before(done => {
		var loaderModuleRewired = rewire('../../../modules/loader');
		blocksModuleMock = {
			lastBlock: {
				get() {},
			},
		};

		swaggerHelper.getResolvedSwaggerSpec().then(resolvedSwaggerSpec => {
			modulesLoader.initModule(
				loaderModuleRewired,
				_.assign({}, modulesLoader.scope, {
					logic: {
						transaction: sinonSandbox.mock(),
						account: sinonSandbox.mock(),
						peers: {
							create: sinonSandbox.stub().returnsArg(0),
						},
					},
				}),
				(err, __loaderModule) => {
					if (err) {
						return done(err);
					}
					loaderModule = __loaderModule;
					loadBlockChainStub = sinonSandbox.stub(
						loaderModuleRewired.__get__('__private'),
						'loadBlockChain'
					);
					loaderModule.onBind({
						blocks: blocksModuleMock,
						swagger: {
							definitions: resolvedSwaggerSpec.definitions,
						},
					});
					done();
				}
			);
		});
	});

	after(() => {
		return loadBlockChainStub.restore();
	});

	describe('findGoodPeers', () => {
		var HEIGHT_TWO = 2;
		var getLastBlockStub;

		beforeEach(done => {
			getLastBlockStub = sinonSandbox
				.stub(blocksModuleMock.lastBlock, 'get')
				.returns({ height: HEIGHT_TWO });
			done();
		});

		afterEach(() => {
			return getLastBlockStub.restore();
		});

		it('should return peers list sorted by height', () => {
			var peers = [
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

			var goodPeers = loaderModule.findGoodPeers(peers);
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
});
