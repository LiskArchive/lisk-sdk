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
				peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
				peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
				maxReconnectTries: 3,
			};
			triedPeersList = new TriedList(triedPeerConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect(triedPeersList.triedPeerConfig).to.be.eql(triedPeerConfig);
			expect(triedPeersList.triedPeerConfig.peerBucketSize).to.be.equal(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect(triedPeersList.triedPeerConfig.peerBucketCount).to.be.equal(
				DEFAULT_NEW_BUCKET_COUNT,
			);
		});
	});

	describe('#triedPeerConfig', () => {
		beforeEach(() => {
			triedPeerConfig = {
				peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
				peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
			};
			triedPeersList = new TriedList(triedPeerConfig);
		});

		it('should get tried peer config', () => {
			expect(triedPeersList.triedPeerConfig).to.eql({
				...(triedPeersList as any).peerListConfig,
				maxReconnectTries: DEFAULT_MAX_RECONNECT_TRIES,
			});
		});
	});

	describe('#failedConnectionAction', () => {
		let triedPeersList: TriedList;
		const samplePeers = initPeerInfoList();

		describe('when peer cannot be found', () => {
			beforeEach(() => {
				triedPeerConfig = {
					peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
					peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
					maxReconnectTries: 1,
				};
				triedPeersList = new TriedList(triedPeerConfig);
				triedPeersList.makeSpace(samplePeers[0]);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should return false', () => {
				const success = triedPeersList.failedConnectionAction(samplePeers[1]);
				expect(success).to.be.false;
			});
		});

		describe('when maxReconnectTries is 1', () => {
			beforeEach(() => {
				triedPeerConfig = {
					peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
					peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
					maxReconnectTries: 1,
				};
				triedPeersList = new TriedList(triedPeerConfig);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should remove the peer from the triedPeerList', () => {
				const success = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success).to.be.true;
				expect(triedPeersList.getPeer(samplePeers[0])).to.be.undefined;
			});
		});

		describe('when maxReconnectTries is 2', () => {
			beforeEach(() => {
				triedPeerConfig = {
					peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
					peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
					maxReconnectTries: 2,
				};
				triedPeersList = new TriedList(triedPeerConfig);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should not remove the peer after the first call and remove it after second failed connection', () => {
				const success1 = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success1).to.be.false;
				expect(triedPeersList.getPeer(samplePeers[0])).to.be.eql(
					samplePeers[0],
				);

				const success2 = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.true;
				expect(triedPeersList.getPeer(samplePeers[0])).to.be.undefined;
			});
		});
	});
});
