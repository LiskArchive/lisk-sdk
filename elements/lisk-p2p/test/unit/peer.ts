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

import { Peer } from '../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../src/p2p_types';

describe('peer', () => {
	const defaultPeerInfo: P2PDiscoveredPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: true,
		version: '1.1.1',
	};

	const defaultPeer = new Peer(defaultPeerInfo);

	describe('#constructor', () => {
		it('should be an object', () => {
			return expect(defaultPeer).to.be.an('object');
		});

		it('should be an instance of P2P blockchain', () => {
			return expect(defaultPeer)
				.to.be.an('object')
				.and.be.instanceof(Peer);
		});
	});

	describe('#instanceProperties', () => {
		it('should get height property', () => {
			return expect(defaultPeer.height)
				.to.be.a('number')
				.and.be.eql(545776);
		});

		it('should get ip property', () => {
			return expect(defaultPeer.ipAddress)
				.to.be.a('string')
				.and.be.eql('12.12.12.12');
		});

		it('should get wsPort property', () => {
			return expect(defaultPeer.wsPort)
				.to.be.a('number')
				.and.be.eql(5001);
		});

		it('should get inboundSocket property', () => {
			return expect(defaultPeer.inboundSocket).to.be.undefined;
		});
	});
});
