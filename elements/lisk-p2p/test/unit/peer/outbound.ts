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
import { OutboundPeer } from '../../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';

describe('peer/outbound', () => {
	const DEFAULT_RANDOM_SECRET = 123;
	const defaultPeerInfo: P2PDiscoveredPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: true,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	const defaultPeer = new OutboundPeer(defaultPeerInfo, {
		rateCalculationInterval: 1000,
		wsMaxMessageRate: 1000,
		wsMaxMessageRatePenalty: 10,
		secret: DEFAULT_RANDOM_SECRET,
		maxPeerInfoSize: 10000,
		maxPeerDiscoveryResponseLength: 1000,
	});

	describe('#constructor', () => {
		it('should be an object', () => {
			return expect(defaultPeer).to.be.an('object');
		});

		it('should be an instance of P2P blockchain', () => {
			return expect(defaultPeer)
				.to.be.an('object')
				.and.be.instanceof(OutboundPeer);
		});
	});

	describe('#socket', () => {
		it('should set socket');
	});

	describe('#connect', () => {
		it('should create outbound socket if it does not exist');
		it('should connect');
	});

	describe('#disconnect', () => {
		it('should disconnect');
		it('should unbind handlers from oubound socket if it exist');
	});

	describe('#send', () => {
		it('should create outbound socket if it does not exist');
		it('should send packet');
	});

	describe('#request', () => {
		it('should create outbound socket if it does not exist');
		it('should request packet');
	});
});
