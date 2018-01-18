/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var express = require('express');

var failureCodes = require('../../../api/ws/rpc/failureCodes');
var modulesLoader = require('../../common/modulesLoader');
var prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;
var Peers = require('../../../logic/peers.js');
var Peer = require('../../../logic/peer.js');

describe('peers', function () {

	var peersModuleMock;
	var peers;
	var validPeer;
	var validNodeNonce;

	before(function (done) {

		peersModuleMock = {
			acceptable: sinonSandbox.stub().returnsArg(0)
		};

		modulesLoader.initLogic(Peers, modulesLoader.scope, function (err, __peers) {
			peers = __peers;
			peers.bindModules({peers: peersModuleMock});
			done();
		});
	});

	beforeEach(function () {
		peersModuleMock.acceptable = sinonSandbox.stub().returnsArg(0);
		validPeer = _.assign({}, prefixedPeer);
	});

	function removeAll () {
		peers.list().forEach(function (peer) {
			peers.remove(peer);
		});

		peers.list().should.be.an('array').and.to.be.empty;
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

		if (commonProperties.indexOf('ip') === -1 || commonProperties.indexOf('wsPort') === -1) {
			throw new Error('Insufficient data to compare the peers (no port or ip provided)');
		}

		return commonProperties.every(function (property) {
			return peerA[property] === peerB[property];
		});
	}

	describe('create', function () {
		it('should always return Peer instance', function () {
			peers.create().should.be.an.instanceof(Peer);
			peers.create(validPeer).should.be.an.instanceof(Peer);
			peers.create(new Peer(validPeer)).should.be.an.instanceof(Peer);
		});
	});

	describe('list', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should list peers as Peer instances', function () {
			peers.upsert(validPeer);
			peers.list().forEach(function (peer) {
				peer.should.be.an.instanceof(Peer);
			});
		});

		it('should list peers with rpc', function () {
			peers.upsert(validPeer);
			peers.list().forEach(function (peer) {
				peer.should.have.property('rpc');
			});
		});

		describe('when normalized', function () {
			it('should list peers as objects when normalized', function () {
				peers.upsert(validPeer);
				peers.list(true).forEach(function (peer) {
					peer.should.be.an('object');
				});
			});

			it('should not contain rpc property when normalized', function () {
				peers.upsert(validPeer);
				peers.list(true).forEach(function (peer) {
					peer.should.not.to.have.property('rpc');
				});
			});
		});
	});

	describe('upsert', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should insert new peers', function () {
			peers.upsert(validPeer);
			peers.list().length.should.equal(1);
		});

		it('should update height of existing peer', function () {
			peers.upsert(validPeer);
			var list = peers.list();
			var inserted = list[0];
			list.length.should.equal(1);
			arePeersEqual(inserted, validPeer).should.be.ok;

			var modifiedPeer = _.clone(validPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer);
			list = peers.list();
			var updated = list[0];
			list.length.should.equal(1);
			arePeersEqual(updated, modifiedPeer).should.be.ok;
			arePeersEqual(updated, validPeer).should.be.not.ok;

		});

		it('should not update height with insertOnly param', function () {
			peers.upsert(validPeer);
			var list = peers.list();
			var inserted = list[0];
			list.length.should.equal(1);
			arePeersEqual(inserted, validPeer).should.be.ok;

			var modifiedPeer = _.clone(validPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer, true);
			list = peers.list();
			var updated = list[0];
			list.length.should.equal(1);
			arePeersEqual(updated, modifiedPeer).should.be.not.ok;
			arePeersEqual(updated, validPeer).should.be.ok;
		});

		it('should insert peer with different ports', function () {
			peers.upsert(validPeer);
			peers.list().length.should.equal(1);

			var differentPortPeer = _.clone(validPeer);
			differentPortPeer.nonce = 'differentNonce';
			differentPortPeer.wsPort += 1;
			peers.upsert(differentPortPeer);
			var list = peers.list();
			list.length.should.equal(2);

			var demandedPorts = _.map([validPeer, differentPortPeer], 'wsPort');
			var listPorts = _.map(list, 'wsPort');

			_.isEqual(demandedPorts.sort(), listPorts.sort()).should.be.ok;
		});

		it('should insert peer with different ips', function () {
			peers.upsert(validPeer);
			peers.list().length.should.equal(1);

			var differentIpPeer = _.clone(validPeer);
			delete differentIpPeer.string;
			differentIpPeer.ip = '40.40.40.41';
			differentIpPeer.nonce = 'differentNonce';

			peers.upsert(differentIpPeer);
			var list = peers.list();
			list.length.should.equal(2);

			var demandedIps = _.map([validPeer, differentIpPeer], 'ip');
			var listIps = _.map(list, 'ip');

			_.isEqual(demandedIps.sort(), listIps.sort()).should.be.ok;
		});

		describe('should fail with valid error code', function () {

			it('INSERT_ONLY_FAILURE when insertOnly flag is present and peer already exists', function () {
				peers.upsert(validPeer);
				peers.upsert(validPeer, true).should.equal(failureCodes.ON_MASTER.INSERT.INSERT_ONLY_FAILURE);
			});

			it('INVALID_PEER when called with invalid peer', function () {
				peers.upsert({}).should.equal(failureCodes.ON_MASTER.UPDATE.INVALID_PEER);
			});

			it('NOT_ACCEPTED when called with the same as node nonce', function () {
				peersModuleMock.acceptable = sinonSandbox.stub().returns([]);
				validPeer.nonce = validNodeNonce;
				peers.upsert(validPeer).should.equal(failureCodes.ON_MASTER.INSERT.NOT_ACCEPTED);
			});
		});
	});

	describe('exists', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should return false if peer is not on the list', function () {
			peers.exists({
				ip: '41.41.41.41',
				wsPort: '4444',
				nonce: 'another_nonce'
			}).should.not.be.ok;
		});

		it('should return true if peer is on the list', function () {
			peers.upsert(validPeer);
			var list = peers.list(true);
			list.length.should.equal(1);
			peers.exists(validPeer).should.be.ok;
		});

		it('should return true if peer with same nonce is on the list', function () {
			var res = peers.upsert(validPeer);
			var list = peers.list(true);
			list.length.should.equal(1);
			peers.exists({ip: validPeer.ip, wsPort: validPeer.wsPort, nonce: validPeer.nonce}).should.be.ok;
		});

		it('should return true if peer with same address is on the list', function () {
			peers.upsert(validPeer);
			var list = peers.list(true);
			list.length.should.equal(1);
			peers.exists({ip: validPeer.ip, wsPort: validPeer.wsPort}).should.be.ok;
		});
	});

	describe('get', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should return inserted peer', function () {
			peers.upsert(validPeer);
			var insertedPeer = peers.get(validPeer);
			arePeersEqual(insertedPeer, validPeer).should.be.ok;
		});

		it('should return inserted peer by address', function () {
			peers.upsert(validPeer);
			var insertedPeer = peers.get(validPeer.ip + ':' + validPeer.wsPort);
			arePeersEqual(insertedPeer, validPeer).should.be.ok;

		});

		it('should return undefined if peer is not inserted', function () {
			should.not.exist(peers.get(validPeer));
		});
	});

	describe('remove', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should remove added peer', function () {
			peers.upsert(validPeer);
			peers.list().length.should.equal(1);
			var result = peers.remove(validPeer);
			result.should.be.ok;
			peers.list().length.should.equal(0);
		});

		it('should return an error when trying to remove a non-existent peer', function () {
			var result = peers.remove(validPeer);
			result.should.be.a('number').equal(failureCodes.ON_MASTER.REMOVE.NOT_ON_LIST);
			peers.list().length.should.equal(0);
		});
	});
});
