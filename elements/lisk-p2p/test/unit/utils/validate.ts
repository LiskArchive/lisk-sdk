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
import {
	validatePeerAddress,
	validatePeerInfo,
	validateRPCRequest,
	validateProtocolMessage,
	validateNodeInfo,
	sanitizeIncomingPeerInfo,
	validatePeerInfoList,
} from '../../../src/utils';
import {
	ProtocolPeerInfo,
	P2PRequestPacket,
	P2PMessagePacket,
	P2PNodeInfo,
} from '../../../src/p2p_types';
import {
	DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
	DEFAULT_MAX_PEER_INFO_SIZE,
	PEER_INFO_LIST_TOO_LONG_REASON,
	INVALID_PEER_INFO_LIST_REASON,
} from '../../../src';
describe('utils/validate', () => {
	describe('#validatePeerInfo', () => {
		describe('for valid peer response object', () => {
			const peer: ProtocolPeerInfo = {
				ipAddress: '12.23.54.3',
				wsPort: 5393,
				os: 'darwin',
				height: 23232,
				version: '1.1.2',
				protocolVersion: '1.1',
				httpPort: 2000,
			};

			const peerWithInvalidHeightValue: unknown = {
				ipAddress: '12.23.54.3',
				wsPort: 5393,
				os: '778',
				height: '2323wqdqd2',
				version: '3.4.5-alpha.9',
				protocolVersion: '1.1',
				httpPort: 2000,
			};

			it('should return P2PPeerInfo object', async () => {
				expect(validatePeerInfo(sanitizeIncomingPeerInfo(peer), 10000))
					.to.be.an('object')
					.eql({
						peerId: '12.23.54.3:5393',
						ipAddress: '12.23.54.3',
						wsPort: 5393,
						sharedState: {
							height: 23232,
							os: 'darwin',
							version: '1.1.2',
							protocolVersion: '1.1',
							httpPort: 2000,
						},
					});
			});

			it('should return P2PPeerInfo object with height value set to 0', async () => {
				expect(
					validatePeerInfo(
						sanitizeIncomingPeerInfo(peerWithInvalidHeightValue),
						10000,
					),
				)
					.to.be.an('object')
					.eql({
						peerId: '12.23.54.3:5393',
						ipAddress: '12.23.54.3',
						wsPort: 5393,
						sharedState: {
							height: 0,
							os: '778',
							version: '3.4.5-alpha.9',
							protocolVersion: '1.1',
							httpPort: 2000,
						},
					});
			});
		});

		describe('for invalid peer response object', () => {
			it('should throw an InvalidPeer error for invalid peer', async () => {
				const peerInvalid: unknown = null;

				expect(
					validatePeerInfo.bind(
						null,
						sanitizeIncomingPeerInfo(peerInvalid),
						10000,
					),
				).to.throw('Invalid peer object');
			});

			it('should throw if PeerInfo is too big', async () => {
				const maximumPeerInfoSizeInBytes = 10;
				const peer: ProtocolPeerInfo = {
					ipAddress: '12.23.54.3',
					wsPort: 5393,
					os: 'darwin',
					height: 23232,
					version: '1.1.2',
					protocolVersion: '1.1',
					httpPort: 2000,
				};

				expect(
					validatePeerInfo.bind(
						null,
						sanitizeIncomingPeerInfo(peer),
						maximumPeerInfoSizeInBytes,
					),
				).to.throw(
					`PeerInfo is larger than the maximum allowed size ${maximumPeerInfoSizeInBytes} bytes`,
				);
			});

			it('should throw InvalidPeer error for invalid peer ipAddress or port', async () => {
				const peerInvalid: unknown = {
					wsPort: 53937888,
					height: '23232',
					discoveredInfo: {
						os: 'darwin',
					},
				};

				expect(
					validatePeerInfo.bind(
						null,
						sanitizeIncomingPeerInfo(peerInvalid),
						10000,
					),
				).to.throw('Invalid peer ipAddress or port');
			});
		});
	});

	describe('#validatePeerInfoList', () => {
		let generatePeerInfoResponse: any = {
			peers: [],
		};
		beforeEach(() => {
			generatePeerInfoResponse = {
				peers: [],
			};

			generatePeerInfoResponse.peers = [...Array(3)].map(() => ({
				ipAddress: '128.127.126.125',
				wsPort: 5000,
			}));
		});

		describe('when PeerInfo list is valid', () => {
			it('should return P2PPeerInfo array', async () => {
				expect(
					validatePeerInfoList(
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					).length,
				).to.be.eql(generatePeerInfoResponse.peers.length);
			});
		});

		describe('when rawBasicPeerInfoList list is falsy', () => {
			it('should throw an Error', async () => {
				generatePeerInfoResponse = undefined;

				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).to.throw(INVALID_PEER_INFO_LIST_REASON);
			});
		});

		describe('when PeerInfo list is not an array', () => {
			it('should throw an Error', async () => {
				generatePeerInfoResponse.peers = 'fizzBuzz';

				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).to.throw(INVALID_PEER_INFO_LIST_REASON);
			});
		});

		describe('when PeerInfo list os too long', () => {
			it('should throw an Error', async () => {
				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						generatePeerInfoResponse.peers.length - 1,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).to.throw(PEER_INFO_LIST_TOO_LONG_REASON);
			});
		});

		describe('when PeerInfo list has falsy PeerInfo', () => {
			it('should return P2PPeerInfo array', async () => {
				generatePeerInfoResponse.peers.push(undefined);

				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).to.throw('Invalid peer object');
			});
		});
	});

	describe('#validateNodeInfo', () => {
		describe('when NodeInfo is larger than maximum allowed size', () => {
			const maximum_size = 10;

			const NodeInfo: P2PNodeInfo = {
				os: '12.23.54.3',
				nethash: '12.23.54.3',
				wsPort: 5393,
				version: '1.1.2',
				protocolVersion: '1.1',
				options: {
					foo: 'bar',
					fizz: 'buzz',
				},
				nonce: 'nonce678',
				advertiseAddress: true,
			};

			it('should throw Invalid NodeInfo maximum allowed size error', async () => {
				expect(validateNodeInfo.bind(null, NodeInfo, maximum_size)).to.throw(
					`Invalid NodeInfo was larger than the maximum allowed ${maximum_size} bytes`,
				);
			});
		});
	});

	describe('#validatePeerAddress', () => {
		it('should return true for correct IPv4', async () => {
			const peer = {
				ipAddress: '12.12.12.12',
				wsPort: 4001,
			};

			expect(validatePeerAddress(peer.ipAddress, peer.wsPort)).to.be.true;
		});

		it('should return true for correct IPv6', async () => {
			const peer = {
				ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
				wsPort: 4001,
			};

			expect(validatePeerAddress(peer.ipAddress, peer.wsPort)).to.be.true;
		});

		it('should return false for incorrect ipAddress', async () => {
			const peerWithIncorrectIp = {
				ipAddress: '12.12.hh12.12',
				wsPort: 4001,
			};

			expect(
				validatePeerAddress(
					peerWithIncorrectIp.ipAddress,
					peerWithIncorrectIp.wsPort,
				),
			).to.be.false;
		});

		it('should return false for incorrect port', async () => {
			const peerWithIncorrectPort = {
				ipAddress: '12.12.12.12',
				wsPort: NaN,
			};

			expect(
				validatePeerAddress(
					peerWithIncorrectPort.ipAddress,
					peerWithIncorrectPort.wsPort,
				),
			).to.be.false;
		});
	});

	describe('#validateRPCRequest', () => {
		const validRPCRequest: unknown = {
			data: {},
			procedure: 'list',
			type: '',
		};
		let validatedRPCRequest: P2PRequestPacket;

		beforeEach(async () => {
			validatedRPCRequest = validateRPCRequest(validRPCRequest);
		});

		it('should throw an error for an invalid procedure value', async () => {
			expect(validateRPCRequest.bind(validateRPCRequest, undefined)).to.throw(
				'Invalid request',
			);
		});

		it('should throw an error for an invalid procedure value', async () => {
			const inValidRequest: unknown = {
				data: {},
				procedure: {},
			};

			expect(
				validateRPCRequest.bind(validateRPCRequest, inValidRequest),
			).to.throw('Request procedure name is not a string');
		});

		it('should pass and return an object', async () => {
			expect(validatedRPCRequest).to.be.an('object');
		});

		it('should return a valid rpc request', async () => {
			expect(validatedRPCRequest)
				.to.be.an('object')
				.has.property('data')
				.to.be.an('object');
			expect(validatedRPCRequest)
				.to.be.an('object')
				.has.property('procedure').to.be.string;

			expect(validatedRPCRequest)
				.to.be.an('object')
				.has.property('type').to.be.string;
		});
	});

	describe('#validateProtocolMessage', () => {
		const validProtocolMessage: unknown = {
			data: {},
			event: 'newPeer',
		};
		let returnedValidatedMessage: P2PMessagePacket;

		beforeEach(async () => {
			returnedValidatedMessage = validateProtocolMessage(validProtocolMessage);
		});

		it('should throw an error for an invalid event value type', async () => {
			expect(
				validateProtocolMessage.bind(validateProtocolMessage, undefined),
			).to.throw('Invalid message');
		});

		it('should throw an error for an invalid event value type', async () => {
			const inValidMessage: unknown = {
				data: {},
				event: 6788,
			};
			expect(
				validateProtocolMessage.bind(validateProtocolMessage, inValidMessage),
			).to.throw('Protocol message is not a string');
		});

		it('should return an object', async () => {
			expect(returnedValidatedMessage).to.be.an('object');
		});

		it('should return a valid protocol message object', async () => {
			expect(returnedValidatedMessage)
				.to.be.an('object')
				.has.property('data');

			expect(returnedValidatedMessage)
				.to.be.an('object')
				.has.property('data').to.be.string;
		});
	});
});
