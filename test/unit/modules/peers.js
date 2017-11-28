'use strict';

var _  = require('lodash');
var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var randomstring = require('randomstring');
var sinon = require('sinon');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var config = require('../../data/config.json');
var Peer = require('../../../logic/peer');
var PeersLogic = require('../../../logic/peers');
var PeersModule = require('../../../modules/peers');
var modulesLoader = require('../../common/modulesLoader');
var prefixedPeer = require('../../fixtures/peers').peer;
var wsRPC = require('../../../api/ws/rpc/wsRPC').wsRPC;

describe('peers', function () {

	var peers;
	var systemNonce;

	function getPeers (cb) {
		peers.list({normalized: false}, function (err, __peers) {
			expect(err).to.not.exist;
			expect(__peers).to.be.an('array');
			return cb(err, __peers);
		});
	}

	function removeAll (done) {
		peers.list({normalized: false}, function (err, __peers) {
			__peers.forEach(function (peer) {
				peers.remove(peer);
			});
			getPeers(function (err, __peers) {
				expect(__peers).to.have.a.lengthOf(0);
				done();
			});
		});
	}

	before(function (done) {

		process.env['NODE_ENV'] = 'TEST';
		systemNonce = randomstring.generate(16);

		var systemModuleMock = {
			getNonce: sinon.stub().returns(systemNonce),
			getBroadhash: sinon.stub().returns(config.nethash)
		};

		new PeersLogic(modulesLoader.scope.logger, function (err, __peersLogic) {
			modulesLoader.scope.logic = {
				peers: __peersLogic
			};
			new PeersModule(function (err, __peers) {
				peers = __peers;
				peers.onBind({system: systemModuleMock});
				__peersLogic.bindModules({peers: peers});
				done();
			}, modulesLoader.scope);
		});
	});

	beforeEach(function (done) {
		removeAll(done);
	});

	describe('update', function () {

		it('should insert new peer', function (done) {
			peers.update(prefixedPeer);
			getPeers(function (err, __peers) {
				expect(__peers).to.be.an('array').and.to.have.lengthOf(1);
				expect(__peers[0]).to.have.property('string').equal(prefixedPeer.ip + ':' + prefixedPeer.port);
				done();
			});
		});

		it('should insert new peer with only ip, port and state', function (done) {

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

			peers.update(prefixedPeer);

			getPeers(function (err, __peers) {
				expect(__peers[0]).to.have.property('height').equal(prefixedPeer.height);
				var toUpdate = _.clone(prefixedPeer);
				toUpdate.height += 1;
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					expect(__peers[0]).to.have.property('height').equal(toUpdate.height);
					done();
				});
			});

		});

		it('should not insert new peer if address changed but nonce is the same', function (done) {

			peers.update(prefixedPeer);

			getPeers(function (err, __peers) {
				expect(__peers[0]).to.have.property('string').equal(prefixedPeer.ip + ':' + prefixedPeer.port);
				var toUpdate = _.clone(prefixedPeer);
				toUpdate.port += 1;
				peers.update(toUpdate);
				getPeers(function (err, __peers) {
					expect(__peers[0]).to.have.property('string').equal(prefixedPeer.ip + ':' + prefixedPeer.port);
					done();
				});
			});

		});

		it('should insert new peer if address and nonce changed', function (done) {

			peers.update(prefixedPeer);

			getPeers(function (err, __peers) {
				expect(__peers[0]).to.have.property('string').equal(prefixedPeer.ip + ':' + prefixedPeer.port);
				var secondPeer = _.clone(prefixedPeer);
				secondPeer.port += 1;
				secondPeer.nonce = randomstring.generate(16);
				peers.update(secondPeer);
				getPeers(function (err, __peers) {
					expect(__peers).to.have.a.lengthOf(2);
					var peersAddresses = __peers.map(function (p) {
						return p.string;
					});
					expect(peersAddresses.indexOf(prefixedPeer.ip + ':' + prefixedPeer.port) !== -1).to.be.ok;
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

		describe('when inserted', function () {

			beforeEach(function () {
				peers.update(prefixedPeer);
			});

			it('should list the inserted peer after insert', function (done) {
				peers.list({}, function (err, __peers) {
					expect(__peers).to.be.an('array').and.to.have.lengthOf(1);
					done();
				});
			});

			it('should list the inserted peer as Peer instance with normalized parameter set to false', function (done) {
				peers.list({normalized: false}, function (err, __peers) {
					expect(__peers[0]).to.be.an.instanceof(Peer);
					done();
				});
			});

			it('should list the inserted peer as object with normalized parameter set to true', function (done) {
				peers.list({normalized: true}, function (err, __peers) {
					expect(__peers[0]).to.be.an.instanceof(Object);
					done();
				});
			});

			it('should list the inserted peer as object without set normalized parameter', function (done) {
				peers.list({}, function (err, __peers) {
					expect(__peers[0]).to.be.an.instanceof(Object);
					done();
				});
			});
		});
	});

	describe('remove', function () {

		it('should remove added peer', function (done) {

			peers.update(prefixedPeer);

			getPeers(function (err, __peers) {
				expect(__peers).to.be.an('array').and.to.have.lengthOf(1);
				expect(peers.remove(prefixedPeer)).to.be.ok;
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
			expect(peers.acceptable([prefixedPeer])).that.is.an('array').and.to.deep.equal([prefixedPeer]);
		});

		it('should not accept peer with private ip', function () {
			var privatePeer = _.clone(prefixedPeer);
			privatePeer.ip = '127.0.0.1';
			expect(peers.acceptable([privatePeer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with host\'s nonce', function () {
			var peer = _.clone(prefixedPeer);
			peer.nonce = systemNonce;
			expect(peers.acceptable([peer])).that.is.an('array').and.to.be.empty;
		});

		it('should not accept peer with different ip but the same nonce', function () {
			process.env['NODE_ENV'] = 'TEST';
			var meAsPeer = {
				ip: '40.00.40.40',
				port: 4001,
				nonce: systemNonce
			};
			expect(peers.acceptable([meAsPeer])).that.is.an('array').and.to.be.empty;
		});

		after(function () {
			process.env['NODE_ENV'] = 'TEST';
		});
	});

	describe('events', function () {
		before(function () {
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
