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
import { NewList } from '../../../src/peer_directory/new_list';
import {
	initializePeerInfoList,
	initializePeerInfoListWithSuffix,
} from '../../utils/peers';
import { P2PPeerInfo } from '../../../src/p2p_types';
import { PEER_TYPE, constructPeerIdFromPeerInfo } from '../../../src/utils';
import {
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
} from '../../../src';

describe('newPeer', () => {
	const newPeerConfig = {
		peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
		peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
		secret: 123456,
		peerType: PEER_TYPE.NEW_PEER,
		evictionThresholdTime: 86400000,
	};

	describe('#constructor', () => {
		let newPeersObj: NewList;

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
		});

		it('should set properties correctly and create a map of 64 size with 32 buckets each', async () => {
			expect(newPeersObj.newPeerConfig).to.be.eql(newPeerConfig);
			expect(newPeersObj.newPeerConfig.peerBucketCount).to.be.equal(128);
			expect(newPeersObj.newPeerConfig.peerBucketSize).to.be.equal(32);
		});
	});

	describe('#evictionBasedOnRandomSelection', () => {
		const newPeerConfig = {
			peerBucketSize: 2,
			peerBucketCount: 2,
			secret: 123456,
			peerType: PEER_TYPE.NEW_PEER,
			evictionThresholdTime: 86400000,
		};
		const samplePeers = initializePeerInfoList();

		let newPeersobj = new NewList(newPeerConfig);
		newPeersobj.addPeer(samplePeers[0]);
		newPeersobj.addPeer(samplePeers[1]);

		// Now capture the evicted peers from addition of new Peers
		const evictionResult1 = newPeersobj.addPeer(samplePeers[2]);
		const evictionResult2 = newPeersobj.addPeer(samplePeers[3]);
		const evictionResult3 = newPeersobj.addPeer(samplePeers[4]);

		it('should evict at least one peer from the peerlist based on bucket eviction', async () => {
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
			expect(evictedPeersAfterAddition).not.members(newPeersobj.peersList());
		});
	});

	describe('#evictionBasedOnTime', () => {
		const newPeerConfig = {
			peerBucketSize: 3,
			peerBucketCount: 1,
			secret: 123456,
			peerType: PEER_TYPE.NEW_PEER,
			evictionThresholdTime: 10000,
		};
		const samplePeers = initializePeerInfoList();

		let newPeersList = new NewList(newPeerConfig);
		// Add a custom map to peerMap
		const newPeerMapCustom = new Map();
		// Add a custom Date to a peer that has dateAdded above the evictionThresholdTime
		const peerDate = new Date();
		peerDate.setMilliseconds(peerDate.getMilliseconds() + 11000);
		const oldPeer = { peerInfo: samplePeers[0], dateAdded: peerDate };
		// Now set 2 peer with one peer staying in a bucket for longer than 10 seconds
		newPeerMapCustom.set(constructPeerIdFromPeerInfo(samplePeers[0]), oldPeer);
		newPeerMapCustom.set(constructPeerIdFromPeerInfo(samplePeers[1]), {
			peerInfo: samplePeers[1],
			dateAdded: new Date(),
		});
		newPeerMapCustom.set(constructPeerIdFromPeerInfo(samplePeers[2]), {
			peerInfo: samplePeers[2],
			dateAdded: new Date(),
		});

		// Set the peerMap for a bucket
		newPeersList['peerMap'].set(0, newPeerMapCustom);

		// Since the bucket is already full it should evict one peer but it should trigger eviction based on time
		const evictionResult = newPeersList.addPeer(samplePeers[3]);

		it('should always evict the peer that has stayed in peer bucket for more than 10 seconds', async () => {
			expect(evictionResult.evictedPeer).to.not.be.undefined;
			expect(evictionResult.evictedPeer)
				.is.an('object')
				.ownProperty('ipAddress')
				.to.be.eql(oldPeer.peerInfo.ipAddress);
		});
	});

	describe('#evictionBasedOnTimeWithLargeSample', () => {
		let newPeersList: NewList;
		let clock: sinon.SinonFakeTimers;

		beforeEach(() => {
			clock = sandbox.useFakeTimers();
			const newPeerConfig = {
				peerBucketSize: 32,
				peerBucketCount: 128,
				secret: 123456,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: 600000,
			};
			const samplePeersA = initializePeerInfoListWithSuffix('1.222.123', 10000);
			const samplePeersB = initializePeerInfoListWithSuffix('234.11.34', 10000);

			newPeersList = new NewList(newPeerConfig);

			samplePeersA.forEach(peerInfo => {
				clock.tick(2);
				newPeersList.addPeer(peerInfo);
			});

			clock.tick(600000);

			samplePeersB.forEach(peerInfo => {
				clock.tick(2);
				newPeersList.addPeer(peerInfo);
			});
		});

		it('should not allow newPeer list to grow beyond 4096 peers', async () => {
			expect(newPeersList.peersList().length).to.be.lte(4096);
		});
	});
});
