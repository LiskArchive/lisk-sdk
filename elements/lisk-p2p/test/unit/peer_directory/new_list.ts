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
	initPeerInfoList,
	initPeerInfoListWithSuffix,
} from '../../utils/peers';
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

	describe('#newPeerConfig', () => {
		it('should get new peer config');
	});

	describe('#makeSpace', () => {
		describe('when bucket is full', () => {
			describe('when bucket does not contain old peers', () => {
				it('should evict one peer randomly');
			});

			describe('when bucket contains very old peers', () => {
				const newPeerConfig = {
					peerBucketSize: 3,
					peerBucketCount: 1,
					secret: 123456,
					peerType: PEER_TYPE.NEW_PEER,
					evictionThresholdTime: 10000,
				};
				const samplePeers = initPeerInfoList();

				let newPeersList = new NewList(newPeerConfig);
				// Add a custom map to peerMap
				const newPeerMapCustom = new Map();
				// Add a custom Date to a peer that has dateAdded above the evictionThresholdTime
				const peerDate = new Date();
				peerDate.setMilliseconds(peerDate.getMilliseconds() + 11000);
				const oldPeer = { peerInfo: samplePeers[0], dateAdded: peerDate };
				// Now set 2 peer with one peer staying in a bucket for longer than 10 seconds
				newPeerMapCustom.set(
					constructPeerIdFromPeerInfo(samplePeers[0]),
					oldPeer,
				);
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
				// const evictionResult = newPeersList.addPeer(samplePeers[3]);

				it('should just evict one old peers');

				describe.skip('when there is a large sample', () => {
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
						const samplePeersA = initPeerInfoListWithSuffix('1.222.123', 10000);
						const samplePeersB = initPeerInfoListWithSuffix('234.11.34', 10000);

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
						expect(newPeersList.peersList.length).to.be.lte(4096);
					});
				});
			});
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer');
		});
	});
});
