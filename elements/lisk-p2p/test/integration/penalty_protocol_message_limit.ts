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
import { P2P, events, constants } from '../../src/index';
import {
	createNetwork,
	destroyNetwork,
	NETWORK_CREATION_WAIT_TIME,
	SEED_PEER_IP,
} from '../utils/network_setup';
import { wait } from '../utils/helpers';
import { constructPeerId } from '../../src/utils';

describe('P2P protocol message limit', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	let bannedPeer = '';

	beforeEach(async () => {
		const customConfig = (index: number) => ({
			maxOutboundConnections: index % 2 === 1 ? 3 : 20,
			fallbackSeedPeerDiscoveryInterval: index === 2 ? 100 : 10000,
			rateCalculationInterval: 1000,
			wsMaxMessageRatePenalty: constants.DEFAULT_WS_MAX_MESSAGE_RATE,
			populatorInterval: index === 2 ? 100 : 10000,
		});

		p2pNodeList = await createNetwork({
			networkDiscoveryWaitTime: 0,
			networkSize: 3,
			customConfig,
		});

		for (const p2p of p2pNodeList) {
			// eslint-disable-next-line no-loop-func
			p2p.on(events.EVENT_BAN_PEER, peerId => {
				bannedPeer = peerId;
			});
		}

		await Promise.all(p2pNodeList.map(async p2p => p2p.start()));

		await wait(NETWORK_CREATION_WAIT_TIME);
	});

	afterEach(async () => {
		await destroyNetwork(p2pNodeList);
	});

	it('should apply penalty for limit exceed', async () => {
		// Arrange & Act
		await wait(100);

		// Assert
		expect(bannedPeer).toBe(constructPeerId(SEED_PEER_IP, p2pNodeList[2].config.port));
	});
});
