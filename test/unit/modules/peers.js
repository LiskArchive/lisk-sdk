'use strict';

var chai = require('chai');
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');
var node = require('../../node.js');
var randomPeer = require('../../common/objectStubs').randomPeer;
var modulesStub = require('../../common/objectStubs').modulesStub;

var modulesLoader = require('../../common/initModule').modulesLoader;

var currentPeers = [];

describe('peers', function () {

	var peers, modules;

	function getPeers (cb) {
		peers.list({broadhash: node.config.nethash}, function (err, __peers) {
			node.expect(err).to.not.exist;
			node.expect(__peers).to.be.an('array');
			return cb(err, __peers);
		});
	}

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			if (err) {
				return done(err);
			}
			peers = __modules.peers;
			modules = __modules;
			peers.onBind(modules);
			done();
		});
	});

	beforeEach(function (done) {
		getPeers(function (err, __peers) {
			currentPeers = __peers;
			done();
		});
	});

	describe('sandboxApi', function (done) {
		it('should pass the call', function () {
			var sandboxHelper = require('../../../helpers/sandbox.js');
			sinon.stub(sandboxHelper, 'callMethod').returns(true);
			peers.sandboxApi();
			node.expect(sandboxHelper.callMethod.calledOnce).to.be.ok;
			sandboxHelper.callMethod.restore();
		});
	});

	describe('update', function () {

		it('should insert new peer', function (done) {
			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				node.expect(inserted).to.be.an('object');
				node.expect(inserted).not.to.be.empty;
				done();
			});
		});

		it('should update existing peer', function (done) {
			var toUpdate = _.clone(randomPeer);
			toUpdate.height += 1;
			peers.update(toUpdate);

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length).that.equals(__peers.length);
				currentPeers = __peers;
				var updated = __peers.find(function (p) {
					return p.ip + ':' + p.port === randomPeer.ip + ':' + randomPeer.port;
				});
				node.expect(updated).to.be.an('object');
				node.expect(updated).not.to.be.empty;
				node.expect(updated.ip + ':' + updated.port).that.equals(randomPeer.ip + ':' + randomPeer.port);
				node.expect(updated.height).that.equals(toUpdate.height);
				done();
			});
		});

		it('should insert new peer if ip or port changed', function (done) {
			var toUpdate = _.clone(randomPeer);
			toUpdate.port += 1;
			peers.update(toUpdate);

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === toUpdate.ip + ':' + toUpdate.port;
				});
				node.expect(inserted).to.be.an('object');
				node.expect(inserted).not.to.be.empty;
				node.expect(inserted.ip + ':' + inserted.port).that.equals(toUpdate.ip + ':' + toUpdate.port);

				toUpdate.ip = '40.40.40.41';
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length + 1).that.equals(__peers.length);
					currentPeers = __peers;
					var inserted = __peers.find(function (p) {
						return p.ip + ':' + p.port === toUpdate.ip + ':' + toUpdate.port;
					});
					node.expect(inserted).to.be.an('object');
					node.expect(inserted).not.to.be.empty;
					node.expect(inserted.ip + ':' + inserted.port).that.equals(toUpdate.ip + ':' + toUpdate.port);
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

			getPeers(function (err, __peers) {
				node.expect(currentPeers.length + 1).that.equals(__peers.length);
				currentPeers = __peers;
				var inserted = __peers.find(function (p) {
					return p.ip + ':' + p.port === ipAndPortPeer.ip + ':' + ipAndPortPeer.port;
				});
				node.expect(inserted).to.be.an('object');
				node.expect(inserted).not.to.be.empty;
				node.expect(inserted.ip + ':' + inserted.port).that.equals(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
				done();
			});
		});

		it('should update peer with only one property defined', function (done) {
			peers.update(ipAndPortPeer);

			getPeers(function (err, __peers) {
				currentPeers = __peers;

				var almostEmptyPeer = _.clone(ipAndPortPeer);
				almostEmptyPeer.height = 1;

				peers.update(almostEmptyPeer);
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length).that.equals(__peers.length);
					var inserted = __peers.find(function (p) {
						return p.ip + ':' + p.port === ipAndPortPeer.ip + ':' + ipAndPortPeer.port;
					});
					node.expect(inserted).to.be.an('object');
					node.expect(inserted).not.to.be.empty;
					node.expect(inserted.ip + ':' + inserted.port).that.equals(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
					node.expect(inserted.height).that.equals(almostEmptyPeer.height);

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
				node.expect(peerToBan).to.be.an('object').and.not.to.be.empty;
				node.expect(peerToBan.state).that.equals(2);

				node.expect(peers.ban(peerToBan.ip, peerToBan.port, 1)).to.be.ok;
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length - 1).that.equals(__peers.length);
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
				node.expect(peerToRemove).to.be.an('object').and.not.to.be.empty;
				node.expect(peerToRemove.state).that.equals(2);

				node.expect(peers.remove(peerToRemove.ip, peerToRemove.port)).to.be.ok;
				getPeers(function (err, __peers) {
					node.expect(currentPeers.length - 1).that.equals(__peers.length);
					currentPeers = __peers;
					done();
				});
			});
		});
	});

	describe('acceptable', function () {

		var ip = require('ip');

		it('should accept peer with public ip', function () {
			node.expect(peers.acceptable([randomPeer])).that.is.an('array').and.to.deep.equal([randomPeer]);
		});

		it('should not accept peer with private ip', function () {
			var privatePeer = _.clone(randomPeer);
			privatePeer.ip = '127.0.0.1';
			node.expect(peers.acceptable([privatePeer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with host\'s ip', function () {
			var meAsPeer = _.clone(randomPeer);
			meAsPeer.ip = ip.address('public', 'ipv4');
			node.expect(peers.acceptable([meAsPeer])).that.is.an('array').and.to.be.empty;
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
				node.expect(modules.transport.getFromPeer.calledOnce).to.be.ok;
				node.expect(modules.transport.getFromPeer.calledWith(randomPeer)).to.be.ok;
				modules.transport.getFromPeer.restore();
				done();
			});
		});
	});

	describe('onBlockchainReady', function () {

		before(function () {
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
				node.expect(peers.discover.calledOnce).to.be.ok;
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
				node.expect(peers.discover.calledOnce).to.be.ok;
				peers.discover.restore();
				done();
			}, 100);
		});
	});
});
