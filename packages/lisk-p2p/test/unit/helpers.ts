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
import { instantiatePeerFromResponse } from '../../src/helpers';
import { Peer } from '../../src/peer';

describe('helpers', () => {
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
				os: 778,
				height: '23232',
				version: {},
			};

			it('should return peer object and instance of Peer', () => {
				return expect(instantiatePeerFromResponse(peer))
					.to.be.an('object')
					.and.instanceOf(Peer);
			});

			it('should return peer object and instance of Peer ignoring os and version value', () => {
				return expect(instantiatePeerFromResponse(peerWithOsVersion))
					.to.be.an('object')
					.and.instanceOf(Peer);
			});
		});

		describe('for invalid peer response object', () => {
			const peerInvalid: unknown = {
				ip: '12.23.54.uhig3',
				wsPort: '53937888',
				os: 'darwin',
				height: '23232',
			};

			it('should return false', () => {
				return expect(instantiatePeerFromResponse(peerInvalid)).to.be.false;
			});
		});

		describe('for undefined peer response object', () => {
			it('should return false', () => {
				return expect(instantiatePeerFromResponse(undefined)).to.be.false;
			});
		});
	});
});
