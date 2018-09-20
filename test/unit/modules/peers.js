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
const prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;
const Peer = require('../../../logic/peer');
const generateRandomActivePeer = require('../../fixtures/peers')
	.generateRandomActivePeer;
const jobsQueue = require('../../../helpers/jobs_queue');
const generateMatchedAndUnmatchedBroadhashes = require('../common/helpers/peers')
	.generateMatchedAndUnmatchedBroadhashes;
const modulesLoader = require('../../common/modules_loader');
const random = require('../../common/utils/random');
const swagerHelper = require('../../../helpers/swagger');

const { MAX_PEERS } = __testContext.config.constants;

describe('peers', () => {
	var dbMock;
	var peers;
	var PeersRewired;
	var modules;

	var peersLogicMock;
	var systemModuleMock;
	var transportModuleMock;

	var NONCE = randomstring.generate(16);

	before(done => {
		dbMock = {
			any: sinonSandbox.stub().resolves(),
			peers: {
				list: sinonSandbox.stub().resolves(),
			},
		};
		PeersRewired = rewire('../../../modules/peers');
		peersLogicMock = {
			create: sinonSandbox.spy(),
			exists: sinonSandbox.stub(),
			get: sinonSandbox.stub(),
			list: sinonSandbox.stub(),
			upsert: sinonSandbox.stub(),
			remove: sinonSandbox.stub(),
		};
		systemModuleMock = {};
		transportModuleMock = {};
		modules = {
			system: systemModuleMock,
			transport: transportModuleMock,
		};

		swagerHelper.getResolvedSwaggerSpec().then(resolvedSpec => {
			modules.swagger = {
				definitions: resolvedSpec.definitions,
			};
		});

		modulesLoader.scope.nonce = NONCE;
		new PeersRewired((err, peersModule) => {
			peers = peersModule;
			peers.onBind(modules);
			done();
		}, _.assign({}, modulesLoader.scope, { logic: { peers: peersLogicMock }, db: dbMock }));
	});

	describe('list', () => {
		var listResult;
		var validOptions;
		var randomPeers;

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

		describe('when logic.peers.list returns no records', () => {
			before(done => {
				systemModuleMock.getBroadhash = sinonSandbox.stub().returns();
				peersLogicMock.list = sinonSandbox.stub().returns([]);
				done();
			});

			it('should return an empty array', () => {
				return expect(listResult).to.be.an('array').and.to.be.empty;
			});
		});

		describe('when logic.peers.list returns 1000 random connected peers', () => {
			before(done => {
				randomPeers = _.range(1000).map(() => {
					return generateRandomActivePeer();
				});
				peersLogicMock.list = sinonSandbox.stub().returns(randomPeers);
				done();
			});

			it('should return all 1000 peers', () => {
				return expect(listResult)
					.be.an('array')
					.and.have.lengthOf(100);
			});

			describe('options.limit', () => {
				describe('when options.limit < 1000', () => {
					var validLimit;

					before(done => {
						validLimit = random.number(1, 1000);
						validOptions.limit = validLimit;
						done();
					});

					after(() => {
						return delete validOptions.limit;
					});

					it('should return up to [options.limit] results', () => {
						return expect(listResult)
							.be.an('array')
							.and.have.lengthOf(validLimit);
					});
				});

				describe('when no options.limit passed', () => {
					it('should return [MAX_PEERS] results', () => {
						return expect(listResult)
							.be.an('array')
							.and.have.lengthOf(MAX_PEERS);
					});
				});
			});

			describe('options.broadhash', () => {
				describe('when 250 peers matching and 750 not matching broadhash', () => {
					var validBroadhash;
					var validLimit;

					before(() => {
						// Ensure that different than checking broadhashes will be generated
						var broadhashes = generateMatchedAndUnmatchedBroadhashes(750);
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

					describe('when options.limit = 100', () => {
						before(done => {
							validLimit = 100;
							validOptions.limit = validLimit;
							done();
						});

						it('should return 100 results', () => {
							return expect(listResult)
								.be.an('array')
								.and.have.lengthOf(100);
						});

						it('should return 100 results with the same broadhash', () => {
							return expect(
								listResult.filter(peer => {
									return peer.broadhash === validBroadhash;
								})
							)
								.be.an('array')
								.and.have.lengthOf(100);
						});
					});

					describe('when options.limit = 500', () => {
						before(done => {
							validLimit = 500;
							validOptions.limit = validLimit;
							done();
						});

						it('should return 500 results', () => {
							return expect(listResult)
								.be.an('array')
								.and.have.lengthOf(500);
						});

						it('should return 250 results with the same broadhash', () => {
							return expect(
								listResult.filter(peer => {
									return peer.broadhash === validBroadhash;
								})
							)
								.be.an('array')
								.and.have.lengthOf(250);
						});

						it('should return 250 results with different broadhash', () => {
							return expect(
								listResult.filter(peer => {
									return peer.broadhash !== validBroadhash;
								})
							)
								.be.an('array')
								.and.have.lengthOf(250);
						});

						describe('options.attempt', () => {
							after(() => {
								return delete validOptions.attempt;
							});

							describe('when options.attempt = 0', () => {
								before(done => {
									validOptions.attempt = 0;
									done();
								});

								it('should return 250 results', () => {
									return expect(listResult).to.have.lengthOf(250);
								});

								it('should return only peers matching broadhash', () => {
									return listResult.forEach(peer => {
										expect(peer.broadhash).eql(validBroadhash);
									});
								});
							});

							describe('when options.attempt = 1', () => {
								before(done => {
									validOptions.attempt = 1;
									done();
								});

								it('should return 500 results', () => {
									return expect(listResult).to.have.lengthOf(500);
								});

								it('should return only peers not matching broadhash', () => {
									return listResult.forEach(peer => {
										expect(peer.broadhash).not.eql(validBroadhash);
									});
								});
							});
						});
					});
				});

				describe('when no options.limit passed', () => {
					it('should return [MAX_PEERS] results', () => {
						return expect(listResult)
							.be.an('array')
							.and.have.lengthOf(MAX_PEERS);
					});
				});
			});
		});

		describe('when logic.peers.list returns 1000 random state peers and limit = 1000', () => {
			describe('options.allowedStates', () => {
				var CONNECTED_STATE = 2;
				var BANNED_STATE = 1;
				var DISCONNECTED_STATE = 0;

				before(done => {
					validOptions.limit = 1000;
					randomPeers = _.range(1000).map(() => {
						var peer = generateRandomActivePeer();
						peer.state = random.number(DISCONNECTED_STATE, CONNECTED_STATE + 1);
						return peer;
					});
					peersLogicMock.list = sinonSandbox.stub().returns(randomPeers);
					done();
				});

				after(() => {
					return delete validOptions.limit;
				});

				it('should return only connected peers', () => {
					expect(_.uniqBy(listResult, 'state'))
						.be.an('array')
						.and.have.lengthOf(1);
					return expect(listResult[0].state).equal(CONNECTED_STATE);
				});

				describe('when options.allowedStates = [1]', () => {
					before(done => {
						validOptions.allowedStates = [1];
						done();
					});

					after(() => {
						return delete validOptions.allowedStates;
					});

					it('should return only banned peers', () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.lengthOf(1);
						return expect(listResult[0].state).equal(BANNED_STATE);
					});
				});

				describe('when options.allowedStates = [0]', () => {
					before(done => {
						validOptions.allowedStates = [0];
						done();
					});

					after(() => {
						return delete validOptions.allowedStates;
					});

					it('should return only disconnected peers', () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.lengthOf(1);
						return expect(listResult[0].state).equal(DISCONNECTED_STATE);
					});
				});

				describe('when options.allowedStates = [0, 1]', () => {
					before(done => {
						validOptions.allowedStates = [0, 1];
						done();
					});

					after(() => {
						return delete validOptions.allowedStates;
					});

					it('should return disconnected and banned peers', () => {
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

		describe('networkHeight', () => {
			it('should return networkHeight 0 when no peers available', done => {
				peersLogicMock.list = sinonSandbox.stub().returns([]);
				peers.networkHeight(validOptions, (err, networkHeight) => {
					expect(err).to.be.null;
					expect(networkHeight);
					expect(networkHeight)
						.to.be.an('number')
						.and.to.deep.eql(0);
					done();
				});
			});

			it('should return the height of maximum number of peers at one particular height', done => {
				// generate 10 peer list with height 0
				const peerList = _.range(10).map(() => {
					return generateRandomActivePeer();
				});

				// create group of peers with height 5,3,2
				// and they also indicate the number of peers
				// in that specific height, so the majority is 5
				let count = 0;
				[5, 3, 2].map(height => {
					_.range(height).map(() => {
						peerList[count].height = height;
						count++;
					});
				});
				peersLogicMock.list = sinonSandbox.stub().returns(peerList);
				peers.networkHeight(validOptions, (err, networkHeight) => {
					expect(err).to.be.null;
					expect(networkHeight);
					expect(networkHeight)
						.to.be.an('number')
						.and.to.deep.eql(5);
					done();
				});
			});
		});
	});

	describe('update', () => {
		var validPeer;
		var updateResult;
		var validUpsertResult;

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

		it('should call logic.peers.upsert', () => {
			return expect(peersLogicMock.upsert.calledOnce).to.be.true;
		});

		it('should call logic.peers.upsert with peer', () => {
			return expect(peersLogicMock.upsert.calledWith(validPeer)).to.be.true;
		});

		it('should return library.logic.peers.upsert result', () => {
			return expect(updateResult).equal(validUpsertResult);
		});
	});

	describe('remove', () => {
		var validPeer;
		var removeResult;
		var validLogicRemoveResult;

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

		describe('when removable peer is frozen', () => {
			var originalFrozenPeersList;
			var loggerDebugSpy;

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

			it('should not call logic.peers.remove', () => {
				return expect(peersLogicMock.remove.called).to.be.false;
			});

			it('should call logger.debug with message = "Cannot remove frozen peer"', () => {
				return expect(loggerDebugSpy.calledWith('Cannot remove frozen peer')).to
					.be.true;
			});

			it('should call logger.debug with message = [ip:port]', () => {
				return expect(loggerDebugSpy.args[0][1]).eql(
					`${validPeer.ip}:${validPeer.wsPort}`
				);
			});
		});

		describe('when removable peer is not frozen', () => {
			it('should call logic.peers.remove', () => {
				return expect(peersLogicMock.remove.calledOnce).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected ip', () => {
				return expect(
					peersLogicMock.remove.calledWith(
						sinonSandbox.match({ ip: validPeer.ip })
					)
				).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected port', () => {
				return expect(
					peersLogicMock.remove.calledWith(
						sinonSandbox.match({ wsPort: validPeer.wsPort })
					)
				).to.be.true;
			});

			it('should return library.logic.peers.remove result', () => {
				return expect(removeResult).equal(validLogicRemoveResult);
			});
		});
	});

	describe('getLastConsensus', () => {
		it('should return self.consensus value', () => {
			return expect(peers.getLastConsensus()).equal(
				PeersRewired.__get__('self.consensus')
			);
		});
	});

	describe('calculateConsensus', () => {
		var validActive;
		var validMatched;
		var calculateConsensusResult;

		before(done => {
			validActive = null;
			validMatched = null;
			calculateConsensusResult = null;
			systemModuleMock.getBroadhash = sinonSandbox.stub().returns();
			peersLogicMock.list = sinonSandbox.stub().returns([]);
			done();
		});

		beforeEach(done => {
			calculateConsensusResult = peers.calculateConsensus(
				validActive,
				validMatched
			);
			done();
		});

		afterEach(() => {
			return peersLogicMock.list.resetHistory();
		});

		it('should set self.consensus value', () => {
			return expect(PeersRewired.__get__('self.consensus')).to.equal(
				calculateConsensusResult
			);
		});

		describe('when active peers not passed', () => {
			it('should call logic.peers.list', () => {
				return expect(peersLogicMock.list.called).to.be.true;
			});

			it('should call logic.peers.list with true', () => {
				return expect(peersLogicMock.list.calledWith(true)).to.be.true;
			});

			it('should return consensus as a number', () => {
				return expect(calculateConsensusResult).to.be.a('number');
			});

			describe('when CONNECTED peers exists with matching broadhash', () => {
				before(done => {
					var connectedPeer = _.assign({}, prefixedPeer);
					connectedPeer.state = Peer.STATE.CONNECTED;
					peersLogicMock.list = sinonSandbox.stub().returns([connectedPeer]);
					systemModuleMock.getBroadhash = sinonSandbox
						.stub()
						.returns(connectedPeer.broadhash);
					done();
				});

				it('should return consensus = 100', () => {
					return expect(calculateConsensusResult).to.equal(100);
				});
			});

			describe('when BANNED peers exists with matching broadhash', () => {
				before(done => {
					var bannedPeer = _.assign({}, prefixedPeer);
					bannedPeer.state = Peer.STATE.BANNED;
					peersLogicMock.list = sinonSandbox.stub().returns([bannedPeer]);
					systemModuleMock.getBroadhash = sinonSandbox
						.stub()
						.returns(bannedPeer.broadhash);
					done();
				});

				it('should return consensus = 0', () => {
					return expect(calculateConsensusResult).to.equal(0);
				});
			});

			describe('when DISCONNECTED peers exists with matching broadhash', () => {
				before(done => {
					var disconnectedPeer = _.assign({}, prefixedPeer);
					disconnectedPeer.state = Peer.STATE.DISCONNECTED;
					peersLogicMock.list = sinonSandbox.stub().returns([disconnectedPeer]);
					systemModuleMock.getBroadhash = sinonSandbox
						.stub()
						.returns(disconnectedPeer.broadhash);
					done();
				});

				it('should return consensus = 0', () => {
					return expect(calculateConsensusResult).to.equal(0);
				});
			});
		});

		describe('when matched peers not passed and there are 100 active peers', () => {
			var oneHundredActivePeers;
			var broadhashes;

			before(done => {
				oneHundredActivePeers = _.range(100).map(() => {
					return generateRandomActivePeer();
				});
				broadhashes = generateMatchedAndUnmatchedBroadhashes(100);
				systemModuleMock.getBroadhash = sinonSandbox
					.stub()
					.returns(broadhashes.matchedBroadhash);
				validActive = oneHundredActivePeers;
				done();
			});

			afterEach(() => {
				return peersLogicMock.list.resetHistory();
			});

			after(done => {
				validActive = null;
				done();
			});

			describe('when non of active peers matches broadhash', () => {
				before(() => {
					return oneHundredActivePeers.forEach((peer, index) => {
						peer.broadhash = broadhashes.unmatchedBroadhashes[index];
					});
				});

				it('should return consensus = 0', () => {
					return expect(calculateConsensusResult).to.equal(0);
				});
			});

			describe('when all of active peers matches broadhash', () => {
				before(() => {
					return oneHundredActivePeers.forEach(peer => {
						peer.broadhash = broadhashes.matchedBroadhash;
					});
				});

				it('should return consensus = 100', () => {
					return expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when half of active peers matches broadhash', () => {
				before(() => {
					return oneHundredActivePeers.forEach((peer, i) => {
						peer.broadhash =
							i < 50
								? broadhashes.matchedBroadhash
								: broadhashes.unmatchedBroadhashes[i];
					});
				});

				it('should return consensus = 50', () => {
					return expect(calculateConsensusResult).equal(50);
				});
			});
		});

		describe('when called with active and matched arguments', () => {
			describe('when there are 10 active and 10 matched peers', () => {
				before(done => {
					validActive = _.range(10).map(generateRandomActivePeer);
					validMatched = _.range(10).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', () => {
					return expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are [MAX_PEERS] active and [MAX_PEERS] matched peers', () => {
				before(done => {
					validActive = _.range(MAX_PEERS).map(generateRandomActivePeer);
					validMatched = _.range(MAX_PEERS).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', () => {
					return expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are [MAX_PEERS] x 10 active and [MAX_PEERS] matched peers', () => {
				before(done => {
					validActive = _.range(10 * MAX_PEERS).map(generateRandomActivePeer);
					validMatched = _.range(MAX_PEERS).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', () => {
					return expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are [MAX_PEERS] active and [MAX_PEERS] x 10 matched peers', () => {
				before(done => {
					validActive = _.range(MAX_PEERS).map(generateRandomActivePeer);
					validMatched = _.range(10 * MAX_PEERS).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', () => {
					return expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are 50 active and 100 matched peers', () => {
				before(done => {
					validActive = _.range(50).map(generateRandomActivePeer);
					validMatched = _.range(100).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 100', () => {
					return expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are 100 active and 50 matched peers', () => {
				before(done => {
					validActive = _.range(100).map(generateRandomActivePeer);
					validMatched = _.range(50).map(generateRandomActivePeer);
					done();
				});

				it('should return consensus = 50', () => {
					return expect(calculateConsensusResult).equal(50);
				});
			});
		});
	});

	describe('acceptable', () => {
		before(done => {
			systemModuleMock.getNonce = sinonSandbox.stub().returns(NONCE);
			process.env.NODE_ENV = 'DEV';
			done();
		});

		it('should accept peer with public ip', () => {
			return expect(peers.acceptable([prefixedPeer]))
				.that.is.an('array')
				.and.to.deep.equal([prefixedPeer]);
		});

		it('should not accept peer with private ip', () => {
			var privatePeer = _.clone(prefixedPeer);
			privatePeer.ip = '127.0.0.1';
			return expect(peers.acceptable([privatePeer])).that.is.an('array').and.to
				.be.empty;
		});

		it("should not accept peer with host's nonce", () => {
			var peer = _.clone(prefixedPeer);
			peer.nonce = NONCE;
			return expect(peers.acceptable([peer])).that.is.an('array').and.to.be
				.empty;
		});

		it('should not accept peer with different ip but the same nonce', () => {
			process.env.NODE_ENV = 'TEST';
			var meAsPeer = {
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

	describe('onBlockchainReady', () => {
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

		describe('insertSeeds', () => {
			describe('when library.config.peers.list contains seed peers', () => {
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

				it('should call library.logic.upsert with seed peers', () => {
					return seedPeersList.forEach(seedPeer => {
						expect(peersLogicMock.upsert).calledWith(seedPeer, true);
					});
				});
			});
		});

		describe('importFromDatabase', () => {
			describe('when library.db.peers.list returns results', () => {
				let dbPeersListResults;

				beforeEach(done => {
					dbPeersListResults = [prefixedPeer];
					PeersRewired.__set__(
						'library.db.peers.list',
						sinon.stub().resolves(dbPeersListResults)
					);
					peersLogicMock.upsert = sinonSandbox.spy();
					// Call onBlockchainReady and wait 100ms
					peers.onBlockchainReady();
					setTimeout(done, 100);
				});

				it('should call library.logic.upsert with seed peers', () => {
					return dbPeersListResults.forEach(dbPeer => {
						expect(peersLogicMock.upsert).calledWith(dbPeer, true);
					});
				});
			});
		});

		describe('discoverNew', () => {
			beforeEach('call onBlockchainReady() and wait 100ms', done => {
				peers.onBlockchainReady();
				setTimeout(done, 100);
			});

			it('should call peers.discover only once', () => {
				return expect(peers.discover.calledOnce).to.be.ok;
			});
		});
	});

	describe('onPeersReady', () => {
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

		it('should call peers.discover', () => {
			return expect(peers.discover.calledOnce).to.be.ok;
		});

		it('should start peers discovery process by registering it in jobsQueue every 5 sec', () => {
			return expect(jobsQueueSpy).calledWith(
				'peersDiscoveryAndUpdate',
				sinon.match.func,
				30000
			);
		});
	});

	describe('discover', () => {
		var randomPeerStub;

		beforeEach(done => {
			PeersRewired.__set__('__private.updatePeerStatus', sinonSandbox.spy());
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

		it('should not call randomPeer.rpc.list if randomPeer.rpc.status operation has failed', done => {
			peers.discover(err => {
				expect(err).to.equal('Failed to get peer status');
				expect(randomPeerStub.rpc.list.called).to.be.false;
				done();
			});
		});
	});
});
