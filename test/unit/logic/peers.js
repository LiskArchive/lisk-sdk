'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');

var failureCodes = require('../../../api/ws/rpc/failureCodes');
var modulesLoader = require('../../common/modulesLoader');
var prefixedPeer = require('../../fixtures/peers').peer;
var Peers = require('../../../logic/peers.js');
var Peer = require('../../../logic/peer.js');

describe('peers', function () {

	var peersModuleMock;
	var peers;
	var validPeer;
	var validNodeNonce;

	before(function (done) {

		peersModuleMock = {
			acceptable: sinon.stub().returnsArg(0)
		};

		modulesLoader.initLogic(Peers, modulesLoader.scope, function (err, __peers) {
			peers = __peers;
			peers.bindModules({peers: peersModuleMock});
			done();
		});
	});

	beforeEach(function () {
		peersModuleMock.acceptable = sinon.stub().returnsArg(0);
		validPeer = _.assign({}, prefixedPeer);
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
			expect(peers.create(validPeer)).to.be.an.instanceof(Peer);
			expect(peers.create(new Peer(validPeer))).to.be.an.instanceof(Peer);
		});
	});

	describe('list', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should list peers as Peer instances', function () {
			peers.upsert(validPeer);
			peers.list().forEach(function (peer) {
				expect(peer).to.be.an.instanceof(Peer);
			});
		});

		it('should list peers with rpc', function () {
			peers.upsert(validPeer);
			peers.list().forEach(function (peer) {
				expect(peer).have.property('rpc');
			});
		});

		describe('when normalized', function () {
			it('should list peers as objects when normalized', function () {
				peers.upsert(validPeer);
				peers.list(true).forEach(function (peer) {
					expect(peer).to.be.an('object');
				});
			});

			it('should not contain rpc property when normalized', function () {
				peers.upsert(validPeer);
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
			peers.upsert(validPeer);
			expect(peers.list().length).equal(1);
		});

		it('should update height of existing peer', function () {
			peers.upsert(validPeer);
			var list = peers.list();
			var inserted = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(inserted, validPeer)).to.be.ok;

			var modifiedPeer = _.clone(validPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer);
			list = peers.list();
			var updated = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(updated, modifiedPeer)).to.be.ok;
			expect(arePeersEqual(updated, validPeer)).to.be.not.ok;

		});

		it('should not update height with insertOnly param', function () {
			peers.upsert(validPeer);
			var list = peers.list();
			var inserted = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(inserted, validPeer)).to.be.ok;

			var modifiedPeer = _.clone(validPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer, true);
			list = peers.list();
			var updated = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(updated, modifiedPeer)).to.be.not.ok;
			expect(arePeersEqual(updated, validPeer)).to.be.ok;
		});

		it('should insert peer with different ports', function () {
			peers.upsert(validPeer);
			expect(peers.list().length).equal(1);

			var differentPortPeer = _.clone(validPeer);
			differentPortPeer.nonce = 'differentNonce';
			differentPortPeer.port += 1;
			peers.upsert(differentPortPeer);
			var list = peers.list();
			expect(list.length).equal(2);

			var demandedPorts = _.map([validPeer, differentPortPeer], 'port');
			var listPorts = _.map(list, 'port');

			expect(_.isEqual(demandedPorts.sort(), listPorts.sort())).to.be.ok;
		});

		it('should insert peer with different ips', function () {
			peers.upsert(validPeer);
			expect(peers.list().length).equal(1);

			var differentIpPeer = _.clone(validPeer);
			delete differentIpPeer.string;
			differentIpPeer.ip = '40.40.40.41';
			differentIpPeer.nonce = 'differentNonce';

			peers.upsert(differentIpPeer);
			var list = peers.list();
			expect(list.length).equal(2);

			var demandedIps = _.map([validPeer, differentIpPeer], 'ip');
			var listIps = _.map(list, 'ip');

			expect(_.isEqual(demandedIps.sort(), listIps.sort())).to.be.ok;
		});

		describe('should fail with valid error code', function () {

			it('INSERT_ONLY_FAILURE when insertOnly flag is present and peer already exists', function () {
				peers.upsert(validPeer);
				expect(peers.upsert(validPeer, true)).to.equal(failureCodes.ON_MASTER.INSERT.INSERT_ONLY_FAILURE);
			});

			it('INVALID_PEER when called with invalid peer', function () {
				expect(peers.upsert({})).to.equal(failureCodes.ON_MASTER.UPDATE.INVALID_PEER);
			});

			it('NOT_ACCEPTED when called with the same as node nonce', function () {
				peersModuleMock.acceptable = sinon.stub().returns([]);
				validPeer.nonce = validNodeNonce;
				expect(peers.upsert(validPeer)).to.equal(failureCodes.ON_MASTER.INSERT.NOT_ACCEPTED);
			});
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
			peers.upsert(validPeer);
			var list = peers.list(true);
			expect(list.length).equal(1);
			expect(peers.exists(validPeer)).to.be.ok;
		});

		it('should return true if peer with same nonce is on the list', function () {
			var res = peers.upsert(validPeer);
			var list = peers.list(true);
			expect(list.length).equal(1);
			expect(peers.exists({ip: validPeer.ip, port: validPeer.port, nonce: validPeer.nonce})).to.be.ok;
		});

		it('should return true if peer with same address is on the list', function () {
			peers.upsert(validPeer);
			var list = peers.list(true);
			expect(list.length).equal(1);
			expect(peers.exists({ip: validPeer.ip, port: validPeer.port})).to.be.ok;
		});
	});

	describe('get', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should return inserted peer', function () {
			peers.upsert(validPeer);
			var insertedPeer = peers.get(validPeer);
			expect(arePeersEqual(insertedPeer, validPeer)).to.be.ok;
		});

		it('should return inserted peer by address', function () {
			peers.upsert(validPeer);
			var insertedPeer = peers.get(validPeer.ip + ':' + validPeer.port);
			expect(arePeersEqual(insertedPeer, validPeer)).to.be.ok;

		});

		it('should return undefined if peer is not inserted', function () {
			expect(peers.get(validPeer)).to.be.undefined;
		});
	});

	describe('remove', function () {

		beforeEach(function () {
			removeAll();
		});

		it('should remove added peer', function () {
			peers.upsert(validPeer);
			expect(peers.list().length).equal(1);
			var result = peers.remove(validPeer);
			expect(result).to.be.ok;
			expect(peers.list().length).equal(0);
		});

		it('should return an error when trying to remove a non-existent peer', function () {
			var result = peers.remove(validPeer);
			expect(result).to.be.a('number').equal(failureCodes.ON_MASTER.REMOVE.NOT_ON_LIST);
			expect(peers.list().length).equal(0);
		});
	});
});
