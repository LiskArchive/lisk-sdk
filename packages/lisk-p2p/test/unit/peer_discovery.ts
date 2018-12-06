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
import { PeerConfig, Peer } from '../../src/peer';
import { initializePeerList } from '../utils/peers';
import * as discoverPeers from '../../src/peer_discovery';

describe('peer discovery', () => {
	describe('#discoverPeer', () => {
		const peerOption: PeerConfig = {
			ipAddress: '12.13.12.12',
			wsPort: 5001,
			height: 545776,
			id: '12.13.12.12:5001',
		};
		const peerOptionDuplicate: PeerConfig = {
			ipAddress: '12.13.12.12',
			wsPort: 5001,
			height: 545981,
			id: '12.13.12.12:5001',
		};
		// TODO need to cover all the test
		const newPeer = new Peer(peerOption);
		const peerDuplicate = new Peer(peerOptionDuplicate);
		const seedNodes = [...initializePeerList(), newPeer, peerDuplicate];

		const blacklist = [seedNodes[4]];

		describe('return an array with all the peers of seed nodes', () => {
			let discoveredPeers: ReadonlyArray<Peer>;

			beforeEach(async () => {
				discoveredPeers = await discoverPeers.discoverPeers(
					seedNodes,
					blacklist,
				);
			});

			it('should return an array', () => {
				return expect(discoveredPeers).to.be.an('array');
			});

			it('should return an object with an inbound unique list of peers', () => {
				return expect(discoveredPeers)
					.to.be.an('array')
					.of.length(0);
			});
		});
	});
});
