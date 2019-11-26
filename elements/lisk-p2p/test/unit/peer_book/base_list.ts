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
import { BaseList } from '../../../src/peer_book/base_list';
import { P2PEnhancedPeerInfo } from '../../../src/p2p_types';
import { initPeerInfoList } from '../../utils/peers';
import { PEER_TYPE } from '../../../src/utils';
import {
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_RANDOM_SECRET,
} from '../../../src/constants';
import { getBucketId } from '../../../src/utils';
import { ExistingPeerError, P2PPeerInfo } from '../../../src';

describe('Peers base list', () => {
	const peerListConfig = {
		peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
		peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
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
			expect((peerListObj as any).peerListConfig).to.be.eql(peerListConfig);
			expect((peerListObj as any).peerListConfig.peerBucketSize).to.be.equal(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect((peerListObj as any).peerListConfig.peerBucketCount).to.be.equal(
				DEFAULT_NEW_BUCKET_COUNT,
			);
			expect((peerListObj as any).peerListConfig.secret).to.be.equal(
				DEFAULT_RANDOM_SECRET,
			);
			expect((peerListObj as any).peerListConfig.peerType).to.be.equal(
				PEER_TYPE.TRIED_PEER,
			);
			expect((peerListObj as any).bucketIdToBucket)
				.to.be.a('map')
				.of.length(DEFAULT_NEW_BUCKET_COUNT);
			for (const peer of (peerListObj as any).bucketIdToBucket) {
				expect(peer)
					.to.be.an('array')
					.of.length(2);
				expect(peer[0])
					.to.be.a('number')
					.within(0, DEFAULT_NEW_BUCKET_COUNT);
				expect(peer[1]).to.be.a('map').empty;
			}
		});
	});

	describe('#peerList', () => {
		before(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
			peerListObj.addPeer(samplePeers[2]);
			peerListObj.peerList as ReadonlyArray<P2PPeerInfo>;
		});

		it('should return tried peers list', () => {
			expect(peerListObj.peerList.length).to.eql(3);
			expect(peerListObj.peerList.map(peer => peer.peerId)).to.include(
				samplePeers[0].peerId,
			);
			expect(peerListObj.peerList.map(peer => peer.peerId)).to.include(
				samplePeers[1].peerId,
			);
			expect(peerListObj.peerList.map(peer => peer.peerId)).to.include(
				samplePeers[2].peerId,
			);
		});
	});

	describe('#getBucket', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
		});

		it('should get a bucket by ipAddress', () => {
			const bucketId = getBucketId({
				bucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
				targetAddress: samplePeers[0].ipAddress,
				sourceAddress: samplePeers[0].ipAddress,
			});

			const { bucket } = peerListObj.calculateBucket(
				samplePeers[0].ipAddress,
				samplePeers[0].ipAddress,
			);

			expect(bucket).to.eql(
				(peerListObj as any).bucketIdToBucket.get(bucketId),
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

		describe('when peer exists in the peerMap', () => {
			it('should get the peer from the incoming peerId', () => {
				expect(peerListObj.getPeer(samplePeers[0].peerId))
					.to.be.an('object')
					.and.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the peerMap', () => {
			it('should return undefined for the given peer that does not exist in peerMap', () => {
				const randomPeer = initPeerInfoList()[2];
				expect(peerListObj.getPeer(randomPeer.peerId)).to.be.undefined;
			});
		});
	});

	describe('#addPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
		});

		it('should add the incoming peer if it does not exist already', () => {
			expect(peerListObj.getPeer(samplePeers[0].peerId)).eql(samplePeers[0]);
		});

		it('should throw error if peer already exists', () => {
			expect(() => peerListObj.addPeer(samplePeers[0]))
				.to.throw(ExistingPeerError, 'Peer already exists')
				.and.have.property('peerInfo', samplePeers[0]);
		});

		describe('when bucket is not full', () => {
			it('should return undefined', () => {
				sandbox.stub(peerListObj, 'makeSpace').returns(undefined);
				const evictedPeer = peerListObj.addPeer(samplePeers[1]);

				expect(evictedPeer).to.be.undefined;
			});
		});

		describe('when bucket is full', () => {
			it('should return evicted peer', () => {
				peerListObj = new BaseList({
					peerBucketSize: 1,
					peerBucketCount: 1,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
				});
				peerListObj.addPeer(samplePeers[0]);
				const evictedPeer = peerListObj.addPeer(samplePeers[1]);

				expect(samplePeers.map(p => p.ipAddress)).to.include(
					(evictedPeer as any).ipAddress,
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
				let updatedPeer = {
					...samplePeers[0],
					height: 0,
					version: '1.2.3',
				};

				const success = peerListObj.updatePeer(updatedPeer);
				expect(success).to.be.true;
				expect(peerListObj.getPeer(samplePeers[0].peerId)).to.be.eql(
					updatedPeer,
				);
			});
		});

		describe('when trying to update a peer that does not exist', () => {
			it('should return false when the peer does not exist', () => {
				let updatedPeer = {
					...samplePeers[2],
					height: 0,
					version: '1.2.3',
				};

				const success = peerListObj.updatePeer(updatedPeer);
				expect(success).to.be.false;
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
			expect(peerListObj.getPeer(samplePeers[0].peerId)).to.be.undefined;
		});
	});

	describe('#makeSpace', () => {
		let bucket: any;
		let calculateBucketStub: any;
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList({
				peerBucketSize: 2,
				peerBucketCount: 1,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
			});
			peerListObj.addPeer(samplePeers[0]);
			bucket = new Map<string, P2PEnhancedPeerInfo>();
			bucket.set(samplePeers[0].peerId, samplePeers[0]);
			calculateBucketStub = sandbox.stub(peerListObj, 'calculateBucket');
		});

		describe('when bucket is full', () => {
			it('should evict one peer randomly', () => {
				calculateBucketStub.returns({ bucketId: 0, bucket });
				// peerListObj.addPeer(samplePeers[1]);
				const evictedPeer = peerListObj.makeSpace(bucket);

				expect(samplePeers).to.include(evictedPeer as any);
			});
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer', () => {
				const bucket = new Map<string, P2PEnhancedPeerInfo>();
				calculateBucketStub.returns({ bucketId: 1234, bucket });
				const evictedPeer = peerListObj.makeSpace(bucket);

				expect(evictedPeer).to.be.undefined;
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
				expect(success1).to.be.true;
				const success2 = peerListObj.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.false;
			});
		});
	});
});
