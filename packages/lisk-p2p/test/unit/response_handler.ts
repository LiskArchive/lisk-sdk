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
import { PeerConfig } from '../../src/peer';
import {
	validatePeerAddress,
	instantiatePeerFromResponse,
	processPeerListFromResponse,
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

			const peerWithInvalidHeightValue: unknown = {
				ip: '12.23.54.3',
				wsPort: '5393',
				os: '778',
				height: '2323wqdqd2',
				version: '3.4.5-alpha.9',
			};

			const peerWithInvalidOsValue: unknown = {
				ip: '12.23.54.3',
				wsPort: '5393',
				os: '778',
				height: '23232',
				version: '3.4.5-alpha.9',
			};

			it('should return PeerConfig object', () => {
				return expect(instantiatePeerFromResponse(peer))
					.to.be.an('object')
					.include({
						ipAddress: '12.23.54.3',
						wsPort: 5393,
						os: 'darwin',
						height: 23232,
						version: '1.1.2',
					});
			});

			it('should return PeerConfig object with height value set to 0', () => {
				return expect(instantiatePeerFromResponse(peerWithInvalidHeightValue))
					.to.be.an('object')
					.include({
						ipAddress: '12.23.54.3',
						wsPort: 5393,
						os: '',
						height: 0,
						version: '3.4.5-alpha.9',
					});
			});

			it('should return peerConfig and instance of Peer sets blank for invalid value of os', () => {
				return expect(instantiatePeerFromResponse(peerWithInvalidOsValue))
					.to.be.an('object')
					.include({
						ipAddress: '12.23.54.3',
						wsPort: 5393,
						os: '',
						height: 23232,
						version: '3.4.5-alpha.9',
					});
			});
		});

		describe('for invalid peer response object', () => {
			it('throw InvalidPeer error for invalid peer', () => {
				const peerInvalid: unknown = null;

				return expect(
					instantiatePeerFromResponse.bind(null, peerInvalid),
				).to.throw('Invalid peer object');
			});

			it('throw InvalidPeer error for invalid peer ip or port', () => {
				const peerInvalid: unknown = {
					ip: '12.23.54.uhig3',
					wsPort: '53937888',
					os: 'darwin',
					height: '23232',
				};

				return expect(
					instantiatePeerFromResponse.bind(null, peerInvalid),
				).to.throw('Invalid peer ip or port');
			});

			it('throw InvalidPeer error for invalid peer version', () => {
				const peerInvalid: unknown = {
					ip: '12.23.54.23',
					wsPort: '5390',
					os: 'darwin',
					height: '23232',
					version: '1222.22',
				};

				return expect(
					instantiatePeerFromResponse.bind(null, peerInvalid),
				).to.throw('Invalid peer version');
			});
		});
	});

	describe('#validatePeerAddress', () => {
		it('should return true for correct IPv4', () => {
			const peer = {
				ip: '12.12.12.12',
				wsPort: '4001',
			};

			return expect(validatePeerAddress(peer.ip, peer.wsPort)).to.be.true;
		});

		it('should return true for correct IPv6', () => {
			const peer = {
				ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
				wsPort: '4001',
			};

			return expect(validatePeerAddress(peer.ip, peer.wsPort)).to.be.true;
		});

		it('should return false for incorrect ip', () => {
			const peerWithIncorrectIp = {
				ip: '12.12.hh12.12',
				wsPort: '4001',
			};

			return expect(
				validatePeerAddress(peerWithIncorrectIp.ip, peerWithIncorrectIp.wsPort),
			).to.be.false;
		});

		it('should return false for incorrect port', () => {
			const peerWithIncorrectPort = {
				ip: '12.12.12.12',
				wsPort: '400f1',
			};

			return expect(
				validatePeerAddress(
					peerWithIncorrectPort.ip,
					peerWithIncorrectPort.wsPort,
				),
			).to.be.false;
		});
	});

	describe('#processPeerListFromResponse', () => {
		let peersRPCHandler: ReadonlyArray<PeerConfig>;
		let response: unknown;

		beforeEach(async () => {
			response = { peers: peersFromResponse };
			peersRPCHandler = processPeerListFromResponse(response);
		});

		it('should return an array of length [3] for a valid response', () => {
			return expect(peersRPCHandler)
				.to.be.an('array')
				.and.of.length(3);
		});

		it('should return an array of instantiated peers for a valid response', () => {
			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql(newlyCreatedPeers);
		});

		it('should return a blank array of instantiated peers for undefined response', () => {
			peersRPCHandler = processPeerListFromResponse(undefined);

			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql([]);
		});

		it('should return a blank array of instantiated peers for string type response', () => {
			peersRPCHandler = processPeerListFromResponse('string value');

			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql([]);
		});

		it('should throw an error for invalid version', () => {
			const badResponse = {
				peers: [
					{
						ip: '127.34.00.78',
						wsPort: '5001',
						height: '453453',
						os: 'windows',
						version: '1.2.187hhjbv',
					},
				],
			};

			return expect(
				processPeerListFromResponse.bind(null, badResponse),
			).to.throw('Invalid peer version');
		});
	});
});
