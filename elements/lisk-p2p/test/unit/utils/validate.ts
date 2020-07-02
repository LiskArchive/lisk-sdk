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
} from '../../../src/types';
import { constants } from '../../../src';

const {
	DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
	DEFAULT_MAX_PEER_INFO_SIZE,
	PEER_INFO_LIST_TOO_LONG_REASON,
	INVALID_PEER_INFO_LIST_REASON,
} = constants;

describe('utils/validate', () => {
	describe('#validatePeerInfo', () => {
		describe('for valid peer response object', () => {
			const peer: ProtocolPeerInfo = {
				ipAddress: '12.23.54.3',
				port: 5393,
			};

			const peerWithInvalidHeightValue: unknown = {
				ipAddress: '12.23.54.3',
				port: 5393,
			};

			it('should return P2PPeerInfo object', () => {
				expect(validatePeerInfo(sanitizeIncomingPeerInfo(peer), 10000)).toEqual(
					{
						peerId: '12.23.54.3:5393',
						ipAddress: '12.23.54.3',
						port: 5393,
						sharedState: {},
					},
				);
			});

			it('should return P2PPeerInfo object with height value set to 0', () => {
				expect(
					validatePeerInfo(
						sanitizeIncomingPeerInfo(peerWithInvalidHeightValue),
						10000,
					),
				).toEqual({
					peerId: '12.23.54.3:5393',
					ipAddress: '12.23.54.3',
					port: 5393,
					sharedState: {},
				});
			});
		});

		describe('for invalid peer response object', () => {
			it('should throw an InvalidPeer error for invalid peer', () => {
				const peerInvalid: unknown = null;

				expect(
					validatePeerInfo.bind(
						null,
						sanitizeIncomingPeerInfo(peerInvalid),
						10000,
					),
				).toThrow('Invalid peer object');
			});

			it('should throw if PeerInfo is too big', () => {
				const maximumPeerInfoSizeInBytes = 10;
				const peer: ProtocolPeerInfo = {
					ipAddress: '12.23.54.3',
					port: 5393,
				};

				expect(
					validatePeerInfo.bind(
						null,
						sanitizeIncomingPeerInfo(peer),
						maximumPeerInfoSizeInBytes,
					),
				).toThrow(
					`PeerInfo is larger than the maximum allowed size ${maximumPeerInfoSizeInBytes} bytes`,
				);
			});

			it('should throw InvalidPeer error for invalid peer ipAddress or port', () => {
				const peerInvalid: unknown = {
					port: 53937888,
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
				).toThrow('Invalid peer ipAddress or port');
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
				port: 5000,
			}));
		});

		describe('when PeerInfo list is valid', () => {
			it('should return P2PPeerInfo array', () => {
				expect(
					validatePeerInfoList(
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toHaveLength(generatePeerInfoResponse.peers.length);
			});
		});

		describe('when rawBasicPeerInfoList list is falsy', () => {
			it('should throw an Error', () => {
				generatePeerInfoResponse = undefined;

				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toThrow(INVALID_PEER_INFO_LIST_REASON);
			});
		});

		describe('when PeerInfo list is not an array', () => {
			it('should throw an Error', () => {
				generatePeerInfoResponse.peers = 'fizzBuzz';

				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toThrow(INVALID_PEER_INFO_LIST_REASON);
			});
		});

		describe('when PeerInfo list os too long', () => {
			it('should throw an Error', () => {
				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						generatePeerInfoResponse.peers.length - 1,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toThrow(PEER_INFO_LIST_TOO_LONG_REASON);
			});
		});

		describe('when PeerInfo list has falsy PeerInfo', () => {
			it('should return P2PPeerInfo array', () => {
				generatePeerInfoResponse.peers.push(undefined);

				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toThrow('Invalid peer object');
			});
		});
	});

	describe('#validateNodeInfo', () => {
		describe('when NodeInfo is larger than maximum allowed size', () => {
			const maximumSize = 10;

			const NodeInfo: P2PNodeInfo = {
				os: '12.23.54.3',
				networkId: '12.23.54.3',
				port: 5393,
				version: '1.1.2',
				networkVersion: '1.1',
				options: {
					foo: 'bar',
					fizz: 'buzz',
				},
				nonce: 'nonce678',
				advertiseAddress: true,
			};

			it('should throw Invalid NodeInfo maximum allowed size error', () => {
				expect(validateNodeInfo.bind(null, NodeInfo, maximumSize)).toThrow(
					`Invalid NodeInfo was larger than the maximum allowed ${maximumSize} bytes`,
				);
			});
		});
	});

	describe('#validatePeerAddress', () => {
		it('should return true for correct IPv4', () => {
			const peer = {
				ipAddress: '12.12.12.12',
				port: 4001,
			};

			expect(validatePeerAddress(peer.ipAddress, peer.port)).toBe(true);
		});

		it('should return true for correct IPv6', () => {
			const peer = {
				ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
				port: 4001,
			};

			expect(validatePeerAddress(peer.ipAddress, peer.port)).toBe(true);
		});

		it('should return false for incorrect ipAddress', () => {
			const peerWithIncorrectIp = {
				ipAddress: '12.12.hh12.12',
				port: 4001,
			};

			expect(
				validatePeerAddress(
					peerWithIncorrectIp.ipAddress,
					peerWithIncorrectIp.port,
				),
			).toBe(false);
		});

		it('should return false for incorrect port', () => {
			const peerWithIncorrectPort = {
				ipAddress: '12.12.12.12',
				port: NaN,
			};

			expect(
				validatePeerAddress(
					peerWithIncorrectPort.ipAddress,
					peerWithIncorrectPort.port,
				),
			).toBe(false);
		});
	});

	describe('#validateRPCRequest', () => {
		const validRPCRequest: unknown = {
			data: {},
			procedure: 'list',
		};
		let validatedRPCRequest: P2PRequestPacket;

		beforeEach(() => {
			validatedRPCRequest = validateRPCRequest(validRPCRequest);
		});

		it('should throw an error for an invalid procedure value', () => {
			expect(validateRPCRequest.bind(validateRPCRequest, undefined)).toThrow(
				'Invalid request',
			);
		});

		it('should throw an error for an invalid procedure value with object', () => {
			const inValidRequest: unknown = {
				data: {},
				procedure: {},
			};

			expect(
				validateRPCRequest.bind(validateRPCRequest, inValidRequest),
			).toThrow('Request procedure name is not a string');
		});

		it('should pass and return an object', () => {
			expect(validatedRPCRequest).toEqual(expect.any(Object));
		});

		it('should return a valid rpc request', () => {
			expect(validatedRPCRequest).toMatchObject({
				procedure: expect.any(String),
				data: expect.any(Object),
			});
		});
	});

	describe('#validateProtocolMessage', () => {
		const validProtocolMessage: unknown = {
			data: {},
			event: 'newPeer',
		};
		let returnedValidatedMessage: P2PMessagePacket;

		beforeEach(() => {
			returnedValidatedMessage = validateProtocolMessage(validProtocolMessage);
		});

		it('should throw an error for an invalid event value type', () => {
			expect(
				validateProtocolMessage.bind(validateProtocolMessage, undefined),
			).toThrow('Invalid message');
		});

		it('should throw an error for an invalid event value type with number', () => {
			const inValidMessage: unknown = {
				data: {},
				event: 6788,
			};
			expect(
				validateProtocolMessage.bind(validateProtocolMessage, inValidMessage),
			).toThrow('Protocol message is not a string');
		});

		it('should return an object', () => {
			expect(returnedValidatedMessage).toEqual(expect.any(Object));
		});

		it('should return a valid protocol message object', () => {
			expect(returnedValidatedMessage).toMatchObject({
				data: expect.any(Object),
				event: 'newPeer',
			});
		});
	});
});
