'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');
var modulesLoader = require('../../common/initModule').modulesLoader;
var randomPeer = require('../../common/objectStubs').randomPeer;
var Peers = require('../../../logic/peers.js');
var Peer = require('../../../logic/peer.js');

describe('peers', function () {

	var peers;

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			if (err) {
				return done(err);
			}
			__modules.peers.onBind(__modules);

			var peersModuleMock = {
				acceptable: function (peers) {
					return peers;
				}
			};

			modulesLoader.initLogic(Peers, modulesLoader.scope, function (err, __peers) {
				peers = __peers;
				peers.bindModules({peers: peersModuleMock});
				done();
			});
		}, {});
	});

	function removeAll () {
		peers.list().forEach(function (peer) {
			peers.remove(peer);
		});

		expect(peers.list()).that.is.an('array').and.to.be.empty;
	}

	function arePeersEqual (peerA, peerB) {
		var allPeersProperties = function (peer) {
			return 	_.keys(peer).every(function (property) {
				return Peer.prototype.properties.concat(['string', 'rpc']).indexOf(property) !== -1;
			});
		};

		if (!allPeersProperties(peerA)) {
			throw new Error('Not a peer: ', peerA);
		}

		if (!allPeersProperties(peerB)) {
			throw new Error('Not a peer: ', peerB);
		}

		var commonProperties = _.intersection(_.keys(peerA), _.keys(peerB));

		if (commonProperties.indexOf('ip') === -1 || commonProperties.indexOf('port') === -1) {
			throw new Error('Insufficient data to compare the peers (no port or ip provided)');
		}

		return commonProperties.every(function (property) {
			return peerA[property] === peerB[property];
		});
	}

	describe('create', function () {
		it('should always return Peer instance', function () {
			expect(peers.create()).to.be.an.instanceof(Peer);
			expect(peers.create(randomPeer)).to.be.an.instanceof(Peer);
			expect(peers.create(new Peer(randomPeer))).to.be.an.instanceof(Peer);
		});
	});

	describe('list', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should list peers as Peer instances', function () {
			peers.upsert(randomPeer);
			peers.list().forEach(function (peer) {
				expect(peer).to.be.an.instanceof(Peer);
			});
		});

		it('should list peers with rpc', function () {
			peers.upsert(randomPeer);
			peers.list().forEach(function (peer) {
				expect(peer).have.property('rpc');
			});
		});

		describe('when normalized', function () {
			it('should list peers as objects when normalized', function () {
				peers.upsert(randomPeer);
				peers.list(true).forEach(function (peer) {
					expect(peer).to.be.an('object');
				});
			});

			it('should not contain rpc property when normalized', function () {
				peers.upsert(randomPeer);
				peers.list(true).forEach(function (peer) {
					expect(peer).not.to.have.property('rpc');
				});
			});
		});
	});

	describe('upsert', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should insert new peers', function () {
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);
		});

		it('should update height of existing peer', function () {
			peers.upsert(randomPeer);
			var list = peers.list();
			var inserted = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(inserted, randomPeer)).to.be.ok;

			var modifiedPeer = _.clone(randomPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer);
			list = peers.list();
			var updated = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(updated, modifiedPeer)).to.be.ok;
			expect(arePeersEqual(updated, randomPeer)).to.be.not.ok;

		});

		it('should not update height with insertOnly param', function () {
			peers.upsert(randomPeer);
			var list = peers.list();
			var inserted = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(inserted, randomPeer)).to.be.ok;

			var modifiedPeer = _.clone(randomPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer, true);
			list = peers.list();
			var updated = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(updated, modifiedPeer)).to.be.not.ok;
			expect(arePeersEqual(updated, randomPeer)).to.be.ok;
		});

		it('should insert peer with different ports', function () {
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);

			var differentPortPeer = _.clone(randomPeer);
			differentPortPeer.nonce = 'differentNonce';
			differentPortPeer.port += 1;
			peers.upsert(differentPortPeer);
			var list = peers.list();
			expect(list.length).equal(2);

			var demandedPorts = _.map([randomPeer, differentPortPeer], 'port');
			var listPorts = _.map(list, 'port');

			expect(_.isEqual(demandedPorts.sort(), listPorts.sort())).to.be.ok;
		});

		it('should insert peer with different ips', function () {
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);

			var differentIpPeer = _.clone(randomPeer);
			differentIpPeer.ip = '40.40.40.41';
			differentIpPeer.nonce = 'differentNonce';

			expect(differentIpPeer.ip).to.not.equal(randomPeer);
			peers.upsert(differentIpPeer);
			var list = peers.list();
			expect(list.length).equal(2);

			var demandedIps = _.map([randomPeer, differentIpPeer], 'ip');
			var listIps = _.map(list, 'ip');

			expect(_.isEqual(demandedIps.sort(), listIps.sort())).to.be.ok;
		});
	});

	describe('exists', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should return false if peer is not on the list', function () {
			expect(peers.exists({
				ip: '41.41.41.41',
				port: '4444',
				nonce: 'another_nonce'
			})).not.to.be.ok;
		});

		it('should return true if peer is on the list', function () {
			peers.upsert(randomPeer);
			var list = peers.list(true);
			expect(list.length).equal(1);
			expect(peers.exists(randomPeer)).to.be.ok;
		});

		it.skip('should return true if peer with same nonce is on the list', function () {
			peers.upsert(randomPeer);
			var list = peers.list(true);
			expect(list.length).equal(1);
			expect(peers.exists({nonce: randomPeer.nonce})).to.be.ok;
		});

		it('should return true if peer with same address is on the list', function () {
			peers.upsert(randomPeer);
			var list = peers.list(true);
			expect(list.length).equal(1);
			expect(peers.exists({ip: randomPeer.ip, port: randomPeer.port})).to.be.ok;
		});


	});

	describe('get', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should return inserted peer', function () {
			peers.upsert(randomPeer);
			var insertedPeer = peers.get(randomPeer);
			expect(arePeersEqual(insertedPeer, randomPeer)).to.be.ok;
		});

		it('should return inserted peer by address', function () {
			peers.upsert(randomPeer);
			var insertedPeer = peers.get(randomPeer.ip + ':' + randomPeer.port);
			expect(arePeersEqual(insertedPeer, randomPeer)).to.be.ok;

		});

		it('should return undefined if peer is not inserted', function () {
			expect(peers.get(randomPeer)).to.be.undefined;
		});
	});

	describe('remove', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should remove added peer', function () {
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);
			var result = peers.remove(randomPeer);
			expect(result).to.be.ok;
			expect(peers.list().length).equal(0);
		});

		it('should return false when trying to remove non inserted peer', function () {
			var result = peers.remove(randomPeer);
			expect(result).to.be.not.ok;
			expect(peers.list().length).equal(0);
		});
	});

	describe('peersManager', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should have all fields empty at start', function () {
			expect(peers.peersManager).to.have.property('peers').and.to.be.empty;
			expect(peers.peersManager).to.have.property('addressToNonceMap').and.to.be.empty;
			expect(peers.peersManager).to.have.property('nonceToAddressMap').and.to.be.empty;
		});

		describe('add', function () {

			var validPeer = new Peer(randomPeer);

			beforeEach(function () {
				validPeer = new Peer(randomPeer);
				_.each(peers.peersManager.getAll(), function (peer) {
					peers.peersManager.remove(peer);
				});
			});


			it('should insert valid peer and update fields', function () {
				peers.peersManager.add(validPeer);
				var expectedPeer = {};
				expectedPeer[validPeer.string] = validPeer;
				expect(peers.peersManager.peers).to.eql(expectedPeer);
				expect(peers.peersManager.addressToNonceMap).to.eql({'40.40.40.40:5000': 'randomnonce'});
				expect(peers.peersManager.nonceToAddressMap).to.eql({'randomnonce': '40.40.40.40:5000'});
			});

			it('should not duplicate entries in fields', function () {
				peers.peersManager.add(validPeer);
				peers.peersManager.add(validPeer);
				var expectedPeer = {
					'40.40.40.40:5000': validPeer
				};
				expect(peers.peersManager.peers).to.eql(expectedPeer);
				expect(peers.peersManager.addressToNonceMap).to.eql({'40.40.40.40:5000': 'randomnonce'});
				expect(peers.peersManager.nonceToAddressMap).to.eql({'randomnonce': '40.40.40.40:5000'});
			});

			it('should not insert peer without address', function () {
				delete validPeer.string;
				peers.peersManager.add(validPeer);
				expect(peers.peersManager.peers).to.eql({});
				expect(peers.peersManager.addressToNonceMap).to.eql({});
				expect(peers.peersManager.nonceToAddressMap).to.eql({});
			});

			it('should be possible to add peer without nonce but without entry in nonceToAddressMap', function () {
				delete validPeer.nonce;
				peers.peersManager.add(validPeer);
				var expectedPeer = {
					'40.40.40.40:5000': validPeer
				};
				expect(peers.peersManager.peers).to.eql(expectedPeer);
				expect(peers.peersManager.addressToNonceMap).to.eql({'40.40.40.40:5000': undefined});
				expect(peers.peersManager.nonceToAddressMap).to.eql({});
			});

			it('should not be possible to add 2 peers with different addresses but same nonce', function () {
				var peerB = _.clone(validPeer);
				peerB.string = '50.40.40.40:4000';

				peers.peersManager.add(validPeer);
				peers.peersManager.add(peerB);

				expect(peers.peersManager.peers).to.eql({
					'40.40.40.40:5000': validPeer
				});
				expect(peers.peersManager.addressToNonceMap).to.eql({'40.40.40.40:5000': 'randomnonce'});
				expect(peers.peersManager.nonceToAddressMap).to.eql({'randomnonce': '40.40.40.40:5000'});
			});

			it('should not be possible to add multiple entries', function () {
				var peerA = validPeer;
				var peerB = _.clone(validPeer);
				peerB.string = '50.40.40.40:4000';
				peerB.nonce = 'peerBNonce';

				peers.peersManager.add(peerA);
				peers.peersManager.add(peerB);

				var expectedPeers = {
					'40.40.40.40:5000': peerA,
					'50.40.40.40:4000': peerB
				};

				expect(peers.peersManager.peers).to.eql(expectedPeers);
				expect(peers.peersManager.addressToNonceMap).to.eql({
					'40.40.40.40:5000': 'randomnonce',
					'50.40.40.40:4000': 'peerBNonce'
				});
				expect(peers.peersManager.nonceToAddressMap).to.eql({
					'randomnonce': '40.40.40.40:5000',
					'peerBNonce': '50.40.40.40:4000'
				});
			});
		});

		describe('remove', function () {

			var validPeer = new Peer(randomPeer);

			beforeEach(function () {
				validPeer = new Peer(randomPeer);
				_.each(peers.peersManager.getAll(), function (peer) {
					peers.peersManager.remove(peer);
				});
			});

			it('remove entry from all fields', function () {
				peers.peersManager.add(validPeer);
				peers.peersManager.remove(validPeer);
				expect(peers.peersManager.peers).to.eql({});
				expect(peers.peersManager.addressToNonceMap).to.eql({});
				expect(peers.peersManager.nonceToAddressMap).to.eql({});
			});

		});

		describe('getByNonce', function () {

			var validPeer = new Peer(randomPeer);

			beforeEach(function () {
				validPeer = new Peer(randomPeer);
				_.each(peers.peersManager.getAll(), function (peer) {
					peers.peersManager.remove(peer);
				});
			});

			it('should return added peer relying on his nonce', function () {
				peers.peersManager.add(validPeer);
				var receivedPeer = peers.peersManager.getByNonce(validPeer.nonce);
				expect(receivedPeer).to.eql(validPeer);
			});

			it('should return undefined for not existing peers', function () {
				var receivedPeer = peers.peersManager.getByNonce('notExistingNonce');
				expect(receivedPeer).to.be.undefined;
			});

		});

		describe('getByAddress', function () {

			var validPeer = new Peer(randomPeer);

			beforeEach(function () {
				validPeer = new Peer(randomPeer);
				_.each(peers.peersManager.getAll(), function (peer) {
					peers.peersManager.remove(peer);
				});
			});

			it('should return added peer relying on his nonce', function () {
				peers.peersManager.add(validPeer);
				var receivedPeer = peers.peersManager.getByAddress(validPeer.string);
				expect(receivedPeer).to.eql(validPeer);
			});

			it('should return undefined for not existing peers', function () {
				var receivedPeer = peers.peersManager.getByAddress('notExistingAddress');
				expect(receivedPeer).to.be.undefined;
			});

		});

		describe('getNonce', function () {

			var validPeer = new Peer(randomPeer);

			beforeEach(function () {
				validPeer = new Peer(randomPeer);
				_.each(peers.peersManager.getAll(), function (peer) {
					peers.peersManager.remove(peer);
				});
			});

			it('should return nonce of added peer', function () {
				peers.peersManager.add(validPeer);
				var receivedNonce = peers.peersManager.getNonce(validPeer.string);
				expect(receivedNonce).to.eql(validPeer.nonce);
			});

			it('should return undefined no peer with given nonce was added', function () {
				var receivedNonce = peers.peersManager.getNonce('notExistingAddress');
				expect(receivedNonce).to.be.undefined;
			});

		});

		describe('getAddress', function () {

			var validPeer = new Peer(randomPeer);

			beforeEach(function () {
				validPeer = new Peer(randomPeer);
				_.each(peers.peersManager.getAll(), function (peer) {
					peers.peersManager.remove(peer);
				});
			});

			it('should return nonce of added peer', function () {
				peers.peersManager.add(validPeer);
				var receivedAddress = peers.peersManager.getAddress(validPeer.nonce);
				expect(receivedAddress).to.eql(validPeer.string);
			});

			it('should return undefined no peer with address nonce was added', function () {
				var receivedAddress = peers.peersManager.getAddress('notExistingNonce');
				expect(receivedAddress).to.be.undefined;
			});

		});

		describe('getAll', function () {

			var validPeer = new Peer(randomPeer);

			beforeEach(function () {
				validPeer = new Peer(randomPeer);
				_.each(peers.peersManager.getAll(), function (peer) {
					peers.peersManager.remove(peer);
				});
			});

			it('should return empty object when no peers added', function () {
				var receivedPeers = peers.peersManager.getAll();
				expect(receivedPeers).to.be.empty;
			});

			it('should return all valid peers added', function () {
				var peerA = validPeer;
				var peerB = _.clone(validPeer);
				peerB.string = '50.40.40.40:4000';
				peerB.nonce = 'peerBNonce';

				peers.peersManager.add(peerA);
				peers.peersManager.add(peerB);

				var expectedPeers = {
					'40.40.40.40:5000': peerA,
					'50.40.40.40:4000': peerB
				};

				expect(peers.peersManager.getAll()).to.eql(expectedPeers);
			});

		});

	});
});
