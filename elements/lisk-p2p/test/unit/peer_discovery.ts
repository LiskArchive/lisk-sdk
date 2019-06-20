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
import { P2PPeerInfo } from '../../src/p2p_types';
import { initializePeerList } from '../utils/peers';
import * as discoverPeersModule from '../../src/peer_discovery';

describe('peer discovery', () => {
	const samplePeers = initializePeerList();
	const seedPeer1 = samplePeers[0];
	const seedPeer2 = samplePeers[1];
	const seedList = [seedPeer1, seedPeer2];

	const validatedPeer1: P2PPeerInfo = {
		ipAddress: '196.34.89.90',
		wsPort: 5393,
		height: 23232,
		isDiscoveredPeer: true,
		version: '1.2.1',
		protocolVersion: '1.1',
	};

	const validatedPeer2: P2PPeerInfo = {
		ipAddress: '128.38.75.9',
		wsPort: 5393,
		height: 23232,
		isDiscoveredPeer: true,
		version: '1.2.1',
		protocolVersion: '1.1',
	};

	const validatedPeer3: P2PPeerInfo = {
		ipAddress: '12.23.11.31',
		wsPort: 5393,
		height: 23232,
		isDiscoveredPeer: true,
		version: '1.3.1',
		protocolVersion: '1.1',
	};

	describe('#discoverPeer', () => {
		const peerList1 = [validatedPeer1, validatedPeer2];
		const peerList2 = [validatedPeer1, validatedPeer3];

		const expectedResult = [validatedPeer1, validatedPeer2];

		describe('return an array with all the peers of input peers', () => {
			let discoveredPeers: ReadonlyArray<P2PPeerInfo>;
			const blacklist = ['12.23.11.31'];
			beforeEach(async () => {
				sandbox.stub(seedPeer1, 'fetchPeers').resolves(peerList1);
				sandbox.stub(seedPeer2, 'fetchPeers').resolves(peerList2);

				discoveredPeers = await discoverPeersModule.discoverPeers(seedList, {
					blacklist,
				});
			});

			it('should return an array for a given seed list', () => {
				return expect(discoveredPeers).to.be.an('array');
			});

			it('should return an array with length of [2]', () => {
				return expect(discoveredPeers)
					.to.be.an('array')
					.of.length(2);
			});

			it('should return an array with discovered peers', () => {
				return expect(discoveredPeers)
					.to.be.an('array')
					.and.eql(expectedResult);
			});

			it('should return an array with discovered peers for blank blacklist', async () => {
				discoveredPeers = await discoverPeersModule.discoverPeers(seedList, {
					blacklist: [],
				});

				const withoutBlacklistResult = [
					validatedPeer1,
					validatedPeer2,
					validatedPeer3,
				];

				return expect(discoveredPeers)
					.to.be.an('array')
					.and.eql(withoutBlacklistResult);
			});
		});
	});
});
