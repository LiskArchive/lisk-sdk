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
} from '../../../src/constants';

describe('Tried Peers List', () => {
	let triedPeerConfig: TriedListConfig;

	describe('#constructor', () => {
		let triedPeersObj: TriedList;

		beforeEach(() => {
			triedPeerConfig = {
				peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
				peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
				maxReconnectTries: 3,
			};
			triedPeersObj = new TriedList(triedPeerConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect(triedPeersObj.triedPeerConfig).to.be.eql(triedPeerConfig);
			expect(triedPeersObj.triedPeerConfig.peerBucketSize).to.be.equal(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect(triedPeersObj.triedPeerConfig.peerBucketCount).to.be.equal(
				DEFAULT_NEW_BUCKET_COUNT,
			);
		});
	});

	describe('#initPeerList', () => {
		it('should get tried peer config');
	});

	describe('#initPeerInfo', () => {
		it('should init peer info');
	});

	describe('#triedPeerConfig', () => {
		it('should get tried peer config');
	});

	describe('#failedConnectionAction', () => {
		let triedPeersObj: TriedList;
		const samplePeers = initPeerInfoList();

		describe('when maxReconnectTries is 1', () => {
			beforeEach(() => {
				triedPeerConfig = {
					peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
					peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
					secret: DEFAULT_RANDOM_SECRET,
					peerType: PEER_TYPE.TRIED_PEER,
					maxReconnectTries: 1,
				};
				triedPeersObj = new TriedList(triedPeerConfig);
				triedPeersObj.makeSpace(samplePeers[0].ipAddress);
				triedPeersObj.addPeer(samplePeers[0]);
			});

			it('should remove the peer from the triedPeerList', () => {
				const success = triedPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success).to.be.true;
				expect(triedPeersObj.getPeer(samplePeers[0])).to.be.undefined;
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
				triedPeersObj = new TriedList(triedPeerConfig);
				triedPeersObj.makeSpace(samplePeers[0].ipAddress);
				triedPeersObj.addPeer(samplePeers[0]);
			});

			it('should not remove the peer after the first call and remove it after second failed connection', () => {
				const success1 = triedPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success1).to.be.false;
				expect(triedPeersObj.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);

				const success2 = triedPeersObj.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.true;
				expect(triedPeersObj.getPeer(samplePeers[0])).to.be.undefined;
			});
		});
	});
});
