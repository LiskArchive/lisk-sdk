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
		modulesLoader.initLogic(Peers, modulesLoader.scope, function (err, __peers) {
			peers = __peers;
			var peersModuleMock = {
				acceptable: function (peers) {
					return peers;
				}
			};
			peers.bindModules({peers: peersModuleMock});
			done();
		});
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
				return Peer.prototype.properties.concat(['string']).indexOf(property) !== -1;
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
		it('should list peers as Peer instances', function () {
			removeAll();
			peers.upsert(randomPeer);
			peers.list().forEach(function (peer) {
				expect(peer).to.be.an.instanceof(Peer);
			});
			removeAll();
		});

		it('should list peers as objects when normalized', function () {
			removeAll();
			peers.upsert(randomPeer);
			peers.list(true).forEach(function (peer) {
				expect(peer).to.be.an('object');
			});
			removeAll();
		});
	});

	describe('upsert', function () {

		it('should insert new peers', function () {
			removeAll();
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);
			removeAll();
		});

		it('should update height of existing peer', function () {
			removeAll();

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

			removeAll();
		});

		it('should not update height with insertOnly param', function () {
			removeAll();

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

			removeAll();
		});

		it('should insert peer with different ports', function () {
			removeAll();

			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);

			var differentPortPeer = _.clone(randomPeer);
			differentPortPeer.port += 1;
			peers.upsert(differentPortPeer);
			var list = peers.list();
			expect(list.length).equal(2);

			var demandedPorts = _.map([randomPeer, differentPortPeer], 'port');
			var listPorts = _.map(list, 'port');

			expect(_.isEqual(demandedPorts.sort(), listPorts.sort())).to.be.ok;

			removeAll();
		});

		it('should insert peer with different ips', function () {
			removeAll();

			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);

			var differentIpPeer = _.clone(randomPeer);
			differentIpPeer.ip = '40.40.40.41';
			expect(differentIpPeer.ip).to.not.equal(randomPeer);
			peers.upsert(differentIpPeer);
			var list = peers.list();
			expect(list.length).equal(2);

			var demandedIps = _.map([randomPeer, differentIpPeer], 'ip');
			var listIps = _.map(list, 'ip');

			expect(_.isEqual(demandedIps.sort(), listIps.sort())).to.be.ok;

			removeAll();
		});
	});

	describe('exists', function () {

		it('should return true if peer is on the list', function () {
			removeAll();

			peers.upsert(randomPeer);
			var list = peers.list(true);
			expect(list.length).equal(1);
			expect(peers.exists(randomPeer)).to.be.ok;

			var differentPortPeer = _.clone(randomPeer);
			differentPortPeer.port += 1;
			expect(peers.exists(differentPortPeer)).to.be.not.ok;
		});
	});

	describe('get', function () {

		it('should return inserted peer', function () {
			removeAll();
			peers.upsert(randomPeer);
			var insertedPeer = peers.get(randomPeer);
			expect(arePeersEqual(insertedPeer, randomPeer)).to.be.ok;
		});

		it('should return inserted peer by address', function () {
			removeAll();
			peers.upsert(randomPeer);
			var insertedPeer = peers.get(randomPeer.ip + ':' + randomPeer.port);
			expect(arePeersEqual(insertedPeer, randomPeer)).to.be.ok;

		});

		it('should return undefined if peer is not inserted', function () {
			removeAll();
			expect(peers.get(randomPeer)).to.be.undefined;
		});
	});

	describe('remove', function () {

		it('should remove added peer', function () {
			removeAll();
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);
			var result = peers.remove(randomPeer);
			expect(result).to.be.ok;
			expect(peers.list().length).equal(0);
		});

		it('should return false when trying to remove non inserted peer', function () {
			removeAll();
			var result = peers.remove(randomPeer);
			expect(result).to.be.not.ok;
			expect(peers.list().length).equal(0);
		});
	});

});
