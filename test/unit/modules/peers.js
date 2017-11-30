'use strict';

var _ = require('lodash');
var expect = require('chai').expect;
var rewire = require('rewire');
var randomstring = require('randomstring');
var sinon = require('sinon');

var constants = require('../../../helpers/constants');
var generateMatchedAndUnmatchedBroadhashes = require('../common/helpers/peers').generateMatchedAndUnmatchedBroadhashes;
var generateRandomActivePeer = require('../../common/objectStubs').generateRandomActivePeer;
var modulesLoader = require('../../common/modulesLoader');
var randomInt = require('../../common/helpers').randomInt;
var randomPeer = require('../../common/objectStubs').randomNormalizedPeer;

describe('peers', function () {

	var dbMock;
	var peers;
	var PeersRewired;
	var modules;

	var peersLogicMock;
	var systemModuleMock;
	var transportModuleMock;

	var NONCE = randomstring.generate(16);

	before(function () {
		dbMock = {
			any: sinon.stub().resolves()
		};
		PeersRewired = rewire('../../../modules/peers');
		peersLogicMock = {
			create: sinon.spy(),
			exists: sinon.stub(),
			get: sinon.stub(),
			list: sinon.stub(),
			upsert: sinon.stub(),
			remove: sinon.stub()
		};
		systemModuleMock = {};
		transportModuleMock = {};
		modules = {
			system: systemModuleMock,
			transport: transportModuleMock
		};
	});

	before(function (done) {
		modulesLoader.scope.nonce = NONCE;
		new PeersRewired(function (err, peersModule) {
			peers = peersModule;
			peers.onBind(modules);
			done();
		}, _.assign({}, modulesLoader.scope, {logic: {peers: peersLogicMock}, db: dbMock}));
	});

	describe('list', function () {

		var listError;
		var listResult;
		var validOptions;
		var randomPeers;

		before(function () {
			validOptions = {};
			// Set TEST variable in case of public ip address gets generated
			process.env['NODE_ENV'] = 'TEST';
		});

		after(function () {
			process.env['NODE_ENV'] = '';
		});

		beforeEach(function (done) {
			peers.list(validOptions, function (err, peersResult) {
				listError = err;
				listResult = peersResult;
				done();
			});
		});

		describe('when logic.peers.list returns no records', function () {

			before(function () {
				systemModuleMock.getBroadhash = sinon.stub().returns();
				peersLogicMock.list = sinon.stub().returns([]);
			});

			it('should return an empty array', function () {
				expect(listResult).to.be.an('array').and.to.be.empty;
			});
		});

		describe('when logic.peers.list returns 1000 random connected peers', function () {

			before(function () {
				randomPeers = _.range(1000).map(function () {
					return generateRandomActivePeer();
				});
				peersLogicMock.list = sinon.stub().returns(randomPeers);
			});

			it('should return all 1000 peers', function () {
				expect(listResult).be.an('array').and.have.lengthOf(100);
			});

			describe('options.limit', function () {

				describe('when options.limit < 1000', function () {

					var validLimit;

					before(function () {
						validLimit = randomInt(1, (1000 - 1));
						validOptions.limit = validLimit;
					});

					after(function () {
						delete validOptions.limit;
					});

					it('should return up to [options.limit] results', function () {
						expect(listResult).be.an('array').and.have.lengthOf(validLimit);
					});
				});

				describe('when no options.limit passed', function () {

					it('should return [constants.maxPeers] results', function () {
						expect(listResult).be.an('array').and.have.lengthOf(constants.maxPeers);
					});
				});
			});

			describe('options.broadhash', function () {

				describe('when 250 peers matching and 750 not matching broadhash', function () {

					var validBroadhash;
					var validLimit;

					before(function () {
						// Ensure that different than checking broadhashes will be generated
						var broadhashes = generateMatchedAndUnmatchedBroadhashes(750);
						validBroadhash = broadhashes.matchedBroadhash;
						validOptions.broadhash = validBroadhash;
						// 250 peers matching broadhash, next 750 with different one
						_.range(1000).forEach(function (i) {
							randomPeers[i].broadhash = i < 250 ? validBroadhash : broadhashes.unmatchedBroadhashes[i];
						});
					});

					after(function () {
						delete validOptions.broadhash;
						delete validOptions.limit;
					});

					describe('when options.limit = 100', function () {

						before(function () {
							validLimit = 100;
							validOptions.limit = validLimit;
						});

						it('should return 100 results', function () {
							expect(listResult).be.an('array').and.have.lengthOf(100);
						});

						it('should return 100 results with the same broadhash', function () {
							expect(listResult.filter(function (peer) {
								return peer.broadhash === validBroadhash;
							})).be.an('array').and.have.lengthOf(100);
						});
					});

					describe('when options.limit = 500', function () {

						before(function () {
							validLimit = 500;
							validOptions.limit = validLimit;
						});

						it('should return 500 results', function () {
							expect(listResult).be.an('array').and.have.lengthOf(500);
						});

						it('should return 250 results with the same broadhash', function () {
							expect(listResult.filter(function (peer) {
								return peer.broadhash === validBroadhash;
							})).be.an('array').and.have.lengthOf(250);
						});

						it('should return 250 results with different broadhash', function () {
							expect(listResult.filter(function (peer) {
								return peer.broadhash !== validBroadhash;
							})).be.an('array').and.have.lengthOf(250);
						});

						describe('options.attempt', function () {

							after(function () {
								delete validOptions.attempt;
							});

							describe('when options.attempt = 0', function () {

								before(function () {
									validOptions.attempt = 0;
								});

								it('should return 250 results', function () {
									expect(listResult).to.have.lengthOf(250);
								});

								it('should return only peers matching broadhash', function () {
									listResult.forEach(function (peer) {
										expect(peer.broadhash).eql(validBroadhash);
									});
								});
							});

							describe('when options.attempt = 1', function () {

								before(function () {
									validOptions.attempt = 1;
								});

								it('should return 500 results', function () {
									expect(listResult).to.have.lengthOf(500);
								});

								it('should return only peers not matching broadhash', function () {
									listResult.forEach(function (peer) {
										expect(peer.broadhash).not.eql(validBroadhash);
									});
								});
							});
						});
					});
				});

				describe('when no options.limit passed', function () {

					it('should return [constants.maxPeers] results', function () {
						expect(listResult).be.an('array').and.have.lengthOf(constants.maxPeers);
					});
				});
			});
		});

		describe('when logic.peers.list returns 1000 random state peers and limit = 1000', function () {

			describe('options.allowedStates', function () {

				var CONNECTED_STATE = 2;
				var BANNED_STATE = 1;
				var DISCONNECTED_STATE = 0;

				before(function () {
					validOptions.limit = 1000;
					randomPeers = _.range(1000).map(function () {
						var peer = generateRandomActivePeer();
						peer.state = randomInt(DISCONNECTED_STATE, CONNECTED_STATE);
						return peer;
					});
					peersLogicMock.list = sinon.stub().returns(randomPeers);
				});

				after(function () {
					delete validOptions.limit;
				});

				it('should return only connected peers', function () {
					expect(_.uniqBy(listResult, 'state')).be.an('array').and.have.lengthOf(1);
					expect(listResult[0].state).equal(CONNECTED_STATE);
				});

				describe('when options.allowedStates = [1]', function () {

					before(function () {
						validOptions.allowedStates = [1];
					});

					after(function () {
						delete validOptions.allowedStates;
					});

					it('should return only banned peers', function () {
						expect(_.uniqBy(listResult, 'state')).be.an('array').and.have.lengthOf(1);
						expect(listResult[0].state).equal(BANNED_STATE);
					});
				});

				describe('when options.allowedStates = [0]', function () {

					before(function () {
						validOptions.allowedStates = [0];
					});

					after(function () {
						delete validOptions.allowedStates;
					});

					it('should return only disconnected peers', function () {
						expect(_.uniqBy(listResult, 'state')).be.an('array').and.have.lengthOf(1);
						expect(listResult[0].state).equal(DISCONNECTED_STATE);
					});
				});

				describe('when options.allowedStates = [0, 1]', function () {

					before(function () {
						validOptions.allowedStates = [0, 1];
					});

					after(function () {
						delete validOptions.allowedStates;
					});

					it('should return disconnected and banned peers', function () {
						expect(_.uniqBy(listResult, 'state')).be.an('array').and.have.length.at.least(1);
						listResult.forEach(function (state) {
							expect(state).not.to.equal(CONNECTED_STATE);
						});
					});
				});
			});
		});
	});

	describe('update', function () {

		var validPeer;
		var updateResult;
		var validUpsertResult;

		before(function () {
			validUpsertResult = true;
			validPeer = generateRandomActivePeer();
		});

		beforeEach(function () {
			peersLogicMock.upsert = sinon.stub().returns(validUpsertResult);
			updateResult = peers.update(validPeer);
		});

		it('should call logic.peers.upsert', function () {
			expect(peersLogicMock.upsert.calledOnce).to.be.true;
		});

		it('should call logic.peers.upsert with peer', function () {
			expect(peersLogicMock.upsert.calledWith(validPeer)).to.be.true;
		});

		it('should return library.logic.peers.upsert result', function () {
			expect(updateResult).equal(validUpsertResult);
		});
	});

	describe('remove', function () {

		var validPeer;
		var removeResult;
		var validLogicRemoveResult;

		before(function () {
			validLogicRemoveResult = true;
			validPeer = generateRandomActivePeer();
		});

		beforeEach(function () {
			peersLogicMock.remove = sinon.stub().returns(validLogicRemoveResult);
			removeResult = peers.remove(validPeer);
		});

		describe('when removable peer is frozen', function () {

			var originalFrozenPeersList;
			var loggerDebugSpy;

			before(function () {
				originalFrozenPeersList = _.assign({}, modulesLoader.scope.config.peers.list);
				modulesLoader.scope.config.peers.list = [{
					ip: validPeer.ip,
					port: validPeer.port
				}];
				loggerDebugSpy = sinon.spy(modulesLoader.scope.logger, 'debug');
			});

			after(function () {
				modulesLoader.scope.config.peers.list = originalFrozenPeersList;
				loggerDebugSpy.restore();
			});

			it('should not call logic.peers.remove', function () {
				expect(peersLogicMock.remove.called).to.be.false;
			});

			it('should call logger.debug with message = "Cannot remove frozen peer"', function () {
				expect(loggerDebugSpy.calledWith('Cannot remove frozen peer')).to.be.true;
			});

			it('should call logger.debug with message = [ip:port]', function () {
				expect(loggerDebugSpy.args[0][1]).eql(validPeer.ip + ':' + validPeer.port);
			});
		});

		describe('when removable peer is not frozen', function () {

			it('should call logic.peers.remove', function () {
				expect(peersLogicMock.remove.calledOnce).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected ip', function () {
				expect(peersLogicMock.remove.calledWith(sinon.match({ip: validPeer.ip}))).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected port', function () {
				expect(peersLogicMock.remove.calledWith(sinon.match({port: validPeer.port}))).to.be.true;
			});

			it('should return library.logic.peers.remove result', function () {
				expect(removeResult).equal(validLogicRemoveResult);
			});
		});
	});

	describe('getConsensus', function () {

		var validActive;
		var validMatched;
		var getConsensusResult;
		var originalForgingForce;

		before(function () {
			validActive = null;
			validMatched = null;
			getConsensusResult = null;
			originalForgingForce = PeersRewired.__get__('library.config.forging.force');
			systemModuleMock.getBroadhash = sinon.stub().returns();
			peersLogicMock.list = sinon.stub().returns([]);
		});

		after(function () {
			PeersRewired.__set__('library.config.forging.force', originalForgingForce);
		});

		beforeEach(function () {
			getConsensusResult = peers.getConsensus(validActive, validMatched);
		});

		afterEach(function () {
			peersLogicMock.list.resetHistory();
		});

		describe('when config.forging.force = true', function () {

			before(function () {
				PeersRewired.__set__('library.config.forging.force', true);
			});

			it('should return undefined', function () {
				expect(getConsensusResult).to.be.undefined;
			});
		});

		describe('when config.forging.force = false', function () {

			before(function () {
				PeersRewired.__set__('library.config.forging.force', false);
				peersLogicMock.list = sinon.stub().returns([]);
			});

			afterEach(function () {
				peersLogicMock.list.resetHistory();
			});

			describe('when active peers not passed', function () {

				it('should call logic.peers.list', function () {
					expect(peersLogicMock.list.called).to.be.true;
				});

				it('should call logic.peers.list with true', function () {
					expect(peersLogicMock.list.calledWith(true)).to.be.true;
				});

				it('should return consensus as a number', function () {
					expect(getConsensusResult).to.be.a('number');
				});
			});

			describe('when matched peers not passed and there are 100 active peers', function () {

				var oneHundredActivePeers;
				var broadhashes;

				before(function () {
					oneHundredActivePeers = _.range(100).map(function () {
						return generateRandomActivePeer();
					});
					broadhashes = generateMatchedAndUnmatchedBroadhashes(100);
					systemModuleMock.getBroadhash = sinon.stub().returns(broadhashes.matchedBroadhash);
					validActive = oneHundredActivePeers;
				});

				afterEach(function () {
					peersLogicMock.list.resetHistory();
				});

				after(function () {
					validActive = null;
				});

				describe('when non of active peers matches broadhash', function () {

					before(function () {
						oneHundredActivePeers.forEach(function (peer, index) {
							peer.broadhash = broadhashes.unmatchedBroadhashes[index];
						});
					});

					it('should return consensus = 0', function () {
						expect(getConsensusResult).to.equal(0);
					});
				});

				describe('when all of active peers matches broadhash', function () {

					before(function () {
						oneHundredActivePeers.forEach(function (peer) {
							peer.broadhash = broadhashes.matchedBroadhash;
						});
					});

					it('should return consensus = 100', function () {
						expect(getConsensusResult).equal(100);
					});
				});

				describe('when half of active peers matches broadhash', function () {

					before(function () {
						oneHundredActivePeers.forEach(function (peer, i) {
							peer.broadhash = i < 50 ? broadhashes.matchedBroadhash : broadhashes.unmatchedBroadhashes[i];
						});
					});

					it('should return consensus = 50', function () {
						expect(getConsensusResult).equal(50);
					});
				});
			});

			describe('when called with active and matched arguments', function () {

				describe('when there are 10 active and 10 matched peers', function () {

					before(function () {
						validActive = _.range(10).map(generateRandomActivePeer);
						validMatched = _.range(10).map(generateRandomActivePeer);
					});

					it('should return consensus = 100', function () {
						expect(getConsensusResult).equal(100);
					});
				});

				describe('when there are [constants.maxPeers] active and [constants.maxPeers] matched peers', function () {

					before(function () {
						validActive = _.range(constants.maxPeers).map(generateRandomActivePeer);
						validMatched = _.range(constants.maxPeers).map(generateRandomActivePeer);
					});

					it('should return consensus = 100', function () {
						expect(getConsensusResult).equal(100);
					});
				});

				describe('when there are [constants.maxPeers] x 10 active and [constants.maxPeers] matched peers', function () {

					before(function () {
						validActive = _.range(10 * constants.maxPeers).map(generateRandomActivePeer);
						validMatched = _.range(constants.maxPeers).map(generateRandomActivePeer);
					});

					it('should return consensus = 100', function () {
						expect(getConsensusResult).equal(100);
					});
				});

				describe('when there are [constants.maxPeers] active and [constants.maxPeers] x 10 matched peers', function () {

					before(function () {
						validActive = _.range(constants.maxPeers).map(generateRandomActivePeer);
						validMatched = _.range(10 * constants.maxPeers).map(generateRandomActivePeer);
					});

					it('should return consensus = 100', function () {
						expect(getConsensusResult).equal(100);
					});
				});

				describe('when there are 50 active and 100 matched peers', function () {

					before(function () {
						validActive = _.range(50).map(generateRandomActivePeer);
						validMatched = _.range(100).map(generateRandomActivePeer);
					});

					it('should return consensus = 100', function () {
						expect(getConsensusResult).equal(100);
					});
				});

				describe('when there are 100 active and 50 matched peers', function () {

					before(function () {
						validActive = _.range(100).map(generateRandomActivePeer);
						validMatched = _.range(50).map(generateRandomActivePeer);
					});

					it('should return consensus = 50', function () {
						expect(getConsensusResult).equal(50);
					});
				});
			});
		});
	});

	describe('acceptable', function () {

		before(function () {
			systemModuleMock.getNonce = sinon.stub().returns(NONCE);
			process.env['NODE_ENV'] = 'DEV';
		});

		it('should accept peer with public ip', function () {
			expect(peers.acceptable([randomPeer])).that.is.an('array').and.to.deep.equal([randomPeer]);
		});

		it('should not accept peer with private ip', function () {
			var privatePeer = _.clone(randomPeer);
			privatePeer.ip = '127.0.0.1';
			expect(peers.acceptable([privatePeer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with host\'s nonce', function () {
			var peer = _.clone(randomPeer);
			peer.nonce = NONCE;
			expect(peers.acceptable([peer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with different ip but the same nonce', function () {
			process.env['NODE_ENV'] = 'TEST';
			var meAsPeer = {
				ip: '40.00.40.40',
				port: 4001,
				nonce: NONCE
			};
			expect(peers.acceptable([meAsPeer])).that.is.an('array').and.to.be.empty;
		});

		after(function () {
			process.env['NODE_ENV'] = 'TEST';
		});
	});

	describe('onBlockchainReady', function () {

		var originalPeersList;

		before(function () {
			originalPeersList = PeersRewired.__get__('library.config.peers.list');
			PeersRewired.__set__('library.config.peers.list', []);
			peersLogicMock.create = sinon.stub().returnsArg(0);
		});

		after(function () {
			PeersRewired.__set__('library.config.peers.list', originalPeersList);
		});

		it('should update peers during onBlockchainReady', function (done) {
			sinon.stub(peers, 'discover').callsArgWith(0, null);
			var config = require('../../config.json');
			var initialPeers = _.clone(config.peers.list);
			if (initialPeers.length === 0) {
				config.peers.list.push(randomPeer);
			}
			peers.onBlockchainReady();
			setTimeout(function () {
				expect(peers.discover.calledOnce).to.be.ok;
				done();
			}, 100);
		});
	});

	describe('onPeersReady', function () {

		before(function () {
			peersLogicMock.list = sinon.stub().returns([]);
			peers.discover = sinon.stub().callsArgWith(0, null);
		});

		it('should update peers during onBlockchainReady', function (done) {
			peers.onPeersReady();
			setTimeout(function () {
				expect(peers.discover.calledOnce).to.be.ok;
				done();
			}, 100);
		});
	});
});
