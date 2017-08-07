'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var sinon = require('sinon');
var _  = require('lodash');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var config = require('../../config.json');
var Peer = require('../../../logic/peer');
var modulesLoader = require('../../common/initModule').modulesLoader;
var randomPeer = require('../../common/objectStubs').randomPeer;
var wsRPC = require('../../../api/ws/rpc/wsRPC').wsRPC;

var currentPeers = [];

describe('peers', function () {

	before(function () {
		process.env['NODE_ENV'] = 'TEST';
	});

	var peers, modules, NONCE;

	function getPeers (cb) {
		peers.list({normalized: false}, function (err, __peers) {
			expect(err).to.not.exist;
			expect(__peers).to.be.an('array');
			return cb(err, __peers);
		});
	}

	function removeAll (done) {
		peers.list({}, function (err, __peers) {
			__peers.forEach(function (peer) {
				peers.remove(peer);
			});
			done();
		});
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
		currentPeers = [];
		removeAll(done);
	});

	describe('update', function () {

		beforeEach(function (done) {
			removeAll(done);
			currentPeers = [];
		});

		it('should insert new peer', function (done) {
			peers.update(randomPeer);
			getPeers(function (err, __peers) {
				expect(__peers).to.be.an('array').and.to.have.lengthOf(1);
				expect(__peers[0]).to.have.property('string').equal(randomPeer.ip + ':' + randomPeer.port);
				done();
			});
		});


		it('should insert new peer with only ip and port and state defined', function (done) {

			var ipAndPortPeer = {
				ip: '40.40.40.43',
				port: 4000,
				state: 2
			};

			peers.update(ipAndPortPeer);

			getPeers(function (err, __peers) {
				expect(__peers).to.be.an('array').and.to.have.lengthOf(1);
				expect(__peers[0]).to.have.property('string').equal(ipAndPortPeer.ip + ':' + ipAndPortPeer.port);
				done();
			});
		});


		it('should update existing peer', function (done) {

			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				expect(__peers[0]).to.have.property('height').equal(randomPeer.height);
				var toUpdate = _.clone(randomPeer);
				toUpdate.height += 1;
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					expect(__peers[0]).to.have.property('height').equal(toUpdate.height);
					done();
				});
			});

		});

		it('should not insert new peer if address changed but nonce is the same', function (done) {

			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				expect(__peers[0]).to.have.property('string').equal(randomPeer.ip + ':' + randomPeer.port);
				var toUpdate = _.clone(randomPeer);
				toUpdate.port += 1;
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					expect(__peers[0]).to.have.property('string').equal(randomPeer.ip + ':' + randomPeer.port);
					done();
				});
			});

		});

		it('should not insert new peer if address changed but nonce is the same', function (done) {

			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				expect(__peers[0]).to.have.property('string').equal(randomPeer.ip + ':' + randomPeer.port);
				var toUpdate = _.clone(randomPeer);
				toUpdate.port += 1;
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					expect(__peers[0]).to.have.property('string').equal(randomPeer.ip + ':' + randomPeer.port);
					done();
				});
			});
		});


		it('should insert new peer if address and nonce changed', function (done) {

			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				expect(__peers[0]).to.have.property('string').equal(randomPeer.ip + ':' + randomPeer.port);
				var secondPeer = _.clone(randomPeer);
				secondPeer.port += 1;
				secondPeer.nonce = 'someDifferentNonce';
				peers.update(secondPeer);
				getPeers(function (err, __peers) {
					expect(__peers).to.have.a.lengthOf(2);
					var peersAddresses = __peers.map(function (p) {
						return p.string;
					});
					expect(peersAddresses.indexOf(randomPeer.ip + ':' + randomPeer.port) !== -1).to.be.ok;
					expect(peersAddresses.indexOf(secondPeer.ip + ':' + secondPeer.port) !== -1).to.be.ok;
					done();
				});
			});
		});
	});

	describe('list', function () {

		beforeEach(function (done) {
			removeAll(done);
		});

		it('should list empty peers list when no peers were inserted before', function (done) {
			peers.list({}, function (err, __peers) {
				expect(__peers).to.be.an('array').and.to.have.lengthOf(0);
				done();
			});
		});

		it('should list the inserted peer after insert', function (done) {
			peers.update(randomPeer);
			peers.list({}, function (err, __peers) {
				expect(__peers).to.be.an('array').and.to.have.lengthOf(1);
				done();
			});
		});

		it('should list the inserted peer as Peer instance with normalized parameter set to false', function (done) {
			peers.update(randomPeer);
			peers.list({normalized: false}, function (err, __peers) {
				expect(__peers[0]).to.be.an.instanceof(Peer);
				done();
			});
		});

		it('should list the inserted peer as object with normalized parameter set to true', function (done) {
			peers.update(randomPeer);
			peers.list({normalized: true}, function (err, __peers) {
				expect(__peers[0]).to.be.an.instanceof(Object);
				done();
			});
		});

		it('should list the inserted peer as object without set normalized parameter', function (done) {
			peers.update(randomPeer);
			peers.list({}, function (err, __peers) {
				expect(__peers[0]).to.be.an.instanceof(Object);
				done();
			});
		});
	});

	describe('remove', function () {

		it('should remove added peer', function (done) {

			peers.update(randomPeer);

			getPeers(function (err, __peers) {
				expect(__peers).to.be.an('array').and.to.have.lengthOf(1);
				expect(peers.remove(randomPeer)).to.be.ok;
				getPeers(function (err, __peers) {
					expect(__peers).to.be.an('array').and.to.have.lengthOf(0);
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
