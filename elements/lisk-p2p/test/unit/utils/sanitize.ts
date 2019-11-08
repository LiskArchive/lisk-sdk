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
import { sanitizeIncomingPeerInfo } from '../../../src/utils';
import { initPeerInfoList } from 'utils/peers';

describe('utils/sanitize', () => {
	describe('#sanitizeIncomingPeerInfo', () => {
		it('should return the peerInfo with ipAddress and convert it to ipAddress', async () => {
			const samplePeers = initPeerInfoList();
			const { ipAddress, wsPort, sharedState } = samplePeers[0];
			const protocolPeerInfo = {
				ipAddress,
				wsPort,
				...sharedState,
			};

			expect(sanitizeIncomingPeerInfo(protocolPeerInfo)).eql(samplePeers[0]);
		});
	});

	describe('#sanitizeOutgoingPeerInfo', () => {
		it('should sanitize peer info');
	});

	describe('#sanitizePeerLists', () => {
		it('should return an object with several peer lists');
	});
});
