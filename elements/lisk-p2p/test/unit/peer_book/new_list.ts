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
import { initPeerInfoListWithSuffix } from '../../utils/peers';
import { PEER_TYPE } from '../../../src/utils';
import {
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_EVICTION_THRESHOLD_TIME,
} from '../../../src/constants';

describe('New Peers List', () => {
	let newPeerConfig: NewListConfig;
	let newPeersObj: NewList;

	describe('#constructor', () => {
		beforeEach(() => {
			newPeerConfig = {
				peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
				peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: DEFAULT_EVICTION_THRESHOLD_TIME,
			};
			newPeersObj = new NewList(newPeerConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect(newPeersObj.newPeerConfig).to.be.eql(newPeerConfig);
			expect(newPeersObj.newPeerConfig.peerBucketSize).to.be.equal(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect(newPeersObj.newPeerConfig.peerBucketCount).to.be.equal(
				DEFAULT_NEW_BUCKET_COUNT,
			);
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
				it('should just evict one old peers');

				describe('when there is a large sample', () => {
					let newPeersList: NewList;
					let clock: sinon.SinonFakeTimers;

					beforeEach(() => {
						clock = sandbox.useFakeTimers();
						const newPeerConfig = {
							peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
							peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
							secret: DEFAULT_RANDOM_SECRET,
							peerType: PEER_TYPE.NEW_PEER,
							evictionThresholdTime: 600000,
						};
						const samplePeersA = initPeerInfoListWithSuffix(
							'1.222.123',
							DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT * 2,
						);
						const samplePeersB = initPeerInfoListWithSuffix(
							'234.11.34',
							DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT * 2,
						);

						newPeersList = new NewList(newPeerConfig);

						samplePeersA.forEach(peerInfo => {
							clock.tick(2);
							newPeersList.makeSpace(peerInfo.ipAddress);
							newPeersList.addPeer(peerInfo);
						});

						clock.tick(600000);

						samplePeersB.forEach(peerInfo => {
							clock.tick(2);
							newPeersList.makeSpace(peerInfo.ipAddress);
							newPeersList.addPeer(peerInfo);
						});
					});

					it(`should not allow newPeer list to grow beyond ${DEFAULT_NEW_BUCKET_SIZE *
						DEFAULT_NEW_BUCKET_COUNT} peers`, () => {
						expect(newPeersList.peersList.length).to.be.lte(
							DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT,
						);
					});
				});
			});
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer');
		});
	});
});
