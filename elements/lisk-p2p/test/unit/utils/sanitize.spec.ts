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
import { sanitizeIncomingPeerInfo, sanitizeInitialPeerInfo } from '../../../src/utils';
import { initPeerInfoList } from '../../utils/peers';

describe('utils/sanitize', () => {
	describe('#sanitizeIncomingPeerInfo', () => {
		describe('when rawPeerInfo is valid', () => {
			it('should return the peerInfo with peerId', () => {
				const samplePeers = initPeerInfoList();
				const { ipAddress, port, sharedState, peerId } = samplePeers[0];
				const samplePeerWithoutInternalState = {
					ipAddress,
					port,
					sharedState,
					peerId,
				};
				const protocolPeerInfo = {
					ipAddress,
					port,
					...sharedState,
				};

				expect(sanitizeIncomingPeerInfo(protocolPeerInfo)).toEqual(samplePeerWithoutInternalState);
			});
		});
	});

	describe('#sanitizeInitialPeerInfo', () => {
		it('should return only sanitized fields', () => {
			const samplePeers = initPeerInfoList();
			const { peerId, ipAddress, port } = samplePeers[0];

			const protocolPeerInfo = {
				...samplePeers[0],
			};

			expect(sanitizeInitialPeerInfo(protocolPeerInfo)).toEqual({
				peerId,
				ipAddress,
				port,
			});
		});

		it('should remove', () => {
			const samplePeers = initPeerInfoList();
			const { ipAddress, port, sharedState, peerId } = samplePeers[0];
			const samplePeerWithoutInternalState = {
				ipAddress,
				port,
				sharedState,
				peerId,
			};
			const protocolPeerInfo = {
				ipAddress,
				port,
				...sharedState,
			};

			expect(sanitizeIncomingPeerInfo(protocolPeerInfo)).toEqual(samplePeerWithoutInternalState);
		});
	});

	describe('#sanitizePeerLists', () => {
		it.todo('should return an object with several peer lists');
	});
});
