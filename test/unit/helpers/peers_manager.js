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
var peersManager = require('../../../helpers/peers_manager');

describe('PeersManager', () => {
	describe('constructor', () => {
		it('should have empty peers map after initialization', () => {
			expect(peersManager).to.have.property('peers').to.be.empty;
		});

		it('should have empty addressToNonceMap map after initialization', () => {
			expect(peersManager).to.have.property('addressToNonceMap').to.be.empty;
		});

		it('should have empty nonceToConnectionIdMap map after initialization', () => {
			expect(peersManager).to.have.property('nonceToAddressMap').to.be.empty;
		});
	});

	describe('method', () => {
		var validPeer;

		beforeEach(() => {
			validPeer = new Peer(prefixedPeer);
			peersManager.peers = {};
			peersManager.addressToNonceMap = {};
			peersManager.nonceToAddressMap = {};
		});

		describe('add', () => {
			it('should return false when invoked without arguments', () => {
				expect(peersManager.add()).not.to.be.ok;
			});

			it('should return false when invoked with peer equal null', () => {
				expect(peersManager.add(null)).not.to.be.ok;
			});

			it('should return false when invoked with peer equal 0', () => {
				expect(peersManager.add(0)).not.to.be.ok;
			});

			it('should return false when invoked with peer has no string field', () => {
				expect(peersManager.add({})).not.to.be.ok;
			});

			it('should add entry to peers when invoked with valid arguments', () => {
				peersManager.add(validPeer);
				expect(peersManager.peers)
					.to.have.property(validPeer.string)
					.eql(validPeer);
			});

			it('should add entry to addressToNonceMap when invoked with valid arguments', () => {
				peersManager.add(validPeer);
				expect(peersManager.addressToNonceMap)
					.to.have.property(validPeer.string)
					.eql(validPeer.nonce);
			});

			it('should add entry to nonceToAddressMap when invoked with valid arguments', () => {
				peersManager.add(validPeer);
				expect(peersManager.nonceToAddressMap)
					.to.have.property(validPeer.nonce)
					.eql(validPeer.string);
			});

			it('should prevent from adding peer with the same nonce but different address', () => {
				expect(peersManager.add(validPeer)).to.be.ok;
				validPeer.string = 'DIFFERENT';
				expect(peersManager.add(validPeer)).not.to.be.ok;
			});

			it('should update data on peers list', () => {
				expect(peersManager.add(validPeer)).to.be.ok;
				validPeer.height = 'DIFFERENT';
				expect(peersManager.add(validPeer)).to.be.ok;
				expect(peersManager.peers[validPeer.string]).eql(validPeer);
			});

			it('should remove old entry when nonce is different', () => {
				expect(peersManager.add(validPeer)).to.be.ok;
				validPeer.nonce = 'DIFFERENT';
				expect(peersManager.add(validPeer)).to.be.ok;
				expect(Object.keys(peersManager.peers).length).to.equal(1);
				expect(peersManager.peers[validPeer.string]).eql(validPeer);
			});

			describe('multiple valid entries', () => {
				var validPeerA;
				var validPeerB;

				beforeEach(() => {
					validPeerA = _.clone(validPeer);
					validPeerA.string += 'A';
					validPeerA.nonce += 'A';

					validPeerB = _.clone(validPeer);
					validPeerB.string += 'B';
					validPeerB.nonce += 'B';

					expect(peersManager.add(validPeerA)).to.be.ok;
					expect(peersManager.add(validPeerB)).to.be.ok;
				});

				it('should contain multiple entries in peers after multiple valid entries added', () => {
					expect(Object.keys(peersManager.peers).length).to.equal(2);
					expect(peersManager.peers)
						.to.have.property(validPeerA.string)
						.eql(validPeerA);
					expect(peersManager.peers)
						.to.have.property(validPeerB.string)
						.eql(validPeerB);
				});

				it('should contain multiple entries in addressToNonceMap after multiple valid entries added', () => {
					expect(Object.keys(peersManager.addressToNonceMap).length).to.equal(
						2
					);
					expect(peersManager.addressToNonceMap)
						.to.have.property(validPeerA.string)
						.equal(validPeerA.nonce);
					expect(peersManager.addressToNonceMap)
						.to.have.property(validPeerB.string)
						.equal(validPeerB.nonce);
				});

				it('should contain multiple entries in nonceToAddressMap after multiple valid entries added', () => {
					expect(Object.keys(peersManager.addressToNonceMap).length).to.equal(
						2
					);
					expect(peersManager.nonceToAddressMap)
						.to.have.property(validPeerA.nonce)
						.equal(validPeerA.string);
					expect(peersManager.nonceToAddressMap)
						.to.have.property(validPeerB.nonce)
						.equal(validPeerB.string);
				});
			});
		});

		describe('remove', () => {
			it('should return false when invoked without arguments', () => {
				expect(peersManager.remove()).not.to.be.ok;
			});

			it('should return false when invoked with null', () => {
				expect(peersManager.remove(null)).not.to.be.ok;
			});

			it('should return false when invoked with 0', () => {
				expect(peersManager.remove(0)).not.to.be.ok;
			});

			it('should return false when invoked with peer without string property', () => {
				expect(peersManager.remove({})).not.to.be.ok;
			});

			it('should return false when invoked with peer while attempt to remove not existing peer', () => {
				expect(peersManager.remove(validPeer)).not.to.be.ok;
			});

			it('should not change a state of connections table when removing not existing entry', () => {
				peersManager.remove(validPeer);
				expect(peersManager).to.have.property('peers').to.be.empty;
				expect(peersManager).to.have.property('addressToNonceMap').to.be.empty;
				expect(peersManager).to.have.property('nonceToAddressMap').to.be.empty;
			});

			it('should remove previously added valid entry', () => {
				peersManager.add(validPeer);
				expect(peersManager.peers)
					.to.have.property(validPeer.string)
					.eql(validPeer);
				peersManager.remove(validPeer);
				expect(peersManager).to.have.property('peers').to.be.empty;
				expect(peersManager).to.have.property('addressToNonceMap').to.be.empty;
				expect(peersManager).to.have.property('nonceToAddressMap').to.be.empty;
			});
		});

		describe('getNonce', () => {
			it('should return undefined when invoked without arguments', () => {
				expect(peersManager.getNonce()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				expect(peersManager.getNonce(validPeer.string)).to.be.undefined;
			});

			it('should return nonce assigned to connection id when entry exists', () => {
				peersManager.add(validPeer);
				expect(peersManager.getNonce(validPeer.string)).to.equal(
					validPeer.nonce
				);
			});
		});

		describe('getAddress', () => {
			it('should return undefined when invoked without arguments', () => {
				expect(peersManager.getAddress()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				expect(peersManager.getAddress(validPeer.nonce)).to.be.undefined;
			});

			it('should return nonce assigned to connection id when entry exists', () => {
				peersManager.add(validPeer);
				expect(peersManager.getAddress(validPeer.nonce)).to.equal(
					validPeer.string
				);
			});
		});

		describe('getAll', () => {
			it('should return empty object if no peers were added before', () => {
				expect(peersManager.getAll()).to.be.empty;
			});

			it('should return map of added peers', () => {
				peersManager.add(validPeer);
				var validResult = {};
				validResult[validPeer.string] = validPeer;
				expect(peersManager.getAll(validPeer.nonce)).eql(validResult);
			});
		});

		describe('getByNonce', () => {
			it('should return undefined when invoked without arguments', () => {
				expect(peersManager.getByNonce()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				expect(peersManager.getByNonce(validPeer.nonce)).to.be.undefined;
			});

			it('should return previously added peer when asking with valid nonce', () => {
				peersManager.add(validPeer);
				expect(peersManager.getByNonce(validPeer.nonce)).eql(validPeer);
			});
		});

		describe('getByAddress', () => {
			it('should return undefined when invoked without arguments', () => {
				expect(peersManager.getByAddress()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				expect(peersManager.getByAddress(validPeer.string)).to.be.undefined;
			});

			it('should return previously added peer when asking with valid nonce', () => {
				peersManager.add(validPeer);
				expect(peersManager.getByAddress(validPeer.string)).eql(validPeer);
			});
		});
	});
});
