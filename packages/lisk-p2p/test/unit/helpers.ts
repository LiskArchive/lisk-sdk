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
import { checkIncomingPeerValues } from '../../src/helpers';

describe('helpers', () => {
	describe('#checkIncomingPeerValues', () => {
		const peer = {
			ip: '12.12.12.12',
			wsPort: '4001',
			height: '272788',
		};

		const peerWithMissingValue = {
			wsPort: 4001,
			height: 272788,
		};

		const peerWithIncorrectIp = {
			ip: '12.12.hh12.12',
			wsPort: 4001,
			height: 272788,
		};

		const peerWithIncorrectPort = {
			ip: '12.12.12.12',
			wsPort: '400f1',
			height: 272788,
		};

		const peerWithIncorrectHeight = {
			ip: '12.12.12.12',
			wsPort: '4001',
			height: 'j272788',
		};

		describe('correct peer values', () => {
			it('should return true', () => {
				return expect(checkIncomingPeerValues(peer)).to.be.true;
			});
		});

		describe('peer with missing values', () => {
			it('should return false', () => {
				return expect(checkIncomingPeerValues(peerWithMissingValue)).to.be
					.false;
			});
		});

		describe('peer with incorrect Ip', () => {
			it('should return false', () => {
				return expect(checkIncomingPeerValues(peerWithIncorrectIp)).to.be.false;
			});
		});

		describe('peer with incorrect port', () => {
			it('should return false', () => {
				return expect(checkIncomingPeerValues(peerWithIncorrectPort)).to.be
					.false;
			});
		});

		describe('peer with incorrect height', () => {
			it('should return false', () => {
				expect(checkIncomingPeerValues(peerWithIncorrectHeight)).to.be.false;
			});
		});
	});
});
