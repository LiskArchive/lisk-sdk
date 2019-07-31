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

import { Peer } from '../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../src/p2p_types';

export const initializePeerInfoList = (): ReadonlyArray<
	P2PDiscoveredPeerInfo
> => {
	const peerOption1: P2PDiscoveredPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: false,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	const peerOption2: P2PDiscoveredPeerInfo = {
		ipAddress: '127.0.0.1',
		wsPort: 5002,
		height: 545981,
		isDiscoveredPeer: false,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	const peerOption3: P2PDiscoveredPeerInfo = {
		ipAddress: '18.28.48.1',
		wsPort: 5008,
		height: 645980,
		isDiscoveredPeer: false,
		version: '1.3.1',
		protocolVersion: '1.1',
	};

	const peerOption4: P2PDiscoveredPeerInfo = {
		ipAddress: '192.28.138.1',
		wsPort: 5006,
		height: 645982,
		isDiscoveredPeer: false,
		version: '1.2.1',
		protocolVersion: '1.1',
	};

	const peerOption5: P2PDiscoveredPeerInfo = {
		ipAddress: '178.21.90.199',
		wsPort: 5001,
		height: 645980,
		isDiscoveredPeer: false,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	return [peerOption1, peerOption2, peerOption3, peerOption4, peerOption5];
};

export const initializePeerList = (): ReadonlyArray<Peer> =>
	initializePeerInfoList().map(
		(peerInfo: P2PDiscoveredPeerInfo) =>
			new Peer(peerInfo, {
				rateCalculationInterval: 1000,
				wsMaxMessageRate: 1000,
				wsMaxMessageRatePenalty: 10,
			}),
	);
