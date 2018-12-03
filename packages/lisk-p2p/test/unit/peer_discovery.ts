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
import { discoverPeers } from '../../src/peer_discovery';

describe('peer discovery', () => {
	describe('#discoverPeer', () => {
		const peers = initializePeerList();
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

		const newPeer = new Peer(peerOption);
		const peerDuplicate = new Peer(peerOptionDuplicate);

		const peerList = new Map<string, ReadonlyArray<Peer>>();
		peerList.set(peers[0].id, peers);
		peerList.set(peers[1].id, [newPeer, peerDuplicate]);

		describe('return an object with properties', () => {
			it('should return an object', () => {
				return expect(discoverPeers(peerList)).to.be.an('object');
			});

			it('should return an object with inbound property', () => {
				return expect(discoverPeers(peerList))
					.to.be.an('object')
					.to.have.property('inbound');
			});

			it('should return an object with outbound property', () => {
				return expect(discoverPeers(peerList))
					.to.be.an('object')
					.to.have.property('outbound');
			});
		});

		describe('return an object with inbound and outboud list of peers', () => {
			const unqiueList = [...peers, newPeer];

			it('should return an object with an inbound unique list of peers', () => {
				return expect(discoverPeers(peerList))
					.to.be.an('object')
					.to.have.property('inbound')
					.to.be.an('array')
					.of.length(6)
					.to.be.eql(unqiueList);
			});

			it('should return an object with an outbound unique list of peers', () => {
				return expect(discoverPeers(peerList))
					.to.be.an('object')
					.to.have.property('outbound')
					.to.be.an('array')
					.of.length(6)
					.to.be.eql(unqiueList);
			});
		});
	});
});
