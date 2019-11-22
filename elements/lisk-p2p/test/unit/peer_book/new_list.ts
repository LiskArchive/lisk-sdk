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
import { NewList, NewListConfig } from '../../../src/peer_book/new_list';
import {
	initPeerInfoListWithSuffix,
	initPeerInfoList,
} from '../../utils/peers';
import { PEER_TYPE } from '../../../src/utils';
import {
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_EVICTION_THRESHOLD_TIME,
} from '../../../src/constants';
import { P2PPeerInfo } from '../../../src';

describe('New Peers List', () => {
	let newPeerConfig: NewListConfig;
	let newPeersList: NewList;

	describe('#constructor', () => {
		beforeEach(() => {
			newPeerConfig = {
				peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
				peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: DEFAULT_EVICTION_THRESHOLD_TIME,
			};
			newPeersList = new NewList(newPeerConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect(newPeersList.newPeerConfig).to.be.eql(newPeerConfig);
			expect(newPeersList.newPeerConfig.peerBucketSize).to.be.equal(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect(newPeersList.newPeerConfig.peerBucketCount).to.be.equal(
				DEFAULT_NEW_BUCKET_COUNT,
			);
		});
	});

	describe('#newPeerConfig', () => {
		beforeEach(() => {
			newPeerConfig = {
				peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
				peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: DEFAULT_EVICTION_THRESHOLD_TIME,
			};
			newPeersList = new NewList(newPeerConfig);
		});

		it('should get new peer config', () => {
			expect(newPeersList.newPeerConfig).to.eql({
				...(newPeersList as any).peerListConfig,
				evictionThresholdTime: DEFAULT_EVICTION_THRESHOLD_TIME,
			});
		});
	});

	describe('#makeSpace', () => {
		let samplePeers: ReadonlyArray<P2PPeerInfo>;
		let clock: sinon.SinonFakeTimers;

		beforeEach(() => {
			clock = sandbox.useFakeTimers();
			samplePeers = initPeerInfoList();
			newPeersList = new NewList({
				peerBucketSize: 3,
				peerBucketCount: 1,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
			});
			newPeersList.addPeer(samplePeers[0]);
		});

		it('should call get bucket', () => {
			sandbox.stub(newPeersList, 'calculateBucket');
			newPeersList.makeSpace(samplePeers[0]);

			expect(newPeersList.calculateBucket).to.be.calledOnceWithExactly(
				samplePeers[0].ipAddress,
			);
		});

		describe('when bucket is full', () => {
			describe('when bucket contains old peers', () => {
				it('should evict just one of them', () => {
					clock.tick(DEFAULT_EVICTION_THRESHOLD_TIME + 1);
					newPeersList.addPeer(samplePeers[1]);
					newPeersList.addPeer(samplePeers[2]);
					const evictedPeer = newPeersList.makeSpace(samplePeers[3]);

					expect((evictedPeer as any).peerInfo).to.be.eql(samplePeers[0]);
				});
			});

			describe('when bucket does not contain old peers', () => {
				it('should evict one peer randomly', () => {
					newPeersList.addPeer(samplePeers[1]);
					newPeersList.addPeer(samplePeers[2]);
					const evictedPeer = newPeersList.makeSpace(samplePeers[3]);

					expect(samplePeers).to.include((evictedPeer as any).peerInfo);
				});
			});
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer', () => {
				const evictedPeer = newPeersList.makeSpace(samplePeers[0]);

				expect(evictedPeer).to.be.undefined;
			});
		});
	});

	describe('when there is a large sample of peers', () => {
		let clock: sinon.SinonFakeTimers;
		const samplePeersA = initPeerInfoListWithSuffix(
			'1.222.123',
			DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT * 2,
		);
		const samplePeersB = initPeerInfoListWithSuffix(
			'234.11.34',
			DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT * 2,
		);

		beforeEach(() => {
			clock = sandbox.useFakeTimers();
			newPeerConfig = {
				peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
				peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: 600000,
			};

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

		it(`should not allow newPeer list to grow beyond ${DEFAULT_NEW_BUCKET_SIZE *
			DEFAULT_NEW_BUCKET_COUNT} peers`, () => {
			expect(newPeersList.peerList.length).to.be.lte(
				DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT,
			);
		});
	});
});
