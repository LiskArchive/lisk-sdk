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
	sanitizeOutgoingPeerListSize,
	getByteSize,
} from '../../../src/utils';
import { initPeerInfoList } from 'utils/peers';
import {
	DEFAULT_WS_MAX_PAYLOAD,
	DEFAULT_MAX_PEER_INFO_SIZE,
} from '../../../src/constants';

describe('utils/sanitize', () => {
	describe('#sanitizeIncomingPeerInfo', () => {
		it('should return the peerInfo with ip and convert it to ipAddress', async () => {
			const samplePeers = initPeerInfoList();
			const { ipAddress, wsPort, sharedState } = samplePeers[0];
			const protocolPeerInfo = {
				ip: ipAddress,
				ipAddress,
				wsPort,
				...sharedState,
			};

			expect(sanitizeIncomingPeerInfo(protocolPeerInfo)).eql(samplePeers[0]);
		});
	});

	describe('#sanitizeOutgoingPeerInfo', () => {
		it('should return the peerInfo with ip and convert it to ipAddress', async () => {
			const samplePeers = initPeerInfoList();
			const { ipAddress, wsPort, sharedState } = samplePeers[0];
			const protocolPeerInfo = {
				ip: ipAddress,
				ipAddress,
				wsPort,
				...sharedState,
			};

			expect(sanitizeOutgoingPeerInfo(samplePeers[0])).eql(protocolPeerInfo);
		});
	});

	describe('#sanitizeOutgoingPeerListSize', () => {
		const generatePeerList = (length: number, peerInfoSize: number) => {
			const samplePeers = initPeerInfoList();
			const { ipAddress, wsPort } = samplePeers[0];
			const protocolPeerInfo = {
				ip: ipAddress,
				ipAddress,
				wsPort,
				sharedState: {
					data: '1'.repeat(peerInfoSize),
				},
			};

			return [...Array(length)].map(() => protocolPeerInfo);
		};

		describe('when PeerList are fit in payload size', () => {
			it('should return the PeerList', async () => {
				const validPeerList = generatePeerList(1000, 1000);

				expect(
					sanitizeOutgoingPeerListSize(validPeerList, DEFAULT_WS_MAX_PAYLOAD),
				).eql(validPeerList);
			});
		});

		describe('when PeerList are not fit in payload size', () => {
			it('should return the PeerList with valid size', async () => {
				const invvalidPeerList = generatePeerList(
					1000,
					DEFAULT_MAX_PEER_INFO_SIZE,
				);

				const sanitizeOutgoingPeerList = sanitizeOutgoingPeerListSize(
					invvalidPeerList,
					DEFAULT_WS_MAX_PAYLOAD,
				);

				expect(getByteSize(sanitizeOutgoingPeerList)).lt(
					DEFAULT_WS_MAX_PAYLOAD,
				);
			});
		});
	});

	describe('#sanitizePeerLists', () => {
		it('should return an object with several peer lists');
	});
});
