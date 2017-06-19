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
var constants = require('../../../helpers/constants');

describe('peers', function () {

	var peers, APP_NONCE = 'TEST_APP_NONCE';

	before(function () {
		constants.setConst('headers', {});
	});

	before(function (done) {
		modulesLoader.initAllModules(function (err, __modules) {
			if (err) {
				return done(err);
			}
			__modules.peers.onBind(__modules);

			modulesLoader.initLogic(Peers, modulesLoader.scope, function (err, __peers) {
				peers = __peers;
				peers.bind(__modules);
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

		it('should list peers as objects when normalized', function () {
			peers.upsert(randomPeer);
			peers.list(true).forEach(function (peer) {
				expect(peer).to.be.an('object');
			});
		});

		it('should should not contain rpc when normalized', function () {
			peers.upsert(randomPeer);
			peers.list(true).forEach(function (peer) {
				expect(peer).not.to.have.property('rpc');
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

		it('should not insert new peer with lisk-js-api os', function () {
			removeAll();
			var modifiedPeer = _.clone(randomPeer);
			modifiedPeer.os = 'lisk-js-api';
			peers.upsert(modifiedPeer);
			expect(peers.list().length).equal(0);
			removeAll();
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

		it('should return true if peer with same nonce is on the list', function () {
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

	describe('ban', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should change the peer state to banned', function () {
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);
			expect(peers.list()[0].state).equal(2);

			var result = peers.ban(randomPeer.ip, randomPeer.port, 10);
			expect(result).to.be.ok;
			expect(peers.list().length).equal(1);
			expect(peers.list()[0].state).equal(0);
		});

	});

	describe('unban', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should change the peer state to unbanned', function () {
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);
			expect(peers.list()[0].state).equal(2);

			var result = peers.ban(randomPeer.ip, randomPeer.port, 10);
			expect(result).to.be.ok;
			expect(peers.list().length).equal(1);
			expect(peers.list()[0].state).equal(0);

			peers.unban(randomPeer);
			expect(peers.list().length).equal(1);
			expect(peers.list()[0].state).equal(1);
		});

		it('should do nothing when unbanning non inserted peer', function () {
			peers.upsert(randomPeer);
			expect(peers.list().length).equal(1);
			expect(peers.list()[0].state).equal(2);

			var differentPeer = _.clone(randomPeer);
			differentPeer.port += 1;

			peers.unban(differentPeer);
			expect(peers.list().length).equal(1);
			expect(arePeersEqual(peers.list()[0], randomPeer)).to.be.ok;
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

});
