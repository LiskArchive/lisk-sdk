'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var randomstring = require('randomstring');
var _ = require('lodash');

var randomPeer = require('../../common/objectStubs').randomPeer;
var randomInt = require('../../common/helpers').randomInt;
var generateRandomActivePeer = require('../../common/objectStubs').generateRandomActivePeer;
var modulesLoader = require('../../common/initModule').modulesLoader;
var constants = require('../../../helpers/constants');

describe('peers', function () {

	var peers;
	var peersLogicMock;
	var modules;

	var NONCE = randomstring.generate(16);

	before(function () {
		peersLogicMock = {
			create: sinon.spy(),
			exists: sinon.stub(),
			get: sinon.stub(),
			list: sinon.stub(),
			upsert: sinon.stub(),
			remove: sinon.stub()
		};
	});

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			peers = __modules.peers;
			modules = __modules;
			peers.onBind(__modules);
			done(err);
		}, {
			nonce: NONCE,
			logic: {
				peers: peersLogicMock
			}
		});
	});

	describe('sandboxApi', function () {

		it('should pass the call', function () {
			var sandboxHelper = require('../../../helpers/sandbox.js');
			sinon.stub(sandboxHelper, 'callMethod').returns(true);
			peers.sandboxApi();
			expect(sandboxHelper.callMethod.calledOnce).to.be.ok;
			sandboxHelper.callMethod.restore();
		});
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
				peersLogicMock.list.reset();
				peersLogicMock.list.returns([]);
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
				peersLogicMock.list.returns(randomPeers);
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

					afterEach(function () {
						// List arguments are mutated - needs to be overwritten after every test
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
						var characterNotPresentInValidBroadhash = '@';
						validBroadhash = randomstring.generate({
							length: 64,
							custom: 'abcdefghijklmnopqrstuvwxyz0123456789!$&_.'
						});
						validOptions.broadhash = validBroadhash;
						// 250 peers matching broadhash, next 750 with different one
						_.range(1000).forEach(function (i) {
							randomPeers[i].broadhash = i < 250 ? validBroadhash :
								randomstring.generate({
									length: 63,
									custom: 'abcdefghijklmnopqrstuvwxyz0123456789!$&_.'
								}) + characterNotPresentInValidBroadhash;
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

						afterEach(function () {
							// List arguments are mutated - needs to be overwritten after every test
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
					peersLogicMock.list.returns(randomPeers);
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
			peersLogicMock.upsert.reset();
			peersLogicMock.upsert.returns(validUpsertResult);
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

		describe('when peer state != 2', function () {

			var differentThanTwoState = 1;

			before(function () {
				validPeer.state = differentThanTwoState;
			});

			it('should call logic.peers.upsert with peer containing state = 2 anyway', function () {
				expect(peersLogicMock.upsert.calledWith(sinon.match({state: 2}))).to.be.true;
			});
		});
	});

	describe('remove', function () {

		var validIp;
		var validPort;
		var removeResult;
		var validLogicRemoveResult;

		before(function () {
			validLogicRemoveResult = true;
			var validPeer = generateRandomActivePeer();
			validIp = validPeer.ip;
			validPort = validPeer.port;
		});

		beforeEach(function () {
			peersLogicMock.remove.reset();
			peersLogicMock.remove.returns(validLogicRemoveResult);
			removeResult = peers.remove(validIp, validPort);
		});

		describe('when removable peer is frozen', function () {

			var originalFrozenPeersList;
			var loggerDebugSpy;

			before(function () {
				originalFrozenPeersList = _.assign({}, modulesLoader.scope.config.peers.list);
				modulesLoader.scope.config.peers.list = [{
					ip: validIp,
					port: validPort
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
				expect(loggerDebugSpy.args[0][1]).eql(validIp + ':' + validPort);
			});
		});

		describe('when removable peer is not frozen', function () {

			it('should call logic.peers.remove', function () {
				expect(peersLogicMock.remove.calledOnce).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected ip', function () {
				expect(peersLogicMock.remove.calledWith(sinon.match({ip: validIp}))).to.be.true;
			});

			it('should call logic.peers.remove with object containing expected port', function () {
				expect(peersLogicMock.remove.calledWith(sinon.match({port: validPort}))).to.be.true;
			});

			it('should return library.logic.peers.remove result', function () {
				expect(removeResult).equal(validLogicRemoveResult);
			});
		});
	});

	describe('acceptable', function () {

		before(function () {
			process.env['NODE_ENV'] = 'DEV';
		});

		var ip = require('ip');

		it('should accept peer with public ip', function () {
			expect(peers.acceptable([randomPeer])).that.is.an('array').and.to.deep.equal([randomPeer]);
		});

		it('should not accept peer with private ip', function () {
			var privatePeer = _.clone(randomPeer);
			privatePeer.ip = '127.0.0.1';
			expect(peers.acceptable([privatePeer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with lisk-js-api os', function () {
			var privatePeer = _.clone(randomPeer);
			privatePeer.os = 'lisk-js-api';
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

	describe('ping', function () {

		it('should accept peer with public ip', function (done) {
			sinon.stub(modules.transport, 'getFromPeer').callsArgWith(2, null, {
				success: true,
				peer: randomPeer,
				body: {
					success: true, height: randomPeer.height, peers: [randomPeer]
				}
			});

			peers.ping(randomPeer, function (err, res) {
				expect(modules.transport.getFromPeer.calledOnce).to.be.ok;
				expect(modules.transport.getFromPeer.calledWith(randomPeer)).to.be.ok;
				modules.transport.getFromPeer.restore();
				done();
			});
		});
	});

	describe('onBlockchainReady', function () {

		var peersDiscoverStub;
		var pingStub;

		before(function () {
			peersLogicMock.create = sinon.stub().returnsArg(0);
			modules.transport.onBind(modules);
			peersDiscoverStub = sinon.stub(peers, 'discover');
			modulesLoader.scope.config.peers.list = [];
			peersLogicMock.create.returnsArg(0);
			pingStub = sinon.stub(peers, 'ping');
		});

		after(function () {
			pingStub.restore();
		});

		it('should update peers during onBlockchainReady', function (done) {
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
			peersLogicMock.list.returns([]);
			peers.discover = sinon.stub();
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
