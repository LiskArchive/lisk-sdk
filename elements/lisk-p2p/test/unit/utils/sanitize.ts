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
import {
	sanitizeIncomingPeerInfo,
	sanitizeOutgoingPeerInfo,
} from '../../../src/utils';
import { initializePeerInfoList } from 'utils/peers';

describe('utils/sanitize', () => {
	describe('#sanitizeIncomingPeerInfo', () => {
		it('should return the peerInfo with ip and convert it to ipAddress', async () => {
			const samplePeers = initializePeerInfoList();
			const { ipAddress, ...restOfPeerInfo } = samplePeers[0];
			const protocolPeerInfo = {
				ip: ipAddress,
				...restOfPeerInfo,
			};

			expect(sanitizeIncomingPeerInfo(protocolPeerInfo)).eql(samplePeers[0]);
		});
	});

	describe('#sanitizeOutgoingPeerInfo', () => {
		it('should return the peerInfo with ip and convert it to ipAddress', async () => {
			const samplePeers = initializePeerInfoList();
			const { ipAddress, ...restOfPeerInfo } = samplePeers[0];
			const protocolPeerInfo = {
				ip: ipAddress,
				...restOfPeerInfo,
			};

			expect(sanitizeOutgoingPeerInfo(samplePeers[0])).eql(protocolPeerInfo);
		});
	});
});
