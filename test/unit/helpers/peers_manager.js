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
var PeersManager = require('../../../helpers/peers_manager');
var wsRPC = require('../../../api/ws/rpc/ws_rpc').wsRPC;

var peersManagerInstance;
var masterWAMPServerMock;

var validRPCProcedureName = 'rpcProcedureA';
var validEventProcedureName = 'eventProcedureB';

describe('PeersManager', () => {
	beforeEach(done => {
		peersManagerInstance = new PeersManager({
			error: sinonSandbox.stub(),
			warn: sinonSandbox.stub(),
			log: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			trace: sinonSandbox.stub(),
		});
		masterWAMPServerMock = {
			upgradeToWAMP: sinonSandbox.stub(),
			endpoints: {
				rpc: {
					[validRPCProcedureName]: sinonSandbox.stub().callsArg(1),
				},
				event: {
					[validEventProcedureName]: sinonSandbox.stub(),
				},
			},
		};
		wsRPC.getServer = sinonSandbox.stub().returns(masterWAMPServerMock);
		done();
	});

	describe('constructor', () => {
		it('should have empty peers map after initialization', () => {
			return expect(peersManagerInstance).to.have.property('peers').to.be.empty;
		});

		it('should have empty addressToNonceMap map after initialization', () => {
			return expect(peersManagerInstance).to.have.property('addressToNonceMap')
				.to.be.empty;
		});

		it('should have empty nonceToConnectionIdMap map after initialization', () => {
			return expect(peersManagerInstance).to.have.property('nonceToAddressMap')
				.to.be.empty;
		});
	});

	describe('method', () => {
		var validPeer;

		beforeEach(done => {
			validPeer = new Peer(prefixedPeer);
			peersManagerInstance.peers = {};
			peersManagerInstance.addressToNonceMap = {};
			peersManagerInstance.nonceToAddressMap = {};
			done();
		});

		describe('add', () => {
			it('should return false when invoked without arguments', () => {
				return expect(peersManagerInstance.add()).not.to.be.ok;
			});

			it('should return false when invoked with peer equal null', () => {
				return expect(peersManagerInstance.add(null)).not.to.be.ok;
			});

			it('should return false when invoked with peer equal 0', () => {
				return expect(peersManagerInstance.add(0)).not.to.be.ok;
			});

			it('should return false when invoked with peer has no string field', () => {
				return expect(peersManagerInstance.add({})).not.to.be.ok;
			});

			it('should add entry to peers when invoked with valid arguments', () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.peers)
					.to.have.property(validPeer.string)
					.eql(validPeer);
			});

			it('should add entry to addressToNonceMap when invoked with valid arguments', () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.addressToNonceMap)
					.to.have.property(validPeer.string)
					.eql(validPeer.nonce);
			});

			it('should add entry to nonceToAddressMap when invoked with valid arguments', () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.nonceToAddressMap)
					.to.have.property(validPeer.nonce)
					.eql(validPeer.string);
			});

			it('should prevent from adding peer with the same nonce but different address', () => {
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				validPeer.string = 'DIFFERENT';
				return expect(peersManagerInstance.add(validPeer)).not.to.be.ok;
			});

			it('should update data on peers list', () => {
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				validPeer.height = 'DIFFERENT';
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				return expect(peersManagerInstance.peers[validPeer.string]).eql(
					validPeer
				);
			});

			it('should remove old entry when nonce is different', () => {
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				validPeer.nonce = 'DIFFERENT';
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				expect(Object.keys(peersManagerInstance.peers).length).to.equal(1);
				return expect(peersManagerInstance.peers[validPeer.string]).eql(
					validPeer
				);
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

					expect(peersManagerInstance.add(validPeerA)).to.be.ok;
					return expect(peersManagerInstance.add(validPeerB)).to.be.ok;
				});

				it('should contain multiple entries in peers after multiple valid entries added', () => {
					expect(Object.keys(peersManagerInstance.peers).length).to.equal(2);
					expect(peersManagerInstance.peers)
						.to.have.property(validPeerA.string)
						.eql(validPeerA);
					return expect(peersManagerInstance.peers)
						.to.have.property(validPeerB.string)
						.eql(validPeerB);
				});

				it('should contain multiple entries in addressToNonceMap after multiple valid entries added', () => {
					expect(
						Object.keys(peersManagerInstance.addressToNonceMap).length
					).to.equal(2);
					expect(peersManagerInstance.addressToNonceMap)
						.to.have.property(validPeerA.string)
						.equal(validPeerA.nonce);
					return expect(peersManagerInstance.addressToNonceMap)
						.to.have.property(validPeerB.string)
						.equal(validPeerB.nonce);
				});

				it('should contain multiple entries in nonceToAddressMap after multiple valid entries added', () => {
					expect(
						Object.keys(peersManagerInstance.addressToNonceMap).length
					).to.equal(2);
					expect(peersManagerInstance.nonceToAddressMap)
						.to.have.property(validPeerA.nonce)
						.equal(validPeerA.string);
					return expect(peersManagerInstance.nonceToAddressMap)
						.to.have.property(validPeerB.nonce)
						.equal(validPeerB.string);
				});
			});

			describe('when peer gets added nonce = undefined', () => {
				beforeEach(done => {
					validPeer.nonce = undefined;
					peersManagerInstance.add(validPeer);
					done();
				});

				it('should not create any entry in addressToNonce map', () => {
					return expect(
						peersManagerInstance.addressToNonceMap
					).not.to.have.property(validPeer.string);
				});

				it('should not create any entry in nonceToAddress map', () => {
					return expect(
						peersManagerInstance.nonceToAddressMap
					).not.to.have.property(validPeer.nonce);
				});

				describe('when peer is updated with defined nonce = "validNonce"', () => {
					beforeEach(done => {
						validPeer.nonce = 'validNonce';
						peersManagerInstance.add(validPeer);
						done();
					});

					it('should update an entry [validPeer.string] = "validNonce" in addressToNonce map', () => {
						return expect(peersManagerInstance.addressToNonceMap)
							.to.have.property(validPeer.string)
							.to.equal('validNonce');
					});

					it('should add an entry "validNonce" = [peer.string] in nonceToAddress map', () => {
						return expect(peersManagerInstance.nonceToAddressMap)
							.to.have.property('validNonce')
							.equal(validPeer.string);
					});
				});
			});
		});

		describe('remove', () => {
			it('should return false when invoked without arguments', () => {
				return expect(peersManagerInstance.remove()).not.to.be.ok;
			});

			it('should return false when invoked with null', () => {
				return expect(peersManagerInstance.remove(null)).not.to.be.ok;
			});

			it('should return false when invoked with 0', () => {
				return expect(peersManagerInstance.remove(0)).not.to.be.ok;
			});

			it('should return false when invoked with peer without string property', () => {
				return expect(peersManagerInstance.remove({})).not.to.be.ok;
			});

			it('should return false when invoked with peer while attempt to remove not existing peer', () => {
				return expect(peersManagerInstance.remove(validPeer)).not.to.be.ok;
			});

			it('should not change a state of connections table when removing not existing entry', () => {
				peersManagerInstance.remove(validPeer);
				expect(peersManagerInstance).to.have.property('peers').to.be.empty;
				expect(peersManagerInstance).to.have.property('addressToNonceMap').to.be
					.empty;
				return expect(peersManagerInstance).to.have.property(
					'nonceToAddressMap'
				).to.be.empty;
			});

			it('should remove previously added valid entry', () => {
				peersManagerInstance.add(validPeer);
				expect(peersManagerInstance.peers)
					.to.have.property(validPeer.string)
					.eql(validPeer);
				peersManagerInstance.remove(validPeer);
				expect(peersManagerInstance).to.have.property('peers').to.be.empty;
				expect(peersManagerInstance).to.have.property('addressToNonceMap').to.be
					.empty;
				return expect(peersManagerInstance).to.have.property(
					'nonceToAddressMap'
				).to.be.empty;
			});
		});

		describe('getNonce', () => {
			it('should return undefined when invoked without arguments', () => {
				return expect(peersManagerInstance.getNonce()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				return expect(peersManagerInstance.getNonce(validPeer.string)).to.be
					.undefined;
			});

			it('should return nonce assigned to connection id when entry exists', () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.getNonce(validPeer.string)).to.equal(
					validPeer.nonce
				);
			});
		});

		describe('getAddress', () => {
			it('should return undefined when invoked without arguments', () => {
				return expect(peersManagerInstance.getAddress()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				return expect(peersManagerInstance.getAddress(validPeer.nonce)).to.be
					.undefined;
			});

			it('should return nonce assigned to connection id when entry exists', () => {
				peersManagerInstance.add(validPeer);
				return expect(
					peersManagerInstance.getAddress(validPeer.nonce)
				).to.equal(validPeer.string);
			});
		});

		describe('getAll', () => {
			it('should return empty object if no peers were added before', () => {
				return expect(peersManagerInstance.getAll()).to.be.empty;
			});

			it('should return map of added peers', () => {
				peersManagerInstance.add(validPeer);
				var validResult = {};
				validResult[validPeer.string] = validPeer;
				return expect(peersManagerInstance.getAll(validPeer.nonce)).eql(
					validResult
				);
			});
		});

		describe('getByNonce', () => {
			it('should return undefined when invoked without arguments', () => {
				return expect(peersManagerInstance.getByNonce()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				return expect(peersManagerInstance.getByNonce(validPeer.nonce)).to.be
					.undefined;
			});

			it('should return previously added peer when asking with valid nonce', () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.getByNonce(validPeer.nonce)).eql(
					validPeer
				);
			});
		});

		describe('getByAddress', () => {
			it('should return undefined when invoked without arguments', () => {
				return expect(peersManagerInstance.getByAddress()).to.be.undefined;
			});

			it('should return undefined when asking of not existing entry', () => {
				return expect(peersManagerInstance.getByAddress(validPeer.string)).to.be
					.undefined;
			});

			it('should return previously added peer when asking with valid nonce', () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.getByAddress(validPeer.string)).eql(
					validPeer
				);
			});
		});
	});

	describe('multiple instances', () => {
		describe('when required 2 times', () => {
			var peersManagerInstanceA;
			var peersManagerInstanceB;

			beforeEach(done => {
				peersManagerInstanceA = new PeersManager({
					debug: sinonSandbox.stub(),
					trace: sinonSandbox.stub(),
				});
				peersManagerInstanceB = new PeersManager({
					debug: sinonSandbox.stub(),
					trace: sinonSandbox.stub(),
				});
				done();
			});
			describe('when [peersManagerInstanceA] adds data', () => {
				let validPeer;

				beforeEach(done => {
					validPeer = new Peer(prefixedPeer);
					peersManagerInstanceA.add(validPeer);
					done();
				});

				it('should be reflected in [peersManagerInstanceA]', () => {
					return expect(
						peersManagerInstanceA.getByAddress(validPeer.string)
					).eql(validPeer);
				});

				it('should not be reflected in [peersManagerInstanceB]', () => {
					return expect(
						peersManagerInstanceB.getByAddress(validPeer.string)
					).not.eql(validPeer);
				});
			});
		});
	});
});
