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

var prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;
var Peer = require('../../../logic/peer');
var peersManager = require('../../../helpers/peersManager');

describe('PeersManager', function () {

	describe('constructor', function () {

		it('should have empty peers map after initialization', function () {
			peersManager.should.have.property('peers').to.be.empty;
		});

		it('should have empty addressToNonceMap map after initialization', function () {
			peersManager.should.have.property('addressToNonceMap').to.be.empty;
		});

		it('should have empty nonceToConnectionIdMap map after initialization', function () {
			peersManager.should.have.property('nonceToAddressMap').to.be.empty;
		});
	});

	describe('method', function () {

		var validPeer;

		beforeEach(function () {
			validPeer = new Peer(prefixedPeer);
			peersManager.peers = {};
			peersManager.addressToNonceMap = {};
			peersManager.nonceToAddressMap = {};
		});

		describe('add', function () {

			it('should return false when invoked without arguments', function () {
				peersManager.add().should.not.to.be.ok;
			});

			it('should return false when invoked with peer equal null', function () {
				peersManager.add(null).should.not.to.be.ok;
			});

			it('should return false when invoked with peer equal 0', function () {
				peersManager.add(0).should.not.to.be.ok;
			});

			it('should return false when invoked with peer has no string field', function () {
				peersManager.add({}).should.not.to.be.ok;
			});

			it('should add entry to peers when invoked with valid arguments', function () {
				peersManager.add(validPeer);
				peersManager.peers.should.have.property(validPeer.string).eql(validPeer);
			});

			it('should add entry to addressToNonceMap when invoked with valid arguments', function () {
				peersManager.add(validPeer);
				peersManager.addressToNonceMap.should.have.property(validPeer.string).eql(validPeer.nonce);
			});

			it('should add entry to nonceToAddressMap when invoked with valid arguments', function () {
				peersManager.add(validPeer);
				peersManager.nonceToAddressMap.should.have.property(validPeer.nonce).eql(validPeer.string);
			});

			it('should prevent from adding peer with the same nonce but different address', function () {
				peersManager.add(validPeer).should.be.ok;
				validPeer.string = 'DIFFERENT';
				peersManager.add(validPeer).should.not.to.be.ok;
			});

			it('should update data on peers list', function () {
				peersManager.add(validPeer).should.be.ok;
				validPeer.height = 'DIFFERENT';
				peersManager.add(validPeer).should.be.ok;
				peersManager.peers[validPeer.string].should.eql(validPeer);
			});

			it('should remove old entry when nonce is different', function () {
				peersManager.add(validPeer).should.be.ok;
				validPeer.nonce = 'DIFFERENT';
				peersManager.add(validPeer).should.be.ok;
				Object.keys(peersManager.peers).length.should.equal(1);
				peersManager.peers[validPeer.string].should.eql(validPeer);
			});

			describe('multiple valid entries', function () {

				var validPeerA, validPeerB;

				beforeEach(function () {
					validPeerA = _.clone(validPeer);
					validPeerA.string += 'A';
					validPeerA.nonce += 'A';

					validPeerB = _.clone(validPeer);
					validPeerB.string += 'B';
					validPeerB.nonce += 'B';

					peersManager.add(validPeerA).should.be.ok;
					peersManager.add(validPeerB).should.be.ok;
				});

				it('should contain multiple entries in peers after multiple valid entries added', function () {
					Object.keys(peersManager.peers).length.should.equal(2);
					peersManager.peers.should.have.property(validPeerA.string).eql(validPeerA);
					peersManager.peers.should.have.property(validPeerB.string).eql(validPeerB);
				});

				it('should contain multiple entries in addressToNonceMap after multiple valid entries added', function () {
					Object.keys(peersManager.addressToNonceMap).length.should.equal(2);
					peersManager.addressToNonceMap.should.have.property(validPeerA.string).equal(validPeerA.nonce);
					peersManager.addressToNonceMap.should.have.property(validPeerB.string).equal(validPeerB.nonce);
				});

				it('should contain multiple entries in nonceToAddressMap after multiple valid entries added', function () {
					Object.keys(peersManager.addressToNonceMap).length.should.equal(2);
					peersManager.nonceToAddressMap.should.have.property(validPeerA.nonce).equal(validPeerA.string);
					peersManager.nonceToAddressMap.should.have.property(validPeerB.nonce).equal(validPeerB.string);
				});
			});
		});

		describe('remove', function () {

			it('should return false when invoked without arguments', function () {
				peersManager.remove().should.not.to.be.ok;
			});

			it('should return false when invoked with null', function () {
				peersManager.remove(null).should.not.to.be.ok;
			});

			it('should return false when invoked with 0', function () {
				peersManager.remove(0).should.not.to.be.ok;
			});

			it('should return false when invoked with peer without string property', function () {
				peersManager.remove({}).should.not.to.be.ok;
			});

			it('should return false when invoked with peer while attempt to remove not existing peer', function () {
				peersManager.remove(validPeer).should.not.to.be.ok;
			});

			it('should not change a state of connections table when removing not existing entry', function () {
				peersManager.remove(validPeer);
				peersManager.should.have.property('peers').to.be.empty;
				peersManager.should.have.property('addressToNonceMap').to.be.empty;
				peersManager.should.have.property('nonceToAddressMap').to.be.empty;
			});

			it('should remove previously added valid entry', function () {
				peersManager.add(validPeer);
				peersManager.peers.should.have.property(validPeer.string).eql(validPeer);
				peersManager.remove(validPeer);
				peersManager.should.have.property('peers').to.be.empty;
				peersManager.should.have.property('addressToNonceMap').to.be.empty;
				peersManager.should.have.property('nonceToAddressMap').to.be.empty;
			});
		});

		describe('getNonce', function () {

			it('should return undefined when invoked without arguments', function () {
				should.not.exist(peersManager.getNonce());
			});

			it('should return undefined when asking of not existing entry', function () {
				should.not.exist(peersManager.getNonce(validPeer.string));
			});

			it('should return nonce assigned to connection id when entry exists', function () {
				peersManager.add(validPeer);
				peersManager.getNonce(validPeer.string).should.equal(validPeer.nonce);
			});
		});

		describe('getAddress', function () {

			it('should return undefined when invoked without arguments', function () {
				should.not.exist(peersManager.getAddress());
			});

			it('should return undefined when asking of not existing entry', function () {
				should.not.exist(peersManager.getAddress(validPeer.nonce));
			});

			it('should return nonce assigned to connection id when entry exists', function () {
				peersManager.add(validPeer);
				peersManager.getAddress(validPeer.nonce).should.equal(validPeer.string);
			});
		});

		describe('getAll', function () {

			it('should return empty object if no peers were added before', function () {
				peersManager.getAll().should.be.empty;
			});

			it('should return map of added peers', function () {
				peersManager.add(validPeer);
				var validResult = {};
				validResult[validPeer.string] = validPeer;
				peersManager.getAll(validPeer.nonce).should.eql(validResult);
			});
		});

		describe('getByNonce', function () {

			it('should return undefined when invoked without arguments', function () {
				should.not.exist(peersManager.getByNonce());
			});

			it('should return undefined when asking of not existing entry', function () {
				should.not.exist(peersManager.getByNonce(validPeer.nonce));
			});

			it('should return previously added peer when asking with valid nonce', function () {
				peersManager.add(validPeer);
				peersManager.getByNonce(validPeer.nonce).should.eql(validPeer);
			});
		});

		describe('getByAddress', function () {

			it('should return undefined when invoked without arguments', function () {
				should.not.exist(peersManager.getByAddress());
			});

			it('should return undefined when asking of not existing entry', function () {
				should.not.exist(peersManager.getByAddress(validPeer.string));
			});

			it('should return previously added peer when asking with valid nonce', function () {
				peersManager.add(validPeer);
				peersManager.getByAddress(validPeer.string).should.eql(validPeer);
			});
		});
	});
});
