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
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from 'utils/network_setup';

describe('Peer discovery threshold', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const MINIMUM_PEER_DISCOVERY_THRESHOLD = 1;
	const MAX_PEER_DISCOVERY_RESPONSE_LENGTH = 3;

	before(async () => {
		sandbox.restore();
	});

	describe(`When minimum peer discovery threshold is set to ${MINIMUM_PEER_DISCOVERY_THRESHOLD}`, () => {
		beforeEach(async () => {
			const customConfig = () => ({
				minimumPeerDiscoveryThreshold: MINIMUM_PEER_DISCOVERY_THRESHOLD,
			});

			p2pNodeList = await createNetwork({ customConfig });
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should return list of peers with at most the minimum discovery threshold', async () => {
			const firstP2PNode = p2pNodeList[0];
			const newPeers = firstP2PNode['_peerBook'].newPeers;
			expect(newPeers.length).to.be.at.most(MINIMUM_PEER_DISCOVERY_THRESHOLD);
		});
	});

	describe(`When maximum peer discovery response size is set to ${MAX_PEER_DISCOVERY_RESPONSE_LENGTH}`, () => {
		beforeEach(async () => {
			const customConfig = () => ({
				minimumPeerDiscoveryThreshold: MINIMUM_PEER_DISCOVERY_THRESHOLD,
				maxPeerDiscoveryResponseLength: MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
			});

			p2pNodeList = await createNetwork({ customConfig });
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
			await wait(100);
		});

		it('should return list of peers with less than maximum discovery response size', async () => {
			const firstP2PNode = p2pNodeList[0];
			const newPeers = firstP2PNode['_peerBook'].newPeers;
			expect(newPeers.length).to.be.lessThan(
				MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
			);
		});
	});
});
