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

const sinon = require('sinon');
const rewire = require('rewire');
const randomstring = require('randomstring');
const prefixedPeer = require('../../../../../fixtures/peers')
	.randomNormalizedPeer;
const Peer = require('../../../../../../src/modules/chain/logic/peer');
const generateRandomActivePeer = require('../../../../../fixtures/peers')
	.generateRandomActivePeer;
const jobsQueue = require('../../../../../../src/modules/chain/helpers/jobs_queue');
const generateMatchedAndUnmatchedBroadhashes = require('../common/helpers/peers')
	.generateMatchedAndUnmatchedBroadhashes;
const modulesLoader = require('../../../../../common/modules_loader');
const random = require('../../../../../common/utils/random');
const swagerHelper = require('../../../../../../src/modules/chain/helpers/swagger');

const { MAX_PEERS } = __testContext.config.constants;

describe('peers', async () => {
	let storageMock;
	let peers;
	let PeersRewired;
	let bindings;
	let __private;

	let peersLogicMock;
	let systemComponentMock;
	let transportModuleMock;

	const NONCE = randomstring.generate(16);

	before(done => {
		storageMock = {
			entities: {
				Peer: {
					get: sinonSandbox.stub().resolves(),
				},
			},
		};

		PeersRewired = rewire('../../../../../../src/modules/chain/modules/peers');
		__private = PeersRewired.__get__('__private');

		peersLogicMock = {
			create: sinonSandbox.spy(),
			exists: sinonSandbox.stub(),
			get: sinonSandbox.stub(),
			list: sinonSandbox.stub(),
			upsert: sinonSandbox.stub(),
			remove: sinonSandbox.stub(),
		};
		systemComponentMock = {
			headers: {},
		};
		transportModuleMock = {};
		bindings = {
			modules: {
				transport: transportModuleMock,
			},

			components: {
				system: systemComponentMock,
			},
		};

		swagerHelper.getResolvedSwaggerSpec().then(resolvedSpec => {
			bindings.swagger = {
				definitions: resolvedSpec.definitions,
			};
		});

		modulesLoader.scope.nonce = NONCE;

		modulesLoader.scope.storage = {
			entities: {
				Peer: {
					get: sinonSandbox.stub().resolves([prefixedPeer]),
				},
			},
		};

		new PeersRewired((err, peersModule) => {
			peers = peersModule;
			peers.onBind(bindings);
			done();
		}, _.assign({}, modulesLoader.scope, { logic: { peers: peersLogicMock }, storage: storageMock }));
	});

	describe('list', async () => {
		let listResult;
		let validOptions;
		let randomPeers;

		before(done => {
			validOptions = {};
			// Set TEST variable in case public ip address gets generated
			process.env.NODE_ENV = 'TEST';
			done();
		});

		after(done => {
			process.env.NODE_ENV = '';
			done();
		});

		beforeEach(done => {
			peers.list(validOptions, (err, peersResult) => {
				listResult = peersResult;
				done();
			});
		});

		describe('when logic.peers.list returns no records', async () => {
			before(done => {
				systemComponentMock.getBroadhash = sinonSandbox.stub().returns();
				peersLogicMock.list = sinonSandbox.stub().returns([]);
				done();
			});

			it('should return an empty array', async () =>
				expect(listResult).to.be.an('array').and.to.be.empty);
		});

		describe('when logic.peers.list returns 1000 random connected peers', async () => {
			before(done => {
				randomPeers = _.range(1000).map(() => generateRandomActivePeer());
				peersLogicMock.list = sinonSandbox.stub().returns(randomPeers);
				done();
			});

			it('should return all 1000 peers', async () =>
				expect(listResult)
					.be.an('array')
					.and.have.lengthOf(100));

			describe('options.limit', async () => {
				describe('when options.limit < 1000', async () => {
					let validLimit;

					before(done => {
						validLimit = random.number(1, 1000);
						validOptions.limit = validLimit;
						done();
					});

					after(async () => delete validOptions.limit);

					it('should return up to [options.limit] results', async () =>
						expect(listResult)
							.be.an('array')
							.and.have.lengthOf(validLimit));
				});

				describe('when no options.limit passed', async () => {
					it('should return [MAX_PEERS] results', async () =>
						expect(listResult)
							.be.an('array')
							.and.have.lengthOf(MAX_PEERS));
				});
			});

			describe('options.broadhash', async () => {
				describe('when 250 peers matching and 750 not matching broadhash', async () => {
					let validBroadhash;
					let validLimit;

					before(() => {
						// Ensure that different than checking broadhashes will be generated
						const broadhashes = generateMatchedAndUnmatchedBroadhashes(750);
						validBroadhash = broadhashes.matchedBroadhash;
						validOptions.broadhash = validBroadhash;
						// 250 peers matching broadhash, next 750 with different one
						return _.range(1000).forEach(i => {
							randomPeers[i].broadhash =
								i < 250 ? validBroadhash : broadhashes.unmatchedBroadhashes[i];
						});
					});

					after(() => {
						delete validOptions.broadhash;
						return delete validOptions.limit;
					});

					describe('when options.limit = 100', async () => {
						before(done => {
							validLimit = 100;
							validOptions.limit = validLimit;
							done();
						});

						it('should return 100 results', async () =>
							expect(listResult)
								.be.an('array')
								.and.have.lengthOf(100));

						it('should return 100 results with the same broadhash', async () =>
							expect(
								listResult.filter(peer => peer.broadhash === validBroadhash)
							)
								.be.an('array')
								.and.have.lengthOf(100));
					});

					describe('when options.limit = 500', async () => {
						before(done => {
							validLimit = 500;
							validOptions.limit = validLimit;
							done();
						});

						it('should return 500 results', async () =>
							expect(listResult)
								.be.an('array')
								.and.have.lengthOf(500));

						it('should return 250 results with the same broadhash', async () =>
							expect(
								listResult.filter(peer => peer.broadhash === validBroadhash)
							)
								.be.an('array')
								.and.have.lengthOf(250));

						it('should return 250 results with different broadhash', async () =>
							expect(
								listResult.filter(peer => peer.broadhash !== validBroadhash)
							)
								.be.an('array')
								.and.have.lengthOf(250));

						describe('options.attempt', async () => {
							after(async () => delete validOptions.attempt);

							describe('when options.attempt = 0', async () => {
								before(done => {
									validOptions.attempt = 0;
									done();
								});

								it('should return 250 results', async () =>
									expect(listResult).to.have.lengthOf(250));

								it('should return only peers matching broadhash', async () =>
									listResult.forEach(peer => {
										expect(peer.broadhash).eql(validBroadhash);
									}));
							});

							describe('when options.attempt = 1', async () => {
								before(done => {
									validOptions.attempt = 1;
									done();
								});

								it('should return 500 results', async () =>
									expect(listResult).to.have.lengthOf(500));

								it('should return only peers not matching broadhash', async () =>
									listResult.forEach(peer => {
										expect(peer.broadhash).not.eql(validBroadhash);
									}));
							});
						});
					});
				});

				describe('when no options.limit passed', async () => {
					it('should return [MAX_PEERS] results', async () =>
						expect(listResult)
							.be.an('array')
							.and.have.lengthOf(MAX_PEERS));
				});
			});
		});

		describe('when logic.peers.list returns 1000 random state peers and limit = 1000', async () => {
			describe('options.allowedStates', async () => {
				const CONNECTED_STATE = 2;
				const BANNED_STATE = 1;
				const DISCONNECTED_STATE = 0;

				before(done => {
					validOptions.limit = 1000;
					randomPeers = _.range(1000).map(() => {
						const peer = generateRandomActivePeer();
						peer.state = random.number(DISCONNECTED_STATE, CONNECTED_STATE + 1);
						return peer;
					});
					peersLogicMock.list = sinonSandbox.stub().returns(randomPeers);
					done();
				});

				after(async () => delete validOptions.limit);

				it('should return only connected peers', async () => {
					expect(_.uniqBy(listResult, 'state'))
						.be.an('array')
						.and.have.lengthOf(1);
					return expect(listResult[0].state).equal(CONNECTED_STATE);
				});

				describe('when options.allowedStates = [1]', async () => {
					before(done => {
						validOptions.allowedStates = [1];
						done();
					});

					after(async () => delete validOptions.allowedStates);

					it('should return only banned peers', async () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.lengthOf(1);
						return expect(listResult[0].state).equal(BANNED_STATE);
					});
				});

				describe('when options.allowedStates = [0]', async () => {
					before(done => {
						validOptions.allowedStates = [0];
						done();
					});

					after(async () => delete validOptions.allowedStates);

					it('should return only disconnected peers', async () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.lengthOf(1);
						return expect(listResult[0].state).equal(DISCONNECTED_STATE);
					});
				});

				describe('when options.allowedStates = [0, 1]', async () => {
					before(done => {
						validOptions.allowedStates = [0, 1];
						done();
					});

					after(async () => delete validOptions.allowedStates);

					it('should return disconnected and banned peers', async () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.length.at.least(1);
						return listResult.forEach(state => {
							expect(state).not.to.equal(CONNECTED_STATE);
						});
					});
				});
			});
		});

		describe('networkHeight', async () => {
			it('should return networkHeight 0 when no peers available', done => {
				peersLogicMock.list = sinonSandbox.stub().returns([]);
				peers.networkHeight(validOptions, (err, networkHeight) => {
					expect(err).to.be.null;
					expect(networkHeight)
						.to.be.an('number')
						.and.to.deep.equal(0);
					done();
				});
			});

			it('should return the height of maximum number of peers at one particular height', done => {
				// generate 10 peer list with height 0
				const peerList = _.range(10).map(() => generateRandomActivePeer());

				// create group of peers with height 5,3,2
				// and they also indicate the number of peers
				// in that specific height, so the majority is 5
				let count = 0;
				[5, 3, 2].map(height =>
					_.range(height).map(() => {
						peerList[count].height = height;
						return count++;
					})
				);
				peersLogicMock.list = sinonSandbox.stub().returns(peerList);
				peers.networkHeight(validOptions, (err, networkHeight) => {
					expect(err).to.be.null;
					expect(networkHeight)
						.to.be.an('number')
						.and.to.deep.equal(5);
					done();
				});
			});
		});
	});

	describe('update', async () => {
		let validPeer;
		let updateResult;
		let validUpsertResult;

		before(done => {
			validUpsertResult = true;
			validPeer = generateRandomActivePeer();
			done();
		});

		beforeEach(done => {
			peersLogicMock.upsert = sinonSandbox.stub().returns(validUpsertResult);
			updateResult = peers.update(validPeer);
			done();
		});

		it('should call logic.peers.upsert', async () =>
			expect(peersLogicMock.upsert.calledOnce).to.be.true);

		it('should call logic.peers.upsert with peer', async () =>
			expect(peersLogicMock.upsert.calledWith(validPeer)).to.be.true);

		it('should return library.logic.peers.upsert result', async () =>
			expect(updateResult).equal(validUpsertResult));
	});

	describe('remove', async () => {
		let validPeer;
		let removeResult;
		let validLogicRemoveResult;

		before(done => {
			validLogicRemoveResult = true;
			validPeer = generateRandomActivePeer();
			done();
		});

		beforeEach(done => {
			peersLogicMock.remove = sinonSandbox
				.stub()
				.returns(validLogicRemoveResult);
			removeResult = peers.remove(validPeer);
			done();
		});

		describe('when removable peer is frozen', async () => {
			let originalFrozenPeersList;
			let loggerDebugSpy;

			before(done => {
				originalFrozenPeersList = _.assign(
					{},
					modulesLoader.scope.config.peers.list
				);
				modulesLoader.scope.config.peers.list = [
					{
						ip: validPeer.ip,
						wsPort: validPeer.wsPort,
					},
				];
				loggerDebugSpy = sinonSandbox.spy(modulesLoader.scope.logger, 'debug');
				done();
			});

			after(() => {
				modulesLoader.scope.config.peers.list = originalFrozenPeersList;
				return loggerDebugSpy.restore();
			});

			it('should not call logic.peers.remove', async () =>
				expect(peersLogicMock.remove.called).to.be.false);

			it('should call logger.debug with message = "Cannot remove frozen peer"', async () =>
				expect(loggerDebugSpy.calledWith('Cannot remove frozen peer')).to.be
					.true);

			it('should call logger.debug with message = [ip:port]', async () =>
				expect(loggerDebugSpy.args[0][1]).eql(
					`${validPeer.ip}:${validPeer.wsPort}`
				));
		});

		describe('when removable peer is not frozen', async () => {
			it('should call logic.peers.remove', async () =>
				expect(peersLogicMock.remove.calledOnce).to.be.true);

			it('should call logic.peers.remove with object containing expected ip', async () =>
				expect(
					peersLogicMock.remove.calledWith(
						sinonSandbox.match({ ip: validPeer.ip })
					)
				).to.be.true);

			it('should call logic.peers.remove with object containing expected port', async () =>
				expect(
					peersLogicMock.remove.calledWith(
						sinonSandbox.match({ wsPort: validPeer.wsPort })
					)
				).to.be.true);

			it('should return library.logic.peers.remove result', async () =>
				expect(removeResult).equal(validLogicRemoveResult));
		});
	});

	describe('getLastConsensus', async () => {
		it('should return self.consensus value', async () =>
			expect(peers.getLastConsensus()).equal(
				PeersRewired.__get__('self.consensus')
			));
	});

	describe('calculateConsensus', async () => {
		let validActive;
		let validMatched;
		let calculateConsensusResult;

		before(done => {
			validActive = null;
			validMatched = null;
			calculateConsensusResult = null;
			systemComponentMock.getBroadhash = sinonSandbox.stub().returns();
			peersLogicMock.list = sinonSandbox.stub().returns([]);
			done();
		});

		beforeEach(async () => {
			calculateConsensusResult = await peers.calculateConsensus(
				validActive,
				validMatched
			);
			return null;
		});

		afterEach(() => peersLogicMock.list.resetHistory());

		it('should set self.consensus value', async () =>
			expect(PeersRewired.__get__('self.consensus')).to.equal(
				calculateConsensusResult
			));

		describe('when active peers not passed', async () => {
			it('should call logic.peers.list', async () =>
				expect(peersLogicMock.list.called).to.be.true);

			it('should call logic.peers.list with true', async () =>
				expect(peersLogicMock.list.calledWith(true)).to.be.true);

			it('should return consensus as a number', async () =>
				expect(calculateConsensusResult).to.be.a('number'));

			describe('when CONNECTED peers exists with matching broadhash', async () => {
				before(done => {
					const connectedPeer = _.assign({}, prefixedPeer);
					connectedPeer.state = Peer.STATE.CONNECTED;
					peersLogicMock.list = sinonSandbox.stub().returns([connectedPeer]);
					systemComponentMock.getBroadhash = sinonSandbox
						.stub()
						.returns(connectedPeer.broadhash);
					done();
				});

				it('should return consensus = 100', async () =>
					expect(calculateConsensusResult).to.equal(100));
			});

			describe('when BANNED peers exists with matching broadhash', async () => {
				before(done => {
					const bannedPeer = _.assign({}, prefixedPeer);
					bannedPeer.state = Peer.STATE.BANNED;
					peersLogicMock.list = sinonSandbox.stub().returns([bannedPeer]);
					systemComponentMock.getBroadhash = sinonSandbox
						.stub()
						.returns(bannedPeer.broadhash);
					done();
				});

				it('should return consensus = 0', async () =>
					expect(calculateConsensusResult).to.equal(0));
			});

			describe('when DISCONNECTED peers exists with matching broadhash', async () => {
				before(done => {
					const disconnectedPeer = _.assign({}, prefixedPeer);
					disconnectedPeer.state = Peer.STATE.DISCONNECTED;
					peersLogicMock.list = sinonSandbox.stub().returns([disconnectedPeer]);
					systemComponentMock.getBroadhash = sinonSandbox
						.stub()
						.returns(disconnectedPeer.broadhash);
					done();
				});

				it('should return consensus = 0', async () =>
					expect(calculateConsensusResult).to.equal(0));
			});
		});

		describe('when matched peers not passed and there are 100 active peers', async () => {
			let oneHundredActivePeers;
			let broadhashes;

			before(done => {
				oneHundredActivePeers = _.range(100).map(() =>
					generateRandomActivePeer()
				);
				broadhashes = generateMatchedAndUnmatchedBroadhashes(100);
				systemComponentMock.getBroadhash = sinonSandbox
					.stub()
					.returns(broadhashes.matchedBroadhash);
				validActive = oneHundredActivePeers;
				done();
			});

			afterEach(() => peersLogicMock.list.resetHistory());

			after(done => {
				validActive = null;
				done();
			});

			describe('when non of active peers matches broadhash', async () => {
				before(() =>
					oneHundredActivePeers.forEach((peer, index) => {
						peer.broadhash = broadhashes.unmatchedBroadhashes[index];
					})
				);

				it('should return consensus = 0', async () =>
					expect(calculateConsensusResult).to.equal(0));
			});

			describe('when all of active peers matches broadhash', async () => {
				before(() =>
					oneHundredActivePeers.forEach(peer => {
						peer.broadhash = broadhashes.matchedBroadhash;
					})
				);

				it('should return consensus = 100', async () =>
					expect(calculateConsensusResult).equal(100));
			});

			describe('when half of active peers matches broadhash', async () => {
				before(() =>
					oneHundredActivePeers.forEach((peer, i) => {
						peer.broadhash =
							i < 50
								? broadhashes.matchedBroadhash
								: broadhashes.unmatchedBroadhashes[i];
					})
				);

				it('should return consensus = 50', async () =>
					expect(calculateConsensusResult).equal(50));
			});
		});

		describe('when called with active and matched arguments', async () => {
			describe('when there are 10 active and 10 matched peers', async () => {
				before(done => {
					validActive = _.range(10).map(generateRandomActivePeer);
					validMatched = _.range(10).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', async () =>
					expect(calculateConsensusResult).equal(100));
			});

			describe('when there are [MAX_PEERS] active and [MAX_PEERS] matched peers', async () => {
				before(done => {
					validActive = _.range(MAX_PEERS).map(generateRandomActivePeer);
					validMatched = _.range(MAX_PEERS).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', async () =>
					expect(calculateConsensusResult).equal(100));
			});

			describe('when there are [MAX_PEERS] x 10 active and [MAX_PEERS] matched peers', async () => {
				before(done => {
					validActive = _.range(10 * MAX_PEERS).map(generateRandomActivePeer);
					validMatched = _.range(MAX_PEERS).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', async () =>
					expect(calculateConsensusResult).equal(100));
			});

			describe('when there are [MAX_PEERS] active and [MAX_PEERS] x 10 matched peers', async () => {
				before(done => {
					validActive = _.range(MAX_PEERS).map(generateRandomActivePeer);
					validMatched = _.range(10 * MAX_PEERS).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', async () =>
					expect(calculateConsensusResult).equal(100));
			});

			describe('when there are 50 active and 100 matched peers', async () => {
				before(done => {
					validActive = _.range(50).map(generateRandomActivePeer);
					validMatched = _.range(100).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', async () =>
					expect(calculateConsensusResult).equal(100));
			});

			describe('when there are 100 active and 50 matched peers', async () => {
				before(done => {
					validActive = _.range(100).map(generateRandomActivePeer);
					validMatched = _.range(50).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 50', async () =>
					expect(calculateConsensusResult).equal(50));
			});
		});
	});

	describe('acceptable', async () => {
		before(done => {
			systemComponentMock.headers.nonce = NONCE;
			process.env.NODE_ENV = 'DEV';
			done();
		});

		it('should accept peer with public ip', async () =>
			expect(peers.acceptable([prefixedPeer]))
				.that.is.an('array')
				.and.to.deep.equal([prefixedPeer]));

		it('should not accept peer with private ip', async () => {
			const privatePeer = _.clone(prefixedPeer);
			privatePeer.ip = '127.0.0.1';
			return expect(peers.acceptable([privatePeer])).that.is.an('array').and.to
				.be.empty;
		});

		it("should not accept peer with host's nonce", async () => {
			const peer = _.clone(prefixedPeer);
			peer.nonce = NONCE;
			return expect(peers.acceptable([peer])).that.is.an('array').and.to.be
				.empty;
		});

		it('should not accept peer with different ip but the same nonce', async () => {
			process.env.NODE_ENV = 'TEST';
			const meAsPeer = {
				ip: '40.00.40.40',
				wsPort: 4001,
				nonce: NONCE,
			};
			return expect(peers.acceptable([meAsPeer])).that.is.an('array').and.to.be
				.empty;
		});

		after(done => {
			process.env.NODE_ENV = 'TEST';
			done();
		});
	});

	describe('onBlockchainReady', async () => {
		let originalPeersList;

		beforeEach(done => {
			originalPeersList = PeersRewired.__get__('library.config.peers.list');
			PeersRewired.__set__('library.config.peers.list', []);
			peersLogicMock.create = sinonSandbox.stub().returnsArg(0);
			sinonSandbox.stub(peers, 'discover');
			done();
		});

		afterEach(done => {
			PeersRewired.__set__('library.config.peers.list', originalPeersList);
			peers.discover.restore();
			done();
		});

		describe('insertSeeds', async () => {
			describe('when library.config.peers.list contains seed peers', async () => {
				let seedPeersList;

				beforeEach(done => {
					seedPeersList = [
						{
							rpc: {
								status: sinonSandbox
									.stub()
									.callsArgWith(0, 'Failed to get peer status'),
							},
							applyHeaders: sinonSandbox.stub(),
						},
					];
					PeersRewired.__set__('library.config.peers.list', seedPeersList);
					peersLogicMock.upsert = sinonSandbox.spy();
					// Call onBlockchainReady and wait 100ms
					peers.onBlockchainReady();
					setTimeout(done, 100);
				});

				it('should call library.logic.upsert with seed peers', async () =>
					seedPeersList.forEach(seedPeer => {
						expect(peersLogicMock.upsert).calledWith(seedPeer, true);
					}));
			});
		});

		describe('importFromDatabase', async () => {
			describe('when library.storage.entities.Peer.get returns results', async () => {
				let dbPeersListResults;

				beforeEach(done => {
					dbPeersListResults = [prefixedPeer];
					storageMock.entities.Peer.get = sinonSandbox
						.stub()
						.resolves(dbPeersListResults);
					peersLogicMock.upsert = sinonSandbox.spy();
					// Call onBlockchainReady and wait 100ms
					peers.onBlockchainReady();
					setTimeout(done, 100);
				});

				it('should call library.logic.upsert with seed peers', async () =>
					dbPeersListResults.forEach(dbPeer => {
						expect(peersLogicMock.upsert).calledWith(dbPeer, true);
					}));

				it('should call storage get method with limit = null for pulling all peers', async () => {
					expect(
						storageMock.entities.Peer.get.firstCall.args[1].limit
					).to.be.eql(null);
				});
			});
		});

		describe('discoverNew', async () => {
			beforeEach('call onBlockchainReady() and wait 100ms', done => {
				peers.onBlockchainReady();
				setTimeout(done, 100);
			});

			it('should call peers.discover only once', async () =>
				expect(peers.discover.calledOnce).to.be.ok);
		});
	});

	describe('onPeersReady', async () => {
		let jobsQueueSpy;
		beforeEach(done => {
			peersLogicMock.list = sinonSandbox.stub().returns([]);
			sinonSandbox.stub(peers, 'discover').callsArgWith(0, null);
			jobsQueue.jobs = {};
			jobsQueueSpy = sinon.spy(jobsQueue, 'register');
			peers.onPeersReady();
			setTimeout(done, 100);
		});

		afterEach(done => {
			jobsQueueSpy.restore();
			peers.discover.restore();
			done();
		});

		it('should call peers.discover', async () =>
			expect(peers.discover.calledOnce).to.be.ok);

		it('should start peers discovery process by registering it in jobsQueue every 5 sec', async () =>
			expect(jobsQueueSpy).calledWith(
				'peersDiscoveryAndUpdate',
				sinon.match.func,
				30000
			));
	});

	describe('discover', async () => {
		let randomPeerStub;
		let restoreSet;

		beforeEach(done => {
			restoreSet = PeersRewired.__set__(
				'__private.updatePeerStatus',
				sinonSandbox.spy()
			);
			randomPeerStub = {
				rpc: {
					status: sinonSandbox
						.stub()
						.callsArgWith(0, 'Failed to get peer status'),
					list: sinonSandbox.spy(),
				},
			};
			peers.list = sinonSandbox.stub().callsArgWith(1, null, [randomPeerStub]);
			done();
		});

		afterEach(() => restoreSet());

		it('should not call randomPeer.rpc.list if randomPeer.rpc.status operation has failed', done => {
			peers.discover(err => {
				expect(err).to.equal('Failed to get peer status');
				expect(randomPeerStub.rpc.list.called).to.be.false;
				done();
			});
		});
	});

	describe('__private', async () => {
		describe('updatePeerStatus', async () => {
			let peer;
			let status;

			beforeEach(done => {
				status = {
					broadhash: 'aBroadhash',
					height: 'aHeight',
					httpPort: 'anHttpHeight',
					nonce: 'aNonce',
					os: 'anOs',
					version: '1.0.0',
					protocolVersion: '1.0',
				};

				peer = {
					applyHeaders: sinonSandbox.stub(),
					ip: '127.0.0.1',
					string: 'aPeerString',
				};

				bindings.components.system.versionCompatible = sinonSandbox.stub();
				bindings.components.system.protocolVersionCompatible = sinonSandbox.stub();
				__private.updatePeerStatus(undefined, status, peer);
				done();
			});

			afterEach(() => sinonSandbox.restore());

			describe('when no protocol version is present', async () => {
				it('should call versionCompatible() with status.version', async () => {
					delete status.protocolVersion;
					__private.updatePeerStatus(undefined, status, peer);
					return expect(
						bindings.components.system.versionCompatible
					).to.be.calledWith(status.version);
				});
			});

			describe('when protocol version is present', async () => {
				it('should call protocolVersionCompatible() with status.protocolVersion', async () => {
					__private.updatePeerStatus(undefined, status, peer);
					return expect(
						bindings.components.system.protocolVersionCompatible
					).to.be.calledWith(status.protocolVersion);
				});
			});

			describe('when the peer is compatible', async () => {
				beforeEach(() => {
					bindings.components.system.protocolVersionCompatible = sinonSandbox
						.stub()
						.returns(true);
					return __private.updatePeerStatus(undefined, status, peer);
				});

				it('should check if its blacklisted', async () => {
					// Arrange
					__private.isBlacklisted = sinonSandbox.stub();
					// Act
					__private.updatePeerStatus(undefined, status, peer);
					// Assert
					return expect(__private.isBlacklisted).to.be.called;
				});

				it('should call peer.applyHeaders()', async () =>
					expect(peer.applyHeaders).to.be.called);

				it('should call peer.applyHeaders() with a BANNED status if blacklisted', async () => {
					// Arrange
					__private.isBlacklisted = sinonSandbox.stub().returns(true);
					const expectedArg = { ...status, state: Peer.STATE.BANNED };
					// Act
					__private.updatePeerStatus(undefined, status, peer);
					// Assert
					return expect(peer.applyHeaders).to.be.calledWithExactly(expectedArg);
				});

				it('should call peer.applyHeaders() with CONNECTED status if not blacklisted', async () => {
					// Arrange
					__private.isBlacklisted = sinonSandbox.stub().returns(false);
					const expectedArg = { ...status, state: Peer.STATE.CONNECTED };
					// Act
					__private.updatePeerStatus(undefined, status, peer);
					// Assert
					return expect(peer.applyHeaders).to.be.calledWithExactly(expectedArg);
				});
			});

			it('should call library.logic.peers.upsert() with required args regardless if its compatible or not', done => {
				// When it's compatible
				bindings.components.system.protocolVersionCompatible = sinonSandbox
					.stub()
					.returns(true);
				__private.updatePeerStatus(undefined, status, peer);
				expect(peersLogicMock.upsert).to.be.calledWithExactly(peer, false);
				// When it's not compatible
				bindings.components.system.protocolVersionCompatible = sinonSandbox
					.stub()
					.returns(false);
				__private.updatePeerStatus(undefined, status, peer);
				expect(peersLogicMock.upsert).to.be.calledWithExactly(peer, false);
				done();
			});
		});
	});
});
