/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import { expect } from 'chai';
import { TriedList } from '../../../src/peer_directory/tried_list';
import { initializePeerInfoList } from '../../utils/peers';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';
import { PEER_TYPE } from '../../../src/utils';

describe('triedPeer', () => {
	const triedPeerConfig = {
		maxReconnectTries: 3,
		peerBucketSize: 32,
		peerBucketCount: 64,
		secret: 123456,
		peerType: PEER_TYPE.TRIED_PEER,
	};

	describe('#constructor', () => {
		let triedPeersObj: TriedList;

		beforeEach(async () => {
			triedPeersObj = new TriedList(triedPeerConfig);
		});

		it('should set properties correctly and create a map of 64 size with 32 buckets each', async () => {
			expect(triedPeersObj.triedPeerConfig).to.be.eql(triedPeerConfig);
			expect(triedPeersObj.triedPeerConfig.peerBucketCount).to.be.equal(64);
			expect(triedPeersObj.triedPeerConfig.peerBucketSize).to.be.equal(32);
		});
	});

	describe('#addPeer', () => {
		let triedPeersObj: TriedList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			triedPeersObj = new TriedList(triedPeerConfig);
			triedPeersObj.addPeer(samplePeers[0]);
		});

		it('should add the incoming peer if it does not exist already', async () => {
			expect(triedPeersObj.getPeer(samplePeers[0])).eql(samplePeers[0]);
		});

		it('should not add the incoming peer if it exists', async () => {
			expect(triedPeersObj.addPeer(samplePeers[0]))
				.to.be.an('object')
				.haveOwnProperty('wasPeerAdded').to.be.false;
		});
	});

	describe('#gettriedPeersObj', () => {
		const samplePeers = initializePeerInfoList();
		let triedPeersObj: TriedList;
		let triedPeersArray: ReadonlyArray<P2PDiscoveredPeerInfo>;

		before(async () => {
			triedPeersObj = new TriedList(triedPeerConfig);
			triedPeersObj.addPeer(samplePeers[0]);
			triedPeersObj.addPeer(samplePeers[1]);
			triedPeersObj.addPeer(samplePeers[2]);
			triedPeersArray = triedPeersObj.peersList() as ReadonlyArray<
				P2PDiscoveredPeerInfo
			>;
		});

		it('should return tried peers list', async () => {
			const expectedTriedPeersArray = [
				samplePeers[0],
				samplePeers[1],
				samplePeers[2],
			];
			expect(triedPeersArray).to.have.members(expectedTriedPeersArray);
		});
	});

	describe('#removePeer', () => {
		let triedPeersObj: TriedList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			triedPeersObj = new TriedList(triedPeerConfig);
			triedPeersObj.addPeer(samplePeers[0]);
			triedPeersObj.addPeer(samplePeers[1]);
		});

		it('should remove the peer from the incoming peerInfo', async () => {
			triedPeersObj.removePeer(samplePeers[0]);
			expect(triedPeersObj.getPeer(samplePeers[0])).to.be.undefined;
		});
	});

	describe('#getPeer', () => {
		let triedPeersObj: TriedList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			triedPeersObj = new TriedList(triedPeerConfig);
			triedPeersObj.addPeer(samplePeers[0]);
			triedPeersObj.addPeer(samplePeers[1]);
		});

		describe('when peer exists in the triedPeers peerMap', () => {
			it('should get the peer from the incoming peerId', async () => {
				expect(triedPeersObj.getPeer(samplePeers[0]))
					.to.be.an('object')
					.and.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the triedPeers peerMap', () => {
			const randomPeer = initializePeerInfoList()[2];
			it('should return undefined for the given peer that does not exist in peerMap', async () => {
				expect(triedPeersObj.getPeer(randomPeer)).to.be.undefined;
			});
		});
	});

	describe('#updatePeer', () => {
		let triedPeersObj: TriedList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			triedPeersObj = new TriedList(triedPeerConfig);
			triedPeersObj.addPeer(samplePeers[0]);
			triedPeersObj.addPeer(samplePeers[1]);
		});

		describe('when trying to update a peer that exist', () => {
			it('should update the peer from the incoming peerInfo', async () => {
				let updatedPeer = {
					...samplePeers[0],
					height: 0,
					version: '1.2.3',
				};

				const success = triedPeersObj.updatePeer(updatedPeer);
				expect(success).to.be.true;
				expect(triedPeersObj.getPeer(samplePeers[0])).to.be.eql(updatedPeer);
			});
		});

		describe('when trying to update a peer that does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				let updatedPeer = {
					...samplePeers[2],
					height: 0,
					version: '1.2.3',
				};

				const success = triedPeersObj.updatePeer(updatedPeer);
				expect(success).to.be.false;
			});
		});
	});

	describe('#findPeer', () => {
		let triedPeersObj: TriedList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			triedPeersObj = new TriedList(triedPeerConfig);
			triedPeersObj.addPeer(samplePeers[0]);
			triedPeersObj.addPeer(samplePeers[1]);
		});
		describe('when the peer exist', () => {
			it('should find the peer from the incoming peerInfo', async () => {
				const peer = triedPeersObj.getPeer(samplePeers[0]);
				expect(peer).eql(samplePeers[0]);
			});
		});

		describe('when the peer does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				const success = triedPeersObj.updatePeer(samplePeers[2]);
				expect(success).to.be.false;
			});
		});
	});

	describe('#failedConnectionAction', () => {
		let triedPeersObj: TriedList;
		const samplePeers = initializePeerInfoList();

		describe('when maxReconnectTries is 1', () => {
			beforeEach(async () => {
				const triedPeerConfig = {
					maxReconnectTries: 1,
					peerBucketSize: 32,
					peerBucketCount: 64,
					secret: 123456,
					peerType: PEER_TYPE.TRIED_PEER,
				};
				triedPeersObj = new TriedList(triedPeerConfig);
				triedPeersObj.addPeer(samplePeers[0]);
			});

			it('should remove the peer from the triedPeerList', async () => {
				const success = triedPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success).to.be.true;
				expect(triedPeersObj.getPeer(samplePeers[0])).to.be.undefined;
			});
		});

		describe('when maxReconnectTries is 2', () => {
			beforeEach(async () => {
				const triedPeerConfig = {
					maxReconnectTries: 2,
					peerBucketSize: 32,
					peerBucketCount: 64,
					secret: 123456,
					peerType: PEER_TYPE.TRIED_PEER,
				};
				triedPeersObj = new TriedList(triedPeerConfig);
				triedPeersObj.addPeer(samplePeers[0]);
			});

			it('should not remove the peer after the first call and remove it after second failed connection', async () => {
				const success1 = triedPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success1).to.be.false;
				expect(triedPeersObj.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);

				const success2 = triedPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.true;
				expect(triedPeersObj.getPeer(samplePeers[0])).to.be.undefined;
			});
		});

		describe('#evictionRandomly', () => {
			const newPeerConfig = {
				peerBucketSize: 2,
				peerBucketCount: 2,
				secret: 123456,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: 86400000,
			};
			const samplePeers = initializePeerInfoList();

			let triedPeersObj = new TriedList(newPeerConfig);
			triedPeersObj.addPeer(samplePeers[0]);
			triedPeersObj.addPeer(samplePeers[1]);

			// Now capture the evicted peers from addition of new Peers
			const evictionResult1 = triedPeersObj.addPeer(samplePeers[2]);
			const evictionResult2 = triedPeersObj.addPeer(samplePeers[3]);
			const evictionResult3 = triedPeersObj.addPeer(samplePeers[4]);

			it('should evict at least one peer from the peerlist based on random eviction', async () => {
				const evictionResultAfterAddition = [
					evictionResult1,
					evictionResult2,
					evictionResult3,
				].map(result => !!result.evictedPeer);
				expect(evictionResultAfterAddition).includes(true);
			});

			it('should remove the evicted peers from the peer list', async () => {
				const evictedPeersAfterAddition = [
					evictionResult1,
					evictionResult2,
					evictionResult3,
				]
					.filter(result => result.evictedPeer)
					.map(trueEvictionResult => trueEvictionResult.evictedPeer);
				expect(evictedPeersAfterAddition).not.members(
					triedPeersObj.peersList(),
				);
			});
		});
	});
});
