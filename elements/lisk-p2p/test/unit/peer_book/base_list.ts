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
import { BaseList, CustomPeerInfo } from '../../../src/peer_book/base_list';
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
			expect((peerListObj as any).peerMap)
				.to.be.a('map')
				.of.length(DEFAULT_NEW_BUCKET_COUNT);
			for (const peer of (peerListObj as any).peerMap) {
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
		let triedPeersArray: ReadonlyArray<P2PPeerInfo>;

		before(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
			peerListObj.addPeer(samplePeers[2]);
			triedPeersArray = peerListObj.peerList as ReadonlyArray<P2PPeerInfo>;
		});

		it('should return tried peers list', () => {
			const expectedTriedPeersArray = [
				samplePeers[0],
				samplePeers[1],
				samplePeers[2],
			];
			expect(triedPeersArray).to.have.members(expectedTriedPeersArray);
		});
	});

	describe('#peerListWithSharedState', () => {
		let fetchedPeersArray: ReadonlyArray<P2PPeerInfo>;
		let invalidPeerInfos: Array<P2PPeerInfo>;

		before(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
			invalidPeerInfos = [
				{
					peerId: '204.120.125.16:6001',
					ipAddress: '204.120.125.16',
					wsPort: 6001,
					sharedState: undefined,
				},
				{
					peerId: '204.120.125.15:6000',
					ipAddress: '204.120.125.15',
					wsPort: 6000,
				},
			];

			invalidPeerInfos.forEach(invalidPeer => peerListObj.addPeer(invalidPeer));

			fetchedPeersArray = peerListObj.peerListWithSharedState as ReadonlyArray<
				P2PPeerInfo
			>;
		});

		it('should return peers list with sharedState', () => {
			const expectedFetchedPeersArray = [samplePeers[0], samplePeers[1]];
			expect(fetchedPeersArray).to.not.have.members(invalidPeerInfos);
			expect(fetchedPeersArray).to.have.members(expectedFetchedPeersArray);
		});
	});

	describe('#getBucket', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
		});

		it('should get a bucket by ip address', () => {
			const bucketId = getBucketId({
				bucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
				targetAddress: samplePeers[0].ipAddress,
			});

			expect(peerListObj.getBucket(samplePeers[0].ipAddress)).to.eql(
				(peerListObj as any).peerMap.get(bucketId),
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
				expect(peerListObj.getPeer(samplePeers[0]))
					.to.be.an('object')
					.and.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the peerMap', () => {
			it('should return undefined for the given peer that does not exist in peerMap', () => {
				const randomPeer = initPeerInfoList()[2];
				expect(peerListObj.getPeer(randomPeer)).to.be.undefined;
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
			expect(peerListObj.getPeer(samplePeers[0])).eql(samplePeers[0]);
		});

		it('should throw error if peer already exists', () => {
			expect(() => peerListObj.addPeer(samplePeers[0]))
				.to.throw(ExistingPeerError, 'Peer already exists')
				.and.have.property('peerInfo', samplePeers[0]);
		});

		it('should call makeSpace method with the ip address of the peer to add', () => {
			sandbox.stub(peerListObj, 'makeSpace');
			peerListObj.addPeer(samplePeers[1]);

			expect(peerListObj.makeSpace).to.be.calledOnceWithExactly(
				samplePeers[1].ipAddress,
			);
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
				const customPeer: CustomPeerInfo = {
					peerInfo: samplePeers[2],
					dateAdded: new Date(),
				};
				sandbox.stub(peerListObj, 'makeSpace').returns(customPeer);
				const evictedPeer = peerListObj.addPeer(samplePeers[1]);

				expect(evictedPeer).to.eql(customPeer);
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
				expect(peerListObj.getPeer(samplePeers[0])).to.be.eql(updatedPeer);
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
			expect(peerListObj.getPeer(samplePeers[0])).to.be.undefined;
		});
	});

	describe('#makeSpace', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList({
				peerBucketSize: 2,
				peerBucketCount: 1,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
			});
			peerListObj.addPeer(samplePeers[0]);
		});

		it('should call get bucket', () => {
			sandbox.stub(peerListObj, 'getBucket');
			peerListObj.makeSpace(samplePeers[0].ipAddress);

			expect(peerListObj.getBucket).to.be.calledOnceWithExactly(
				samplePeers[0].ipAddress,
			);
		});

		describe('when bucket is full', () => {
			it('should evict one peer randomly', () => {
				peerListObj.addPeer(samplePeers[1]);
				const evictedPeer = peerListObj.makeSpace(samplePeers[2].ipAddress);

				expect(samplePeers).to.include((evictedPeer as any).peerInfo);
			});
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer', () => {
				const bucket = new Map<string, CustomPeerInfo>();
				sandbox.stub(peerListObj, 'getBucket').returns(bucket);

				const evictedPeer = peerListObj.makeSpace(samplePeers[0].ipAddress);

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
