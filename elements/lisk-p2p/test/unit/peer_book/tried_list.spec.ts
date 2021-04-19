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
import { P2PEnhancedPeerInfo } from '../../../src/types';
import { TriedList, TriedListConfig } from '../../../src/peer_book/tried_list';
import { initPeerInfoList } from '../../utils/peers';
import { PEER_TYPE } from '../../../src/utils';
import {
	DEFAULT_RANDOM_SECRET,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_MAX_RECONNECT_TRIES,
} from '../../../src/constants';

describe('Tried Peers List', () => {
	let triedPeerConfig: TriedListConfig;
	let triedPeersList: TriedList;

	describe('#constructor', () => {
		beforeEach(() => {
			triedPeerConfig = {
				bucketSize: DEFAULT_NEW_BUCKET_SIZE,
				numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
				maxReconnectTries: 3,
			};
			triedPeersList = new TriedList(triedPeerConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect(triedPeersList.triedPeerConfig).toEqual(triedPeerConfig);
			expect(triedPeersList.triedPeerConfig.bucketSize).toBe(DEFAULT_NEW_BUCKET_SIZE);
			expect(triedPeersList.triedPeerConfig.numOfBuckets).toBe(DEFAULT_NEW_BUCKET_COUNT);
		});
	});

	describe('#triedPeerConfig', () => {
		beforeEach(() => {
			triedPeerConfig = {
				bucketSize: DEFAULT_NEW_BUCKET_SIZE,
				numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
			};
			triedPeersList = new TriedList(triedPeerConfig);
		});

		it('should get tried peer config', () => {
			expect(triedPeersList.triedPeerConfig).toEqual({
				...(triedPeersList as any).peerListConfig,
				maxReconnectTries: DEFAULT_MAX_RECONNECT_TRIES,
			});
		});
	});

	describe('#failedConnectionAction', () => {
		let bucket: Map<string, P2PEnhancedPeerInfo>;
		const samplePeers = initPeerInfoList();

		describe('when peer cannot be found', () => {
			beforeEach(() => {
				bucket = new Map<string, P2PEnhancedPeerInfo>();
				triedPeerConfig = {
					bucketSize: DEFAULT_NEW_BUCKET_SIZE,
					numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
					maxReconnectTries: 1,
				};
				triedPeersList = new TriedList(triedPeerConfig);
				triedPeersList.makeSpace(bucket);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should return false', () => {
				const success = triedPeersList.failedConnectionAction(samplePeers[1]);
				expect(success).toBe(false);
			});
		});

		describe('when maxReconnectTries is 1', () => {
			beforeEach(() => {
				triedPeerConfig = {
					bucketSize: DEFAULT_NEW_BUCKET_SIZE,
					numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
					maxReconnectTries: 1,
				};
				triedPeersList = new TriedList(triedPeerConfig);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should remove the peer from the triedPeerList', () => {
				const success = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success).toBe(true);
				expect(triedPeersList.getPeer(samplePeers[0].peerId)).toBeUndefined();
			});
		});

		describe('when maxReconnectTries is 2', () => {
			beforeEach(() => {
				triedPeerConfig = {
					bucketSize: DEFAULT_NEW_BUCKET_SIZE,
					numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
					maxReconnectTries: 2,
				};
				triedPeersList = new TriedList(triedPeerConfig);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should not remove the peer after the first call and remove it after second failed connection', () => {
				const success1 = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success1).toBe(false);
				expect(triedPeersList.getPeer(samplePeers[0].peerId)).toEqual(samplePeers[0]);

				const success2 = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success2).toBe(true);
				expect(triedPeersList.getPeer(samplePeers[0].peerId)).toBeUndefined();
			});
		});
	});
});
