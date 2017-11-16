'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var sinon = require('sinon');
var rewire = require('rewire');
var randomstring = require('randomstring');
var _ = require('lodash');

var config = require('../../config.json');
var randomPeer = require('../../common/objectStubs').randomPeer;
var range = require('../../common/utils').range;
var randomInt = require('../../common/utils').randomInt;
var generateRandomActivePeer = require('../../common/objectStubs').generateRandomPeer;
var modulesLoader = require('../../common/initModule').modulesLoader;
var Peer = require('../../../logic/peer');
var constants = require('../../../helpers/constants');

var currentPeers = [];

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

	describe.skip('update', function () {

		it('should insert new peer', function (done) {
			peers.update(randomPeer);

			getPeers(function (err, peersResult) {
				expect(currentPeers.length + 1).that.equals(peersResult.length);
				currentPeers = peersResult;
				var inserted = peersResult.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				expect(inserted).to.be.an('object');
				expect(inserted).not.to.be.empty;
				done();
			});
		});

		it('should update existing peer', function (done) {
			var toUpdate = _.clone(randomPeer);
			toUpdate.height += 1;
			peers.update(toUpdate);

			getPeers(function (err, peersResult) {
				expect(currentPeers.length).that.equals(peersResult.length);
				currentPeers = peersResult;
				var updated = peersResult.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				expect(updated).to.be.an('object');
				expect(updated).not.to.be.empty;
				expect(updated.ip + ':' + updated.port).that.equals(randomPeer.ip + ':' + randomPeer.port);
				expect(updated.height).that.equals(toUpdate.height);
				done();
			});
		});

		it('should insert new peer if ip or port changed', function (done) {
			var toUpdate = _.clone(randomPeer);
			toUpdate.port += 1;
			peers.update(toUpdate);

			getPeers(function (err, peersResult) {
				expect(currentPeers.length + 1).that.equals(peersResult.length);
				currentPeers = peersResult;
				var inserted = peersResult.find(function (p) {
					return p.ip + ':' + p.port === toUpdate.ip + ':' + toUpdate.port;
				});
				expect(inserted).to.be.an('object');
				expect(inserted).not.to.be.empty;
				expect(inserted.ip + ':' + inserted.port).that.equals(toUpdate.ip + ':' + toUpdate.port);

				toUpdate.ip = '40.40.40.41';
				peers.update(toUpdate);
				getPeers(function (err, peersResult) {
					expect(currentPeers.length + 1).that.equals(peersResult.length);
					currentPeers = peersResult;
					var inserted = peersResult.find(function (p) {
						return p.ip + ':' + p.port === toUpdate.ip + ':' + toUpdate.port;
					});
					expect(inserted).to.be.an('object');
					expect(inserted).not.to.be.empty;
					expect(inserted.ip + ':' + inserted.port).that.equals(toUpdate.ip + ':' + toUpdate.port);
					done();
				});
			});
		});

		var ipAndPortPeer = {
			ip: '40.41.40.41',
			port: 4000
		};

		it('should insert new peer with only ip and port defined', function (done) {
			peers.update(ipAndPortPeer);

			getPeers(function (err, peersResult) {
				expect(currentPeers.length + 1).that.equals(peersResult.length);
				currentPeers = peersResult;
				var inserted = peersResult.find(function (p) {
					return p.ip + ':' + p.port === ipAndPortPeer.ip + ':' + ipAndPortPeer.port;
				});
				expect(inserted).to.be.an('object');
				expect(inserted).not.to.be.empty;
				expect(inserted.ip + ':' + inserted.port).that.equals(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
				done();
			});
		});

		it('should update peer with only one property defined', function (done) {
			peers.update(ipAndPortPeer);

			getPeers(function (err, peersResult) {
				currentPeers = peersResult;

				var almostEmptyPeer = _.clone(ipAndPortPeer);
				almostEmptyPeer.height = 1;

				peers.update(almostEmptyPeer);
				getPeers(function (err, peersResult) {
					expect(currentPeers.length).that.equals(peersResult.length);
					var inserted = peersResult.find(function (p) {
						return p.ip + ':' + p.port === ipAndPortPeer.ip + ':' + ipAndPortPeer.port;
					});
					expect(inserted).to.be.an('object');
					expect(inserted).not.to.be.empty;
					expect(inserted.ip + ':' + inserted.port).that.equals(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
					expect(inserted.height).that.equals(almostEmptyPeer.height);
					done();
				});
			});
		});
	});

	describe.skip('remove', function () {

		before(function (done) {
			peers.update(randomPeer);
			done();
		});

		it('should remove added peer', function (done) {
			getPeers(function (err, peersResult) {
				currentPeers = peersResult;
				var peerToRemove = currentPeers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				expect(peerToRemove).to.be.an('object').and.not.to.be.empty;
				expect(peerToRemove.state).that.equals(2);

				expect(peers.remove(peerToRemove.ip, peerToRemove.port)).to.be.ok;
				getPeers(function (err, peersResult) {
					expect(currentPeers.length - 1).that.equals(peersResult.length);
					currentPeers = peersResult;
					done();
				});
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

		before(function () {
			peersLogicMock.create = sinon.stub().returnsArg(0);
			modules.transport.onBind(modules);
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
				peers.discover.restore();
				done();
			}, 100);
		});
	});

	describe('onPeersReady', function () {

		before(function () {
			modules.transport.onBind(modules);
		});

		it('should update peers during onBlockchainReady', function (done) {
			sinon.stub(peers, 'discover').callsArgWith(0, null);
			peers.onPeersReady();
			setTimeout(function () {
				expect(peers.discover.calledOnce).to.be.ok;
				peers.discover.restore();
				done();
			}, 100);
		});
	});
});
