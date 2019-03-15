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

const failureCodes = require('../../../../../../src/modules/chain/api/ws/rpc/failure_codes');
const submodulesLoader = require('../../../../common/submodules_loader');
const prefixedPeer = require('../../../../fixtures/peers').randomNormalizedPeer;
const RandomPeer = require('../../../../fixtures/peers').Peer;
const Peers = require('../../../../../../src/modules/chain/logic/peers');
const Peer = require('../../../../../../src/modules/chain/logic/peer');
const wsRPC = require('../../../../../../src/modules/chain/api/ws/rpc/ws_rpc')
	.wsRPC;

let masterWAMPServerMock;

const validRPCProcedureName = 'rpcProcedureA';
const validEventProcedureName = 'eventProcedureB';

describe('peers', () => {
	let peersSubmoduleMock;
	let peers;
	let validPeer;
	let validNodeNonce;

	before(done => {
		peersSubmoduleMock = {
			acceptable: sinonSandbox.stub().returnsArg(0),
		};

		submodulesLoader.initLogic(
			Peers,
			submodulesLoader.scope,
			(err, __peers) => {
				peers = __peers;
				peers.bindSubmodules({ peers: peersSubmoduleMock });
				done();
			}
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
	});

	beforeEach(done => {
		peersSubmoduleMock.acceptable = sinonSandbox.stub().returnsArg(0);
		validPeer = _.assign({}, prefixedPeer);
		done();
	});

	function removeAll() {
		peers.list().forEach(peer => {
			peers.remove(peer);
		});

		expect(peers.list()).that.is.an('array').and.to.be.empty;
	}

	function arePeersEqual(peerA, peerB) {
		const allPeersProperties = function(peer) {
			return _.keys(peer).every(
				property =>
					Peer.prototype.properties
						.concat(Peer.prototype.connectionProperties)
						.concat(['string'])
						.indexOf(property) !== -1
			);
		};

		if (!allPeersProperties(peerA)) {
			throw new Error('Not a peer: ', peerA);
		}

		if (!allPeersProperties(peerB)) {
			throw new Error('Not a peer: ', peerB);
		}

		const commonProperties = _.intersection(_.keys(peerA), _.keys(peerB));

		if (
			commonProperties.indexOf('ip') === -1 ||
			commonProperties.indexOf('wsPort') === -1
		) {
			throw new Error(
				'Insufficient data to compare the peers (no port or ip provided)'
			);
		}

		return commonProperties.every(
			property => peerA[property] === peerB[property]
		);
	}

	describe('create', () => {
		it('should always return Peer instance', async () => {
			expect(peers.create()).to.be.an.instanceof(Peer);
			expect(peers.create(validPeer)).to.be.an.instanceof(Peer);
			return expect(peers.create(new Peer(validPeer))).to.be.an.instanceof(
				Peer
			);
		});
	});

	describe('list', () => {
		beforeEach(() => removeAll());

		it('should list peers as Peer instances', async () => {
			peers.upsert(validPeer);
			return peers.list().forEach(peer => {
				expect(peer).to.be.an.instanceof(Peer);
			});
		});

		it('should list peers with rpc', async () => {
			peers.upsert(validPeer);
			return peers.list().forEach(peer => {
				expect(peer).have.property('rpc');
			});
		});

		describe('when normalized', () => {
			it('should list peers as objects when normalized', async () => {
				peers.upsert(validPeer);
				return peers.list(true).forEach(peer => {
					expect(peer).to.be.an('object');
				});
			});

			it('should not contain rpc property when normalized', async () => {
				peers.upsert(validPeer);
				return peers.list(true).forEach(peer => {
					expect(peer).not.to.have.property('rpc');
				});
			});
		});
	});

	describe('listRandomConnected', () => {
		beforeEach(() => removeAll());

		it('should return list of peers', async () => {
			peers.upsert(validPeer);
			const result = peers.listRandomConnected();
			expect(result).to.be.an('array');
			return result.forEach(peer => {
				expect(peer).to.be.an.instanceof(Peer);
			});
		});

		it('should return list of peers with maximum lengh determined by limit param', async () => {
			for (let i = 0; i < 100; i++) {
				peers.upsert(new RandomPeer());
			}
			return expect(
				peers.listRandomConnected({ limit: 20 }).length
			).to.be.equal(20);
		});

		it('should return list of peers shuffled in random order', async () => {
			for (let i = 0; i < 100; i++) {
				peers.upsert(new RandomPeer());
			}
			const firstShuffle = peers.listRandomConnected();
			const firstShuffleStrings = firstShuffle.map(peer => peer.string);

			const secondShuffle = peers.listRandomConnected();
			const secondShuffleStrings = secondShuffle.map(peer => peer.string);

			return expect(firstShuffleStrings).to.not.be.equal(secondShuffleStrings);
		});
	});

	describe('upsert', () => {
		beforeEach(() => removeAll());

		it('should insert new peers', async () => {
			peers.upsert(validPeer);
			return expect(peers.list().length).equal(1);
		});

		it('should update height of existing peer', async () => {
			peers.upsert(validPeer);
			let list = peers.list();
			const inserted = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(inserted, validPeer)).to.be.ok;

			const modifiedPeer = _.clone(validPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer);
			list = peers.list();
			const updated = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(updated, modifiedPeer)).to.be.ok;
			return expect(arePeersEqual(updated, validPeer)).to.be.not.ok;
		});

		it('should not update height with insertOnly param', async () => {
			peers.upsert(validPeer);
			let list = peers.list();
			const inserted = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(inserted, validPeer)).to.be.ok;

			const modifiedPeer = _.clone(validPeer);
			modifiedPeer.height += 1;
			peers.upsert(modifiedPeer, true);
			list = peers.list();
			const updated = list[0];
			expect(list.length).equal(1);
			expect(arePeersEqual(updated, modifiedPeer)).to.be.not.ok;
			return expect(arePeersEqual(updated, validPeer)).to.be.ok;
		});

		it('should insert peer with different ports', async () => {
			peers.upsert(validPeer);
			expect(peers.list().length).equal(1);

			const differentPortPeer = _.clone(validPeer);
			differentPortPeer.nonce = 'differentNonce';
			differentPortPeer.wsPort += 1;
			peers.upsert(differentPortPeer);
			const list = peers.list();
			expect(list.length).equal(2);

			const demandedPorts = _.map([validPeer, differentPortPeer], 'wsPort');
			const listPorts = _.map(list, 'wsPort');

			return expect(_.isEqual(demandedPorts.sort(), listPorts.sort())).to.be.ok;
		});

		it('should insert peer with different ips', async () => {
			peers.upsert(validPeer);
			expect(peers.list().length).equal(1);

			const differentIpPeer = _.clone(validPeer);
			delete differentIpPeer.string;
			differentIpPeer.ip = '40.40.40.41';
			differentIpPeer.nonce = 'differentNonce';

			peers.upsert(differentIpPeer);
			const list = peers.list();
			expect(list.length).equal(2);

			const demandedIps = _.map([validPeer, differentIpPeer], 'ip');
			const listIps = _.map(list, 'ip');

			return expect(_.isEqual(demandedIps.sort(), listIps.sort())).to.be.ok;
		});

		describe('should fail with valid error code', () => {
			it('INSERT_ONLY_FAILURE when insertOnly flag is present and peer already exists', async () => {
				peers.upsert(validPeer);
				return expect(peers.upsert(validPeer, true)).to.equal(
					failureCodes.ON_MASTER.INSERT.INSERT_ONLY_FAILURE
				);
			});

			it('INVALID_PEER when called with invalid peer', async () =>
				expect(peers.upsert({})).to.equal(
					failureCodes.ON_MASTER.UPDATE.INVALID_PEER
				));

			it('NOT_ACCEPTED when called with the same as node nonce', async () => {
				peersSubmoduleMock.acceptable = sinonSandbox.stub().returns([]);
				validPeer.nonce = validNodeNonce;
				return expect(peers.upsert(validPeer)).to.equal(
					failureCodes.ON_MASTER.INSERT.NOT_ACCEPTED
				);
			});
		});
	});

	describe('exists', () => {
		beforeEach(() => removeAll());

		it('should return false if peer is not on the list', async () =>
			expect(
				peers.exists({
					ip: '41.41.41.41',
					wsPort: '4444',
					nonce: 'another_nonce',
				})
			).not.to.be.ok);

		it('should return true if peer is on the list', async () => {
			peers.upsert(validPeer);
			const list = peers.list(true);
			expect(list.length).equal(1);
			return expect(peers.exists(validPeer)).to.be.ok;
		});

		/* eslint-disable mocha/no-skipped-tests */
		it.skip('should return true if peer with same nonce is on the list', async () => {
			const list = peers.list(true);
			expect(list.length).equal(1);
			return expect(
				peers.exists({
					ip: validPeer.ip,
					wsPort: validPeer.wsPort,
					nonce: validPeer.nonce,
				})
			).to.be.ok;
		});
		/* eslint-enable mocha/no-skipped-tests */

		it('should return true if peer with same address is on the list', async () => {
			peers.upsert(validPeer);
			const list = peers.list(true);
			expect(list.length).equal(1);
			return expect(
				peers.exists({ ip: validPeer.ip, wsPort: validPeer.wsPort })
			).to.be.ok;
		});
	});

	describe('get', () => {
		beforeEach(() => removeAll());

		it('should return inserted peer', async () => {
			peers.upsert(validPeer);
			const insertedPeer = peers.get(validPeer);
			return expect(arePeersEqual(insertedPeer, validPeer)).to.be.ok;
		});

		it('should return inserted peer by address', async () => {
			peers.upsert(validPeer);
			const insertedPeer = peers.get(`${validPeer.ip}:${validPeer.wsPort}`);
			return expect(arePeersEqual(insertedPeer, validPeer)).to.be.ok;
		});

		it('should return undefined if peer is not inserted', async () =>
			expect(peers.get(validPeer)).to.be.undefined);
	});

	describe('remove', () => {
		beforeEach(() => removeAll());

		it('should remove added peer', async () => {
			peers.upsert(validPeer);
			expect(peers.list().length).equal(1);
			const result = peers.remove(validPeer);
			expect(result).to.be.ok;
			return expect(peers.list().length).equal(0);
		});

		it('should return an error when trying to remove a non-existent peer', async () => {
			const result = peers.remove(validPeer);
			expect(result)
				.to.be.a('number')
				.equal(failureCodes.ON_MASTER.REMOVE.NOT_ON_LIST);
			return expect(peers.list().length).equal(0);
		});
	});
});
