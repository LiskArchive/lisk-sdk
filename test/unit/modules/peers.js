'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var sinon = require('sinon');
var _  = require('lodash');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var config = require('../../config.json');
var modulesLoader = require('../../common/initModule').modulesLoader;
var Peer = require('../../../logic/peer');
var randomPeer = require('../../common/objectStubs').randomPeer;
var wsRPC = require('../../../api/ws/rpc/wsRPC').wsRPC;

var currentPeers = [];


describe('peers', function () {

	before(function () {
		process.env['NODE_ENV'] = 'TEST';
	});

	var peers, modules, NONCE;

	function getPeers (cb) {
		peers.list({}, function (err, __peers) {
			expect(err).to.not.exist;
			expect(__peers).to.be.an('array');
			return cb(err, __peers);
		});
	}

	function removeAll () {
		peers.list().forEach(function (peer) {
			peers.remove(peer);
		});

		expect(peers.list()).that.is.an('array').and.to.be.empty;
	}

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			if (err) {
				return done(err);
			}
			peers = __modules.peers;
			modules = __modules;
			NONCE = __modules.system.getNonce();
			peers.onBind(modules);
			done();
		}, {});
	});

	beforeEach(function (done) {
		getPeers(function (err, __peers) {
			currentPeers = __peers;
			done();
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

	describe('update', function () {
		
		beforeEach(function (done) {
			getPeers(function (err, __peers) {
				currentPeers = __peers;
				done();
			})
		});

		it('should insert new peer', function (done) {
			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
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

			getPeers(function (err, __peers) {
				expect(currentPeers.length).that.equals(__peers.length);
				currentPeers = __peers;
				var updated = __peers.find(function (p) {
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

			getPeers(function (err, __peers) {
				expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === toUpdate.ip + ':' + toUpdate.port;
				});
				expect(inserted).to.be.an('object');
				expect(inserted).not.to.be.empty;
				expect(inserted.ip + ':' + inserted.port).that.equals(toUpdate.ip + ':' + toUpdate.port);

				toUpdate.ip = '40.40.40.41';
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					expect(currentPeers.length + 1).that.equals(__peers.length);
					currentPeers = __peers;
					var inserted = __peers.find(function (p) {
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
			ip: '40.40.40.43',
			port: 4000,
			nonce: 'newrandomnonce'
		};

		it('should insert new peer with only ip and port defined', function (done) {
			peers.update(ipAndPortPeer);

			getPeers(function (err, __peers) {
				expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === ipAndPortPeer.ip + ':' + ipAndPortPeer.port;
				});
				expect(inserted).to.be.an('object');
				expect(inserted).not.to.be.empty;
				expect(inserted.ip + ':' + inserted.port).that.equals(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
				done();
			});
		});

		it('should update peer with only one header defined', function (done) {
			peers.update(ipAndPortPeer);

			getPeers(function (err, __peers) {
				currentPeers = __peers;

				var almostEmptyPeer = _.clone(ipAndPortPeer);
				almostEmptyPeer.height = 1;

				peers.update(almostEmptyPeer);
				getPeers(function (err, __peers) {
					expect(currentPeers.length).that.equals(__peers.length);
					var inserted = __peers.find(function (p) {
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

	describe('ban', function () {

		var peerToBan;

		before(function (done) {
			peerToBan = _.clone(randomPeer);
			peerToBan.port += 1;
			peers.update(peerToBan);
			done();
		});

		it('should ban active peer', function (done) {
			getPeers(function (err, __peers) {
				currentPeers = __peers;
				peerToBan = __peers.find(function (p) {
					return p.ip + ':' + p.port === peerToBan.ip + ':' + peerToBan.port;
				});
				expect(peerToBan).to.be.an('object').and.not.to.be.empty;
				expect(peerToBan.state).that.equals(2);

				expect(peers.ban(peerToBan.ip, peerToBan.port, 1)).to.be.ok;
				getPeers(function (err, __peers) {
					expect(currentPeers.length - 1).that.equals(__peers.length);
					currentPeers = __peers;
					done();
				});
			});
		});
	});

	describe('remove', function () {

		before(function (done) {
			peers.update(randomPeer);
			done();
		});

		it('should remove added peer', function (done) {
			getPeers(function (err, __peers) {
				currentPeers = __peers;
				var peerToRemove = currentPeers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				expect(peerToRemove).to.be.an('object').and.not.to.be.empty;
				expect(peerToRemove.state).that.equals(2);

				expect(peers.remove(peerToRemove.ip, peerToRemove.port)).to.be.ok;
				getPeers(function (err, __peers) {
					expect(currentPeers.length - 1).that.equals(__peers.length);
					currentPeers = __peers;
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

	describe('events', function () {
		before(function () {
			modules.transport.onBind(modules);

			var testWampServer = new MasterWAMPServer({on: sinon.spy()}, {});

			var usedRPCEndpoints = {
				status: function () {}
			};

			sinon.stub(usedRPCEndpoints, 'status').callsArgWith(0, null, {
				success: true,
				broadhash: '123456789broadhash',
				nethash: '123456789nethash'
			});

			testWampServer.registerRPCEndpoints(usedRPCEndpoints);
			wsRPC.setServer(testWampServer);
		});

		describe('onBlockchainReady', function () {

			it('should update peers during onBlockchainReady', function (done) {
				sinon.stub(peers, 'discover').callsArgWith(0, null);
				var config = require('../../config.json');
				var initialPeers = _.clone(config.peers.list);
				if (initialPeers.length === 0) {
					config.peers.list.push(randomPeer);
				}
				peers.onBlockchainReady();

				setTimeout(function () {
					expect(peers.discover.called).to.be.ok;
					peers.discover.restore();
					done();
				}, 500);
			});
		});

		describe('onPeersReady', function () {

			it('should update peers during onBlockchainReady', function (done) {
				sinon.stub(peers, 'discover').callsArgWith(0, null);
				peers.onPeersReady();
				setTimeout(function () {
					expect(peers.discover.called).to.be.ok;
					peers.discover.restore();
					done();
				}, 500);
			});
		});
	});
});
