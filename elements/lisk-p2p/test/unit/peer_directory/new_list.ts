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

	describe('#addPeer', () => {
		let newPeersObj: NewList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
			newPeersObj.addPeer(samplePeers[0]);
		});

		it('should add the incoming peer when it does not exist already', async () => {
			expect(newPeersObj.getPeer(samplePeers[0])).eql(samplePeers[0]);
		});

		it('should not add the incoming peer if it exists', async () => {
			expect(newPeersObj.addPeer(samplePeers[0]))
				.to.be.an('object')
				.haveOwnProperty('success').to.be.false;
		});
	});

	describe('#getNewPeersList', () => {
		const samplePeers = initializePeerInfoList();
		let newPeersObj: NewList;
		let newPeersArray: ReadonlyArray<P2PPeerInfo>;

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
			newPeersObj.addPeer(samplePeers[0]);
			newPeersObj.addPeer(samplePeers[1]);
			newPeersObj.addPeer(samplePeers[2]);
			newPeersArray = newPeersObj.peersList();
		});

		it('should return new peers list', async () => {
			const expectedNewPeersArray = [
				samplePeers[0],
				samplePeers[1],
				samplePeers[2],
			];
			expect(newPeersArray).to.have.members(expectedNewPeersArray);
		});
	});

	describe('#removePeer', () => {
		let newPeersObj: NewList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
			newPeersObj.addPeer(samplePeers[0]);
			newPeersObj.addPeer(samplePeers[1]);
		});

		it('should remove the peer from the incoming peerInfo', async () => {
			newPeersObj.removePeer(samplePeers[0]);
			expect(newPeersObj.getPeer(samplePeers[0])).to.be.undefined;
		});
	});

	describe('#getPeer', () => {
		let newPeersObj: NewList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
			newPeersObj.addPeer(samplePeers[0]);
			newPeersObj.addPeer(samplePeers[1]);
		});

		describe('when peer exists in the triedPeers peerMap', () => {
			it('should get the peer from the incoming peerId', async () => {
				expect(newPeersObj.getPeer(samplePeers[0]))
					.to.be.an('object')
					.and.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the triedPeers peerMap', () => {
			const randomPeer = initializePeerInfoList()[2];
			it('should return undefined for the given peer that does not exist in peerMap', async () => {
				expect(newPeersObj.getPeer(randomPeer)).to.be.undefined;
			});
		});
	});

	describe('#updatePeer', () => {
		let newPeersObj: NewList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
			newPeersObj.addPeer(samplePeers[0]);
			newPeersObj.addPeer(samplePeers[1]);
		});

		describe('when trying to update a peer that exist', () => {
			it('should update the peer from the incoming peerInfo', async () => {
				let updatedPeer = {
					...samplePeers[0],
					height: 0,
					version: '1.2.3',
				};

				const success = newPeersObj.updatePeer(updatedPeer);
				expect(success).to.be.true;
				expect(newPeersObj.getPeer(samplePeers[0])).to.be.eql(updatedPeer);
			});
		});

		describe('when trying to update a peer that does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				let updatedPeer = {
					...samplePeers[2],
					height: 0,
					version: '1.2.3',
				};

				const success = newPeersObj.updatePeer(updatedPeer);
				expect(success).to.be.false;
			});
		});
	});

	describe('#findPeer', () => {
		let newPeersObj: NewList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
			newPeersObj.addPeer(samplePeers[0]);
			newPeersObj.addPeer(samplePeers[1]);
		});

		describe('when the peer exist', () => {
			it('should find the peer from the incoming peerInfo', async () => {
				const peer = newPeersObj.getPeer(samplePeers[0]);
				expect(peer).eql(samplePeers[0]);
			});
		});

		describe('when the peer does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				const success = newPeersObj.updatePeer(samplePeers[2]);
				expect(success).to.be.false;
			});
		});
	});

	describe('#failedConnectionAction', () => {
		let newPeersObj: NewList;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersObj = new NewList(newPeerConfig);
			newPeersObj.addPeer(samplePeers[0]);
			newPeersObj.addPeer(samplePeers[1]);
		});

		describe('when the peer exist and applied failedConnectionAction', () => {
			it('should delete the peer and for the second call it should return false', async () => {
				const success1 = newPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success1).to.be.true;
				const success2 = newPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.false;
			});
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

		it('should evict atleast one peer from the peerlist based on random eviction', async () => {
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
		const newPeerConfig = {
			peerBucketSize: 32,
			peerBucketCount: 128,
			secret: 123456,
			peerType: PEER_TYPE.NEW_PEER,
			evictionThresholdTime: 600000,
		};
		const samplePeersA = initializePeerInfoListWithSuffix('1.222.123', 10000);
		const samplePeersB = initializePeerInfoListWithSuffix('234.11.34', 10000);

		let newPeersList = new NewList(newPeerConfig);

		samplePeersA.forEach(peerInfo => {
			global.sandbox.clock.tick(2);
			newPeersList.addPeer(peerInfo);
		});

		global.sandbox.clock.tick(600000);

		samplePeersB.forEach(peerInfo => {
			global.sandbox.clock.tick(2);
			newPeersList.addPeer(peerInfo);
		});

		it('should not allow newPeer list to grow beyond 4096 peers', async () => {
			expect(newPeersList.peersList().length).to.be.lte(4096);
		});
	});
});
