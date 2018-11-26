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

import { PeerConfig, Peer } from '../../src';

describe('peer', () => {
	const defaultPeerConfig: PeerConfig = {
		ip: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
	};

	const defaultPeer = new Peer(defaultPeerConfig);
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
		it('should set and gets height property', () => {
			defaultPeer.Height = 100000;
			return expect(defaultPeer.Height)
				.to.be.a('number')
				.and.be.eql(100000);
		});
		it('should set and gets wsPort property', () => {
			defaultPeer.WsPort = 6001;
			return expect(defaultPeer.WsPort)
				.to.be.a('number')
				.and.be.eql(6001);
		});
		it('should get readonly Ip property', () => {
			return expect(defaultPeer.Ip)
				.to.be.a('string')
				.and.be.eql('12.12.12.12');
		});
	});
});
