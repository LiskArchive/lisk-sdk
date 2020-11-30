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
import { BaseList } from '../../../src/peer_book/base_list';
import { P2PEnhancedPeerInfo, P2PPeerInfo } from '../../../src/types';
import { initPeerInfoList } from '../../utils/peers';
import { PEER_TYPE, getBucketId } from '../../../src/utils';
import {
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_RANDOM_SECRET,
} from '../../../src/constants';

import { errors } from '../../../src';
import 'jest-extended';

describe('Peers base list', () => {
	const peerListConfig = {
		bucketSize: DEFAULT_NEW_BUCKET_SIZE,
		numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
		secret: DEFAULT_RANDOM_SECRET,
		peerType: PEER_TYPE.TRIED_PEER,
	};
	let peerListObj: BaseList;
	let samplePeers: ReadonlyArray<P2PPeerInfo>;

	describe('#constructor', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect((peerListObj as any).peerListConfig).toEqual(peerListConfig);
			expect((peerListObj as any).peerListConfig.bucketSize).toBe(DEFAULT_NEW_BUCKET_SIZE);
			expect((peerListObj as any).peerListConfig.numOfBuckets).toBe(DEFAULT_NEW_BUCKET_COUNT);
			expect((peerListObj as any).peerListConfig.secret).toBe(DEFAULT_RANDOM_SECRET);
			expect((peerListObj as any).peerListConfig.peerType).toBe(PEER_TYPE.TRIED_PEER);
			expect((peerListObj as any).bucketIdToBucket).toEqual(expect.any(Map));
			expect((peerListObj as any).bucketIdToBucket.size).toBe(DEFAULT_NEW_BUCKET_COUNT);

			for (const peer of (peerListObj as any).bucketIdToBucket) {
				expect(peer).toHaveLength(2);
				expect(peer).toEqual(expect.any(Array));

				expect(peer[0]).toSatisfy((n: number): boolean => {
					return n >= 0 && n <= DEFAULT_NEW_BUCKET_COUNT;
				});

				expect(peer[1]).toBeEmpty();
			}
		});
	});

	describe('#peerList', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
			peerListObj.addPeer(samplePeers[2]);
		});

		it('should return tried peers list', () => {
			expect(peerListObj.peerList).toHaveLength(3);
			expect(peerListObj.peerList.map(peer => peer.peerId)).toEqual(
				expect.arrayContaining([samplePeers[0].peerId]),
			);
			expect(peerListObj.peerList.map(peer => peer.peerId)).toEqual(
				expect.arrayContaining([samplePeers[1].peerId]),
			);
			expect(peerListObj.peerList.map(peer => peer.peerId)).toEqual(
				expect.arrayContaining([samplePeers[2].peerId]),
			);
		});
	});

	describe('#getPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		describe('when peer exists in the bucketIdToBucket map', () => {
			it('should get the peer from the incoming peerId', () => {
				expect(peerListObj.getPeer(samplePeers[0].peerId)).toEqual(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the bucketIdToBucket map', () => {
			it('should return undefined for the given peer that does not exist in bucketIdToBucket map', () => {
				const randomPeer = initPeerInfoList()[2];
				expect(peerListObj.getPeer(randomPeer.peerId)).toBeUndefined();
			});
		});
	});

	describe('#hasPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
		});

		it('should return true if peer exists in peer book', () => {
			peerListObj.addPeer(samplePeers[0]);
			expect(peerListObj.hasPeer(samplePeers[0].peerId)).toBe(true);
		});

		it('should return false if peer exists in peer book', () => {
			expect(peerListObj.hasPeer(samplePeers[0].peerId)).toBe(false);
		});
	});

	describe('#addPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			const bucket = new Map<string, P2PEnhancedPeerInfo>();
			bucket.set(samplePeers[0].peerId, samplePeers[0]);

			jest.spyOn(peerListObj, 'calculateBucket').mockReturnValue({ bucketId: 0, bucket });

			jest.spyOn(peerListObj, 'makeSpace');
		});

		it('should add the incoming peer if it does not exist already', () => {
			peerListObj.addPeer(samplePeers[0]);
			expect(peerListObj.getPeer(samplePeers[0].peerId)).toEqual(samplePeers[0]);
		});

		it('should throw error if peer already exists', () => {
			peerListObj.addPeer(samplePeers[0]);
			// 'Peer already exists'
			expect(() => peerListObj.addPeer(samplePeers[0])).toThrow(errors.ExistingPeerError);
		});

		it('should call makeSpace method when bucket is full', () => {
			peerListObj = new BaseList({
				bucketSize: 1,
				numOfBuckets: 1,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
			});
			jest.spyOn(peerListObj, 'makeSpace');
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);

			expect(peerListObj.makeSpace).toHaveBeenCalled();
		});

		describe('when bucket is not full', () => {
			it('should return undefined', () => {
				peerListObj = new BaseList({ ...peerListConfig, bucketSize: 50 });
				peerListObj.addPeer(samplePeers[0]);
				const evictedPeer = peerListObj.addPeer(samplePeers[1]);

				expect(evictedPeer).toBeUndefined();
			});
		});

		describe('when bucket is full', () => {
			it('should return evicted peer', () => {
				peerListObj = new BaseList({
					bucketSize: 1,
					numOfBuckets: 1,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
				});
				peerListObj.addPeer(samplePeers[0]);
				const evictedPeer = peerListObj.addPeer(samplePeers[1]);

				expect(samplePeers.map(peer => peer.peerId)).toEqual(
					expect.arrayContaining([(evictedPeer as any).peerId]),
				);
			});
		});
	});

	describe('#updatePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		describe('when trying to update a peer that exist', () => {
			it('should update the peer from the incoming peerInfo', () => {
				const updatedPeer = {
					...samplePeers[0],
					height: 0,
					version: '1.2.3',
				};

				const success = peerListObj.updatePeer(updatedPeer);
				expect(success).toBe(true);
				expect(peerListObj.getPeer(samplePeers[0].peerId)).toEqual(updatedPeer);
			});
		});

		describe('when trying to update a peer that does not exist', () => {
			it('should return false when the peer does not exist', () => {
				const updatedPeer = {
					...samplePeers[2],
					height: 0,
					version: '1.2.3',
				};

				const success = peerListObj.updatePeer(updatedPeer);
				expect(success).toBe(false);
			});
		});
	});

	describe('#removePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		it('should remove the peer from the incoming peerInfo', () => {
			peerListObj.removePeer(samplePeers[0]);
			expect(peerListObj.getPeer(samplePeers[0].peerId)).toBeUndefined();
		});
	});

	describe('#makeSpace', () => {
		let bucket: any;
		let calculateBucketStub: any;
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList({
				bucketSize: 2,
				numOfBuckets: 1,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
			});
			peerListObj.addPeer(samplePeers[0]);
			bucket = new Map<string, P2PEnhancedPeerInfo>();
			bucket.set(samplePeers[0].peerId, samplePeers[0]);
			calculateBucketStub = jest
				.spyOn(peerListObj, 'calculateBucket')
				.mockImplementation((input: any) => input);
		});

		describe('when bucket is full', () => {
			it('should evict one peer randomly', () => {
				calculateBucketStub({ bucketId: 0, bucket });
				const evictedPeer = peerListObj.makeSpace(bucket);

				expect(samplePeers).toEqual(expect.arrayContaining([evictedPeer as any]));
			});
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer', () => {
				bucket = new Map<string, P2PEnhancedPeerInfo>();
				calculateBucketStub({ bucketId: 1234, bucket });
				const evictedPeer = peerListObj.makeSpace(bucket);

				expect(evictedPeer).toBeUndefined();
			});
		});
	});

	describe('#failedConnectionAction', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		describe('when the peer exist and applied failedConnectionAction', () => {
			it('should delete the peer and for the second call it should return false', () => {
				const success1 = peerListObj.failedConnectionAction(samplePeers[0]);
				expect(success1).toBe(true);
				const success2 = peerListObj.failedConnectionAction(samplePeers[0]);
				expect(success2).toBe(false);
			});
		});
	});

	describe('#calculateBucket', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
		});

		it('should get a bucket and bucketId by ipAddress(es)', () => {
			const bucketId = getBucketId({
				bucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
				targetAddress: samplePeers[0].ipAddress,
				sourceAddress: samplePeers[1].ipAddress,
			});

			const { bucket, bucketId: calculatedBucketId } = peerListObj.calculateBucket(
				samplePeers[0].ipAddress,
				samplePeers[1].ipAddress,
			);

			expect(calculatedBucketId).toEqual(bucketId);
			expect(bucket).toEqual((peerListObj as any).bucketIdToBucket.get(bucketId));
		});
	});

	describe('#getBucket', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
		});

		it('should get bucket based on peerId', () => {
			const bucket = (peerListObj as any).getBucket(samplePeers[0].peerId);

			expect(bucket.get(samplePeers[0].peerId).peerId).toEqual(samplePeers[0].peerId);
		});

		it('should return undefined if peer not in bucket', () => {
			expect((peerListObj as any).getBucket(samplePeers[1].peerId)).toBeUndefined();
		});
	});
});
