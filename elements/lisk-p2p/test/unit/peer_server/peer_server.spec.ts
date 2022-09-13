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

import { PeerServer } from '../../../src/peer_server';
import { P2PNodeInfo } from '../../../src/types';
import { PeerBook, PeerBookConfig } from '../../../src/peer_book';
import { validatePeerCompatibility } from '../../../src/utils';
import {
	DEFAULT_RANDOM_SECRET,
	DEFAULT_WS_MAX_PAYLOAD,
	DEFAULT_MAX_PEER_INFO_SIZE,
} from '../../../src/constants';

describe('peerServer', () => {
	const nodeInfo: P2PNodeInfo = {
		chainID: Buffer.from('10000000', 'hex'),
		networkVersion: '1.1',
		nonce: 'nonce',
		advertiseAddress: true,
		options: {},
	};

	const peerBookConfig: PeerBookConfig = {
		sanitizedPeerLists: {
			blacklistedIPs: [],
			seedPeers: [],
			fixedPeers: [],
			whitelisted: [],
			previousPeers: [],
		},
		secret: DEFAULT_RANDOM_SECRET,
	};

	const peerServerConfig = {
		port: 5000,
		nodeInfo,
		hostIp: '0.0.0.0',
		secret: DEFAULT_RANDOM_SECRET,
		peerBook: new PeerBook(peerBookConfig),
		maxPayload: DEFAULT_WS_MAX_PAYLOAD,
		maxPeerInfoSize: DEFAULT_MAX_PEER_INFO_SIZE,
		peerHandshakeCheck: validatePeerCompatibility,
	};

	const peerServer = new PeerServer(peerServerConfig);

	describe('#constructor', () => {
		it('should be an object', () => {
			return expect(peerServer).toEqual(expect.any(Object));
		});

		it('should be an instance of P2P', () => {
			return expect(peerServer).toBeInstanceOf(PeerServer);
		});
	});
});
