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
var randomstring = require('randomstring');

var prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;
var Peer = require('../../../logic/peer');
var generateRandomActivePeer = require('../../fixtures/peers')
	.generateRandomActivePeer;
var constants = require('../../../helpers/constants');

var generateMatchedAndUnmatchedBroadhashes = require('../common/helpers/peers')
	.generateMatchedAndUnmatchedBroadhashes;
var modulesLoader = require('../../common/modules_loader');
var random = require('../../common/utils/random');
var swagerHelper = require('../../../helpers/swagger');

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

		before(() => {
			validOptions = {};
			// Set TEST variable in case public ip address gets generated
			process.env['NODE_ENV'] = 'TEST';
		});

		after(() => {
			process.env['NODE_ENV'] = '';
		});

		beforeEach(done => {
			peers.list(validOptions, (err, peersResult) => {
				listResult = peersResult;
				done();
			});
		});

		describe('when logic.peers.list returns no records', () => {
			before(() => {
				systemModuleMock.getBroadhash = sinonSandbox.stub().returns();
				peersLogicMock.list = sinonSandbox.stub().returns([]);
			});

			it('should return an empty array', () => {
				expect(listResult).to.be.an('array').and.to.be.empty;
			});
		});

		describe('when logic.peers.list returns 1000 random connected peers', () => {
			before(() => {
				randomPeers = _.range(1000).map(() => {
					return generateRandomActivePeer();
				});
				peersLogicMock.list = sinonSandbox.stub().returns(randomPeers);
			});

			it('should return all 1000 peers', () => {
				expect(listResult)
					.be.an('array')
					.and.have.lengthOf(100);
			});

			describe('options.limit', () => {
				describe('when options.limit < 1000', () => {
					var validLimit;

					before(() => {
						validLimit = random.number(1, 1000);
						validOptions.limit = validLimit;
					});

					after(() => {
						delete validOptions.limit;
					});

					it('should return up to [options.limit] results', () => {
						expect(listResult)
							.be.an('array')
							.and.have.lengthOf(validLimit);
					});
				});

				describe('when no options.limit passed', () => {
					it('should return [constants.maxPeers] results', () => {
						expect(listResult)
							.be.an('array')
							.and.have.lengthOf(constants.maxPeers);
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
						_.range(1000).forEach(i => {
							randomPeers[i].broadhash =
								i < 250 ? validBroadhash : broadhashes.unmatchedBroadhashes[i];
						});
					});

					after(() => {
						delete validOptions.broadhash;
						delete validOptions.limit;
					});

					describe('when options.limit = 100', () => {
						before(() => {
							validLimit = 100;
							validOptions.limit = validLimit;
						});

						it('should return 100 results', () => {
							expect(listResult)
								.be.an('array')
								.and.have.lengthOf(100);
						});

						it('should return 100 results with the same broadhash', () => {
							expect(
								listResult.filter(peer => {
									return peer.broadhash === validBroadhash;
								})
							)
								.be.an('array')
								.and.have.lengthOf(100);
						});
					});

					describe('when options.limit = 500', () => {
						before(() => {
							validLimit = 500;
							validOptions.limit = validLimit;
						});

						it('should return 500 results', () => {
							expect(listResult)
								.be.an('array')
								.and.have.lengthOf(500);
						});

						it('should return 250 results with the same broadhash', () => {
							expect(
								listResult.filter(peer => {
									return peer.broadhash === validBroadhash;
								})
							)
								.be.an('array')
								.and.have.lengthOf(250);
						});

						it('should return 250 results with different broadhash', () => {
							expect(
								listResult.filter(peer => {
									return peer.broadhash !== validBroadhash;
								})
							)
								.be.an('array')
								.and.have.lengthOf(250);
						});

						describe('options.attempt', () => {
							after(() => {
								delete validOptions.attempt;
							});

							describe('when options.attempt = 0', () => {
								before(() => {
									validOptions.attempt = 0;
								});

								it('should return 250 results', () => {
									expect(listResult).to.have.lengthOf(250);
								});

								it('should return only peers matching broadhash', () => {
									listResult.forEach(peer => {
										expect(peer.broadhash).eql(validBroadhash);
									});
								});
							});

							describe('when options.attempt = 1', () => {
								before(() => {
									validOptions.attempt = 1;
								});

								it('should return 500 results', () => {
									expect(listResult).to.have.lengthOf(500);
								});

								it('should return only peers not matching broadhash', () => {
									listResult.forEach(peer => {
										expect(peer.broadhash).not.eql(validBroadhash);
									});
								});
							});
						});
					});
				});

				describe('when no options.limit passed', () => {
					it('should return [constants.maxPeers] results', () => {
						expect(listResult)
							.be.an('array')
							.and.have.lengthOf(constants.maxPeers);
					});
				});
			});
		});

		describe('when logic.peers.list returns 1000 random state peers and limit = 1000', () => {
			describe('options.allowedStates', () => {
				var CONNECTED_STATE = 2;
				var BANNED_STATE = 1;
				var DISCONNECTED_STATE = 0;

				before(() => {
					validOptions.limit = 1000;
					randomPeers = _.range(1000).map(() => {
						var peer = generateRandomActivePeer();
						peer.state = random.number(DISCONNECTED_STATE, CONNECTED_STATE + 1);
						return peer;
					});
					peersLogicMock.list = sinonSandbox.stub().returns(randomPeers);
				});

				after(() => {
					delete validOptions.limit;
				});

				it('should return only connected peers', () => {
					expect(_.uniqBy(listResult, 'state'))
						.be.an('array')
						.and.have.lengthOf(1);
					expect(listResult[0].state).equal(CONNECTED_STATE);
				});

				describe('when options.allowedStates = [1]', () => {
					before(() => {
						validOptions.allowedStates = [1];
					});

					after(() => {
						delete validOptions.allowedStates;
					});

					it('should return only banned peers', () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.lengthOf(1);
						expect(listResult[0].state).equal(BANNED_STATE);
					});
				});

				describe('when options.allowedStates = [0]', () => {
					before(() => {
						validOptions.allowedStates = [0];
					});

					after(() => {
						delete validOptions.allowedStates;
					});

					it('should return only disconnected peers', () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.lengthOf(1);
						expect(listResult[0].state).equal(DISCONNECTED_STATE);
					});
				});

				describe('when options.allowedStates = [0, 1]', () => {
					before(() => {
						validOptions.allowedStates = [0, 1];
					});

					after(() => {
						delete validOptions.allowedStates;
					});

					it('should return disconnected and banned peers', () => {
						expect(_.uniqBy(listResult, 'state'))
							.be.an('array')
							.and.have.length.at.least(1);
						listResult.forEach(state => {
							expect(state).not.to.equal(CONNECTED_STATE);
						});
					});
				});
			});
		});
	});

	describe('update', () => {
		var validPeer;
		var updateResult;
		var validUpsertResult;

		before(() => {
			validUpsertResult = true;
			validPeer = generateRandomActivePeer();
		});

		beforeEach(() => {
			peersLogicMock.upsert = sinonSandbox.stub().returns(validUpsertResult);
			updateResult = peers.update(validPeer);
		});

		it('should call logic.peers.upsert', () => {
			expect(peersLogicMock.upsert.calledOnce).to.be.true;
		});

		it('should call logic.peers.upsert with peer', () => {
			expect(peersLogicMock.upsert.calledWith(validPeer)).to.be.true;
		});

		it('should return library.logic.peers.upsert result', () => {
			expect(updateResult).equal(validUpsertResult);
		});
	});

	describe('remove', () => {
		var validPeer;
		var removeResult;
		var validLogicRemoveResult;

		before(() => {
			validLogicRemoveResult = true;
			validPeer = generateRandomActivePeer();
		});

		beforeEach(() => {
			peersLogicMock.remove = sinonSandbox
				.stub()
				.returns(validLogicRemoveResult);
			removeResult = peers.remove(validPeer);
		});

		describe('when removable peer is frozen', () => {
			var originalFrozenPeersList;
			var loggerDebugSpy;

			before(() => {
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
			});

			after(() => {
				modulesLoader.scope.config.peers.list = originalFrozenPeersList;
				loggerDebugSpy.restore();
			});

			it('should not call logic.peers.remove', () => {
				expect(peersLogicMock.remove.called).to.be.false;
			});

			it('should call logger.debug with message = "Cannot remove frozen peer"', () => {
				expect(loggerDebugSpy.calledWith('Cannot remove frozen peer')).to.be
					.true;
			});

			it('should call logger.debug with message = [ip:port]', () => {
				expect(loggerDebugSpy.args[0][1]).eql(
					`${validPeer.ip}:${validPeer.wsPort}`
				);
			});
		});

		describe('when removable peer is not frozen', () => {
			it('should call logic.peers.remove', () => {
				expect(peersLogicMock.remove.calledOnce).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected ip', () => {
				expect(
					peersLogicMock.remove.calledWith(
						sinonSandbox.match({ ip: validPeer.ip })
					)
				).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected port', () => {
				expect(
					peersLogicMock.remove.calledWith(
						sinonSandbox.match({ wsPort: validPeer.wsPort })
					)
				).to.be.true;
			});

			it('should return library.logic.peers.remove result', () => {
				expect(removeResult).equal(validLogicRemoveResult);
			});
		});
	});

	describe('getLastConsensus', () => {
		it('should return self.consensus value', () => {
			expect(peers.getLastConsensus()).equal(
				PeersRewired.__get__('self.consensus')
			);
		});
	});

	describe('calculateConsensus', () => {
		var validActive;
		var validMatched;
		var calculateConsensusResult;

		before(() => {
			validActive = null;
			validMatched = null;
			calculateConsensusResult = null;
			systemModuleMock.getBroadhash = sinonSandbox.stub().returns();
			peersLogicMock.list = sinonSandbox.stub().returns([]);
		});

		beforeEach(() => {
			calculateConsensusResult = peers.calculateConsensus(
				validActive,
				validMatched
			);
		});

		afterEach(() => {
			peersLogicMock.list.resetHistory();
		});

		it('should set self.consensus value', () => {
			expect(PeersRewired.__get__('self.consensus')).to.equal(
				calculateConsensusResult
			);
		});

		describe('when active peers not passed', () => {
			it('should call logic.peers.list', () => {
				expect(peersLogicMock.list.called).to.be.true;
			});

			it('should call logic.peers.list with true', () => {
				expect(peersLogicMock.list.calledWith(true)).to.be.true;
			});

			it('should return consensus as a number', () => {
				expect(calculateConsensusResult).to.be.a('number');
			});

			describe('when CONNECTED peers exists with matching broadhash', () => {
				before(() => {
					var connectedPeer = _.assign({}, prefixedPeer);
					connectedPeer.state = Peer.STATE.CONNECTED;
					peersLogicMock.list = sinonSandbox.stub().returns([connectedPeer]);
					systemModuleMock.getBroadhash = sinonSandbox
						.stub()
						.returns(connectedPeer.broadhash);
				});

				it('should return consensus = 100', () => {
					expect(calculateConsensusResult).to.equal(100);
				});
			});

			describe('when BANNED peers exists with matching broadhash', () => {
				before(() => {
					var bannedPeer = _.assign({}, prefixedPeer);
					bannedPeer.state = Peer.STATE.BANNED;
					peersLogicMock.list = sinonSandbox.stub().returns([bannedPeer]);
					systemModuleMock.getBroadhash = sinonSandbox
						.stub()
						.returns(bannedPeer.broadhash);
				});

				it('should return consensus = 0', () => {
					expect(calculateConsensusResult).to.equal(0);
				});
			});

			describe('when DISCONNECTED peers exists with matching broadhash', () => {
				before(() => {
					var disconnectedPeer = _.assign({}, prefixedPeer);
					disconnectedPeer.state = Peer.STATE.DISCONNECTED;
					peersLogicMock.list = sinonSandbox.stub().returns([disconnectedPeer]);
					systemModuleMock.getBroadhash = sinonSandbox
						.stub()
						.returns(disconnectedPeer.broadhash);
				});

				it('should return consensus = 0', () => {
					expect(calculateConsensusResult).to.equal(0);
				});
			});
		});

		describe('when matched peers not passed and there are 100 active peers', () => {
			var oneHundredActivePeers;
			var broadhashes;

			before(() => {
				oneHundredActivePeers = _.range(100).map(() => {
					return generateRandomActivePeer();
				});
				broadhashes = generateMatchedAndUnmatchedBroadhashes(100);
				systemModuleMock.getBroadhash = sinonSandbox
					.stub()
					.returns(broadhashes.matchedBroadhash);
				validActive = oneHundredActivePeers;
			});

			afterEach(() => {
				peersLogicMock.list.resetHistory();
			});

			after(() => {
				validActive = null;
			});

			describe('when non of active peers matches broadhash', () => {
				before(() => {
					oneHundredActivePeers.forEach((peer, index) => {
						peer.broadhash = broadhashes.unmatchedBroadhashes[index];
					});
				});

				it('should return consensus = 0', () => {
					expect(calculateConsensusResult).to.equal(0);
				});
			});

			describe('when all of active peers matches broadhash', () => {
				before(() => {
					oneHundredActivePeers.forEach(peer => {
						peer.broadhash = broadhashes.matchedBroadhash;
					});
				});

				it('should return consensus = 100', () => {
					expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when half of active peers matches broadhash', () => {
				before(() => {
					oneHundredActivePeers.forEach((peer, i) => {
						peer.broadhash =
							i < 50
								? broadhashes.matchedBroadhash
								: broadhashes.unmatchedBroadhashes[i];
					});
				});

				it('should return consensus = 50', () => {
					expect(calculateConsensusResult).equal(50);
				});
			});
		});

		describe('when called with active and matched arguments', () => {
			describe('when there are 10 active and 10 matched peers', () => {
				before(() => {
					validActive = _.range(10).map(generateRandomActivePeer);
					validMatched = _.range(10).map(generateRandomActivePeer);
				});

				it('should return consensus = 100', () => {
					expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are [constants.maxPeers] active and [constants.maxPeers] matched peers', () => {
				before(() => {
					validActive = _.range(constants.maxPeers).map(
						generateRandomActivePeer
					);
					validMatched = _.range(constants.maxPeers).map(
						generateRandomActivePeer
					);
				});

				it('should return consensus = 100', () => {
					expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are [constants.maxPeers] x 10 active and [constants.maxPeers] matched peers', () => {
				before(() => {
					validActive = _.range(10 * constants.maxPeers).map(
						generateRandomActivePeer
					);
					validMatched = _.range(constants.maxPeers).map(
						generateRandomActivePeer
					);
				});

				it('should return consensus = 100', () => {
					expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are [constants.maxPeers] active and [constants.maxPeers] x 10 matched peers', () => {
				before(() => {
					validActive = _.range(constants.maxPeers).map(
						generateRandomActivePeer
					);
					validMatched = _.range(10 * constants.maxPeers).map(
						generateRandomActivePeer
					);
				});

				it('should return consensus = 100', () => {
					expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are 50 active and 100 matched peers', () => {
				before(() => {
					validActive = _.range(50).map(generateRandomActivePeer);
					validMatched = _.range(100).map(generateRandomActivePeer);
				});

				it('should return consensus = 100', () => {
					expect(calculateConsensusResult).equal(100);
				});
			});

			describe('when there are 100 active and 50 matched peers', () => {
				before(() => {
					validActive = _.range(100).map(generateRandomActivePeer);
					validMatched = _.range(50).map(generateRandomActivePeer);
				});

				it('should return consensus = 50', () => {
					expect(calculateConsensusResult).equal(50);
				});
			});
		});
	});

	describe('acceptable', () => {
		before(() => {
			systemModuleMock.getNonce = sinonSandbox.stub().returns(NONCE);
			process.env['NODE_ENV'] = 'DEV';
		});

		it('should accept peer with public ip', () => {
			expect(peers.acceptable([prefixedPeer]))
				.that.is.an('array')
				.and.to.deep.equal([prefixedPeer]);
		});

		it('should not accept peer with private ip', () => {
			var privatePeer = _.clone(prefixedPeer);
			privatePeer.ip = '127.0.0.1';
			expect(peers.acceptable([privatePeer])).that.is.an('array').and.to.be
				.empty;
		});

		it("should not accept peer with host's nonce", () => {
			var peer = _.clone(prefixedPeer);
			peer.nonce = NONCE;
			expect(peers.acceptable([peer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with different ip but the same nonce', () => {
			process.env['NODE_ENV'] = 'TEST';
			var meAsPeer = {
				ip: '40.00.40.40',
				wsPort: 4001,
				nonce: NONCE,
			};
			expect(peers.acceptable([meAsPeer])).that.is.an('array').and.to.be.empty;
		});

		after(() => {
			process.env['NODE_ENV'] = 'TEST';
		});
	});

	describe('onBlockchainReady', () => {
		var originalPeersList;

		beforeEach(() => {
			originalPeersList = PeersRewired.__get__('library.config.peers.list');
			PeersRewired.__set__('library.config.peers.list', []);
			peersLogicMock.create = sinonSandbox.stub().returnsArg(0);
			sinonSandbox.stub(peers, 'discover');
		});

		afterEach(() => {
			PeersRewired.__set__('library.config.peers.list', originalPeersList);
			peers.discover.restore();
		});

		it('should update peers during onBlockchainReady', done => {
			peers.onBlockchainReady();
			setTimeout(() => {
				expect(peers.discover.calledOnce).to.be.ok;
				done();
			}, 100);
		});

		it('should update peers list onBlockchainReady even if rpc.status call fails', done => {
			var peerStub = {
				rpc: {
					status: sinonSandbox
						.stub()
						.callsArgWith(0, 'Failed to get peer status'),
				},
				applyHeaders: sinonSandbox.stub(),
			};

			PeersRewired.__set__('library.config.peers.list', [peerStub]);
			peersLogicMock.upsert = sinonSandbox.spy();

			peers.onBlockchainReady();
			setTimeout(() => {
				expect(peersLogicMock.upsert.calledWith(peerStub, false)).to.be.true;
				done();
			}, 100);
		});
	});

	describe('onPeersReady', () => {
		before(() => {
			peersLogicMock.list = sinonSandbox.stub().returns([]);
			sinonSandbox.stub(peers, 'discover').callsArgWith(0, null);
		});

		after(() => {
			peers.discover.restore();
		});

		it('should update peers during onBlockchainReady', done => {
			peers.onPeersReady();
			setTimeout(() => {
				expect(peers.discover.calledOnce).to.be.ok;
				done();
			}, 100);
		});
	});

	describe('discover', () => {
		var randomPeerStub;
		var revertPrivateStubs;

		beforeEach(() => {
			revertPrivateStubs = PeersRewired.__set__({
				__private: {
					updatePeerStatus: sinonSandbox.spy(),
				},
			});
			randomPeerStub = {
				rpc: {
					status: sinonSandbox
						.stub()
						.callsArgWith(0, 'Failed to get peer status'),
					list: sinonSandbox.spy(),
				},
			};
			peers.list = sinonSandbox.stub().callsArgWith(1, null, [randomPeerStub]);
		});

		afterEach(() => {
			revertPrivateStubs();
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
