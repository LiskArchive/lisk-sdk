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
import {
	checkPeerAddress,
	instantiatePeerFromResponse,
} from '../../src/response_handler';

describe('response handlers', () => {
	describe('#instantiatePeerFromResponse', () => {
		describe('for valid peer response object', () => {
			const peer: unknown = {
				ip: '12.23.54.3',
				wsPort: '5393',
				os: 'darwin',
				height: '23232',
				version: '1.1.2',
			};

			const peerWithOsVersion: unknown = {
				ip: '12.23.54.3',
				wsPort: '5393',
				os: '778',
				height: '23232',
				version: '',
			};

			it('should return peer object and instance of Peer', () => {
				return expect(instantiatePeerFromResponse(peer))
					.to.be.an('object')
					.has.property('ipAddress');
			});

			it('should return peer object and instance of Peer ignoring os and version value', () => {
				return expect(instantiatePeerFromResponse(peerWithOsVersion))
					.to.be.an('object')
					.has.property('ipAddress');
			});
		});

		describe('for invalid peer response object', () => {
			const peerInvalid: unknown = {
				ip: '12.23.54.uhig3',
				wsPort: '53937888',
				os: 'darwin',
				height: '23232',
			};

			it('should return false for invalid peer values', () => {
				return expect(instantiatePeerFromResponse(peerInvalid))
					.to.be.an('object')
					.and.instanceOf(Error);
			});
		});
	});

	describe('validators', () => {
		describe('#checkPeerAddress', () => {
			it('should return true for IPv4', () => {
				const peer = {
					ip: '12.12.12.12',
					wsPort: '4001',
				};

				return expect(checkPeerAddress(peer)).to.be.true;
			});

			it('should return true for IPv6', () => {
				const peer = {
					ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
					wsPort: '4001',
				};

				return expect(checkPeerAddress(peer)).to.be.true;
			});

			it('should return false for missing required values', () => {
				const peerWithMissingValue = {
					wsPort: '4001',
				};

				return expect(checkPeerAddress(peerWithMissingValue)).to.be.false;
			});

			it('should return false for incorrect ip', () => {
				const peerWithIncorrectIp = {
					ip: '12.12.hh12.12',
					wsPort: '4001',
				};

				return expect(checkPeerAddress(peerWithIncorrectIp)).to.be.false;
			});

			it('should return false for incorrect port', () => {
				const peerWithIncorrectPort = {
					ip: '12.12.12.12',
					wsPort: '400f1',
				};

				return expect(checkPeerAddress(peerWithIncorrectPort)).to.be.false;
			});
		});
	});
});
