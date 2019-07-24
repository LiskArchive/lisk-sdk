/*
 * Copyright © 2018 Lisk Foundation
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
import { TriedPeers } from '../../../src/peer_directory/triedPeers';

describe.only('triedPeer', () => {
	describe('#constructor', () => {
		const triedPeerConfig = {
			maxReconnectTries: 3,
			triedPeerBucketSize: 32,
			triedPeerListSize: 32,
		};

		const triedPeers = new TriedPeers(triedPeerConfig);

		it('should set properties correctly and create a map of 32 size with 32 buckets each', async () => {
			expect(triedPeers.triedPeerConfig).to.be.eql(triedPeerConfig);
			expect(triedPeers.triedPeerMap.size).to.be.equal(32);

			let bucketSize = Array.of([...triedPeers.triedPeerMap.values()])[0]
				.length;
			expect(bucketSize).to.be.equal(32);
		});
	});
});
