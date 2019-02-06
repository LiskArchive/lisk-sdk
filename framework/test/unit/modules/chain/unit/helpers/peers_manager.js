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

const prefixedPeer = require('../../../../../fixtures/peers')
	.randomNormalizedPeer;
const Peer = require('../../../../../../src/modules/chain/logic/peer');
const PeersManager = require('../../../../../../src/modules/chain/helpers/peers_manager');
const wsRPC = require('../../../../../../src/modules/chain/api/ws/rpc/ws_rpc')
	.wsRPC;

let peersManagerInstance;
let masterWAMPServerMock;

const validRPCProcedureName = 'rpcProcedureA';
const validEventProcedureName = 'eventProcedureB';

describe('PeersManager', async () => {
	let systemComponentMock;

	beforeEach(done => {
		systemComponentMock = {
			headers: {},
		};
		peersManagerInstance = new PeersManager(
			{
				error: sinonSandbox.stub(),
				warn: sinonSandbox.stub(),
				log: sinonSandbox.stub(),
				debug: sinonSandbox.stub(),
				trace: sinonSandbox.stub(),
			},
			systemComponentMock
		);
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

	describe('constructor', async () => {
		it('should have empty peers map after initialization', async () =>
			expect(peersManagerInstance).to.have.property('peers').to.be.empty);

		it('should have empty addressToNonceMap map after initialization', async () =>
			expect(peersManagerInstance).to.have.property('addressToNonceMap').to.be
				.empty);

		it('should have empty nonceToConnectionIdMap map after initialization', async () =>
			expect(peersManagerInstance).to.have.property('nonceToAddressMap').to.be
				.empty);
	});

	describe('method', async () => {
		let validPeer;

		beforeEach(done => {
			validPeer = new Peer(prefixedPeer);
			peersManagerInstance.peers = {};
			peersManagerInstance.addressToNonceMap = {};
			peersManagerInstance.nonceToAddressMap = {};
			done();
		});

		describe('add', async () => {
			it('should return false when invoked without arguments', async () =>
				expect(peersManagerInstance.add()).not.to.be.ok);

			it('should return false when invoked with peer equal null', async () =>
				expect(peersManagerInstance.add(null)).not.to.be.ok);

			it('should return false when invoked with peer equal 0', async () =>
				expect(peersManagerInstance.add(0)).not.to.be.ok);

			it('should return false when invoked with peer has no string field', async () =>
				expect(peersManagerInstance.add({})).not.to.be.ok);

			it('should add entry to peers when invoked with valid arguments', async () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.peers)
					.to.have.property(validPeer.string)
					.eql(validPeer);
			});

			it('should add entry to addressToNonceMap when invoked with valid arguments', async () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.addressToNonceMap)
					.to.have.property(validPeer.string)
					.eql(validPeer.nonce);
			});

			it('should add entry to nonceToAddressMap when invoked with valid arguments', async () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.nonceToAddressMap)
					.to.have.property(validPeer.nonce)
					.eql(validPeer.string);
			});

			it('should prevent from adding peer with the same nonce but different address', async () => {
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				validPeer.string = 'DIFFERENT';
				return expect(peersManagerInstance.add(validPeer)).not.to.be.ok;
			});

			it('should update data on peers list', async () => {
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				validPeer.height = 'DIFFERENT';
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				return expect(peersManagerInstance.peers[validPeer.string]).eql(
					validPeer
				);
			});

			it('should remove old entry when nonce is different', async () => {
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				validPeer.nonce = 'DIFFERENT';
				expect(peersManagerInstance.add(validPeer)).to.be.ok;
				expect(Object.keys(peersManagerInstance.peers).length).to.equal(1);
				return expect(peersManagerInstance.peers[validPeer.string]).eql(
					validPeer
				);
			});

			describe('multiple valid entries', async () => {
				let validPeerA;
				let validPeerB;

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

				it('should contain multiple entries in peers after multiple valid entries added', async () => {
					expect(Object.keys(peersManagerInstance.peers).length).to.equal(2);
					expect(peersManagerInstance.peers)
						.to.have.property(validPeerA.string)
						.eql(validPeerA);
					return expect(peersManagerInstance.peers)
						.to.have.property(validPeerB.string)
						.eql(validPeerB);
				});

				it('should contain multiple entries in addressToNonceMap after multiple valid entries added', async () => {
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

				it('should contain multiple entries in nonceToAddressMap after multiple valid entries added', async () => {
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

			describe('when peer gets added nonce = undefined', async () => {
				beforeEach(done => {
					validPeer.nonce = undefined;
					peersManagerInstance.add(validPeer);
					done();
				});

				it('should not create any entry in addressToNonce map', async () =>
					expect(peersManagerInstance.addressToNonceMap).not.to.have.property(
						validPeer.string
					));

				it('should not create any entry in nonceToAddress map', async () =>
					expect(peersManagerInstance.nonceToAddressMap).to.be.empty);

				describe('when peer is updated with defined nonce = "validNonce"', async () => {
					beforeEach(done => {
						validPeer.nonce = 'validNonce';
						peersManagerInstance.add(validPeer);
						done();
					});

					it('should update an entry [validPeer.string] = "validNonce" in addressToNonce map', async () =>
						expect(peersManagerInstance.addressToNonceMap)
							.to.have.property(validPeer.string)
							.to.equal('validNonce'));

					it('should add an entry "validNonce" = [peer.string] in nonceToAddress map', async () =>
						expect(peersManagerInstance.nonceToAddressMap)
							.to.have.property('validNonce')
							.equal(validPeer.string));
				});
			});
		});

		describe('remove', async () => {
			it('should return false when invoked without arguments', async () =>
				expect(peersManagerInstance.remove()).not.to.be.ok);

			it('should return false when invoked with null', async () =>
				expect(peersManagerInstance.remove(null)).not.to.be.ok);

			it('should return false when invoked with 0', async () =>
				expect(peersManagerInstance.remove(0)).not.to.be.ok);

			it('should return false when invoked with peer without string property', async () =>
				expect(peersManagerInstance.remove({})).not.to.be.ok);

			it('should return false when invoked with peer while attempt to remove not existing peer', async () =>
				expect(peersManagerInstance.remove(validPeer)).not.to.be.ok);

			it('should not change a state of connections table when removing not existing entry', async () => {
				peersManagerInstance.remove(validPeer);
				expect(peersManagerInstance).to.have.property('peers').to.be.empty;
				expect(peersManagerInstance).to.have.property('addressToNonceMap').to.be
					.empty;
				return expect(peersManagerInstance).to.have.property(
					'nonceToAddressMap'
				).to.be.empty;
			});

			it('should remove previously added valid entry', async () => {
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

		describe('getNonce', async () => {
			it('should return undefined when invoked without arguments', async () =>
				expect(peersManagerInstance.getNonce()).to.be.undefined);

			it('should return undefined when asking of not existing entry', async () =>
				expect(peersManagerInstance.getNonce(validPeer.string)).to.be
					.undefined);

			it('should return nonce assigned to connection id when entry exists', async () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.getNonce(validPeer.string)).to.equal(
					validPeer.nonce
				);
			});
		});

		describe('getAddress', async () => {
			it('should return undefined when invoked without arguments', async () =>
				expect(peersManagerInstance.getAddress()).to.be.undefined);

			it('should return undefined when asking of not existing entry', async () =>
				expect(peersManagerInstance.getAddress(validPeer.nonce)).to.be
					.undefined);

			it('should return nonce assigned to connection id when entry exists', async () => {
				peersManagerInstance.add(validPeer);
				return expect(
					peersManagerInstance.getAddress(validPeer.nonce)
				).to.equal(validPeer.string);
			});
		});

		describe('getAll', async () => {
			it('should return empty object if no peers were added before', async () =>
				expect(peersManagerInstance.getAll()).to.be.empty);

			it('should return map of added peers', async () => {
				peersManagerInstance.add(validPeer);
				const validResult = {};
				validResult[validPeer.string] = validPeer;
				return expect(peersManagerInstance.getAll(validPeer.nonce)).eql(
					validResult
				);
			});
		});

		describe('getByNonce', async () => {
			it('should return undefined when invoked without arguments', async () =>
				expect(peersManagerInstance.getByNonce()).to.be.undefined);

			it('should return undefined when asking of not existing entry', async () =>
				expect(peersManagerInstance.getByNonce(validPeer.nonce)).to.be
					.undefined);

			it('should return previously added peer when asking with valid nonce', async () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.getByNonce(validPeer.nonce)).eql(
					validPeer
				);
			});
		});

		describe('getByAddress', async () => {
			it('should return undefined when invoked without arguments', async () =>
				expect(peersManagerInstance.getByAddress()).to.be.undefined);

			it('should return undefined when asking of not existing entry', async () =>
				expect(peersManagerInstance.getByAddress(validPeer.string)).to.be
					.undefined);

			it('should return previously added peer when asking with valid nonce', async () => {
				peersManagerInstance.add(validPeer);
				return expect(peersManagerInstance.getByAddress(validPeer.string)).eql(
					validPeer
				);
			});
		});
	});

	describe('multiple instances', async () => {
		describe('when required 2 times', async () => {
			let peersManagerInstanceA;
			let peersManagerInstanceB;

			beforeEach(done => {
				peersManagerInstanceA = new PeersManager(
					{
						debug: sinonSandbox.stub(),
						trace: sinonSandbox.stub(),
					},
					systemComponentMock
				);
				peersManagerInstanceB = new PeersManager(
					{
						debug: sinonSandbox.stub(),
						trace: sinonSandbox.stub(),
					},
					systemComponentMock
				);
				done();
			});
			describe('when [peersManagerInstanceA] adds data', async () => {
				let validPeer;

				beforeEach(done => {
					validPeer = new Peer(prefixedPeer);
					peersManagerInstanceA.add(validPeer);
					done();
				});

				it('should be reflected in [peersManagerInstanceA]', async () =>
					expect(peersManagerInstanceA.getByAddress(validPeer.string)).eql(
						validPeer
					));

				it('should not be reflected in [peersManagerInstanceB]', async () =>
					expect(peersManagerInstanceB.getByAddress(validPeer.string)).not.eql(
						validPeer
					));
			});
		});
	});
});
