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
	validatePayloadSize,
	sanitizeIncomingPeerInfo,
	validatePacket,
	validatePeerInfoList,
} from '../../../src/utils';
import { ProtocolPeerInfo, P2PNodeInfo, P2PPeerInfo } from '../../../src/types';
import { constants } from '../../../src';

const {
	DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
	DEFAULT_MAX_PEER_INFO_SIZE,
	PEER_INFO_LIST_TOO_LONG_REASON,
} = constants;

describe('utils/validate', () => {
	describe('#validatePeerInfo', () => {
		describe('for valid peer response object', () => {
			const peer: ProtocolPeerInfo = {
				ipAddress: '12.23.54.3',
				port: 5393,
			};

			const peerWithInvalidHeightValue = {
				ipAddress: '12.23.54.3',
				port: 5393,
			};

			it('should return P2PPeerInfo object', () => {
				expect(validatePeerInfo(sanitizeIncomingPeerInfo(peer), 10000)).toEqual({
					peerId: '12.23.54.3:5393',
					ipAddress: '12.23.54.3',
					port: 5393,
					sharedState: {},
				});
			});

			it('should return P2PPeerInfo object with height value set to 0', () => {
				expect(
					validatePeerInfo(sanitizeIncomingPeerInfo(peerWithInvalidHeightValue), 10000),
				).toEqual({
					peerId: '12.23.54.3:5393',
					ipAddress: '12.23.54.3',
					port: 5393,
					sharedState: {},
				});
			});
		});

		describe('for invalid peer response object', () => {
			it('should throw if PeerInfo is too big', () => {
				const maximumPeerInfoSizeInBytes = 10;
				const peer: ProtocolPeerInfo = {
					ipAddress: '12.23.54.3',
					port: 5393,
				};

				expect(
					validatePeerInfo.bind(null, sanitizeIncomingPeerInfo(peer), maximumPeerInfoSizeInBytes),
				).toThrow(
					`PeerInfo is larger than the maximum allowed size ${maximumPeerInfoSizeInBytes} bytes`,
				);
			});

			it('should throw InvalidPeer error for invalid peer ipAddress or port', () => {
				const peerInvalid = {
					port: 53937888,
					ipAddress: undefined,
				};

				expect(
					validatePeerInfo.bind(
						null,
						sanitizeIncomingPeerInfo((peerInvalid as unknown) as ProtocolPeerInfo),
						10000,
					),
				).toThrow('Invalid peer ipAddress or port');
			});
		});
	});

	describe('#validatePeerInfoList', () => {
		let generatePeerInfoResponse: P2PPeerInfo[];
		beforeEach(() => {
			generatePeerInfoResponse = [];

			generatePeerInfoResponse = [...Array(3)].map(
				() =>
					({
						ipAddress: '128.127.126.125',
						port: 5000,
					} as P2PPeerInfo),
			);
		});

		describe('when PeerInfo list is valid', () => {
			it('should not throw any error', () => {
				expect(
					validatePeerInfoList(
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toBeUndefined();
			});
		});

		describe('when PeerInfo list os too long', () => {
			it('should throw an Error', () => {
				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						generatePeerInfoResponse.length - 1,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toThrow(PEER_INFO_LIST_TOO_LONG_REASON);
			});
		});

		describe('when PeerInfo list has falsy PeerInfo', () => {
			it('should return P2PPeerInfo array', () => {
				generatePeerInfoResponse.push({} as P2PPeerInfo);

				expect(
					validatePeerInfoList.bind(
						null,
						generatePeerInfoResponse,
						DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH,
						DEFAULT_MAX_PEER_INFO_SIZE,
					),
				).toThrow('Invalid peer ipAddress or port for peer with ip: undefined and port undefined');
			});
		});
	});

	describe('#validateNodeInfo', () => {
		describe('when NodeInfo is larger than maximum allowed size', () => {
			const maximumSize = 10;

			const nodeInfo: P2PNodeInfo = {
				chainID: Buffer.from('chainID', 'hex'),
				networkVersion: '1.1',
				options: {
					foo: 'bar',
					fizz: 'buzz',
				},
				nonce: 'nonce678',
				advertiseAddress: true,
			};

			it('should throw Invalid NodeInfo maximum allowed size error', () => {
				expect(
					validatePayloadSize.bind(null, Buffer.from(JSON.stringify(nodeInfo)), maximumSize),
				).toThrow(`Invalid NodeInfo was larger than the maximum allowed ${maximumSize} bytes`);
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

		it('should return false for correct IPv6', () => {
			const peer = {
				ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
				port: 4001,
			};

			expect(validatePeerAddress(peer.ipAddress, peer.port)).toBe(false);
		});

		it('should return false for incorrect ipAddress', () => {
			const peerWithIncorrectIp = {
				ipAddress: '12.12.hh12.12',
				port: 4001,
			};

			expect(validatePeerAddress(peerWithIncorrectIp.ipAddress, peerWithIncorrectIp.port)).toBe(
				false,
			);
		});

		it('should return false for incorrect port', () => {
			const peerWithIncorrectPort = {
				ipAddress: '12.12.12.12',
				port: NaN,
			};

			expect(validatePeerAddress(peerWithIncorrectPort.ipAddress, peerWithIncorrectPort.port)).toBe(
				false,
			);
		});
	});

	describe('#validateRPCRequest', () => {
		it('should throw an error for an invalid procedure value', () => {
			expect(validateRPCRequest.bind(validateRPCRequest, undefined)).toThrow(
				'RPC request format is invalid.',
			);
		});

		it('should throw an error for an invalid procedure value with object', () => {
			const inValidRequest: unknown = {
				data: {},
				procedure: {},
			};

			expect(validateRPCRequest.bind(validateRPCRequest, inValidRequest)).toThrow(
				'RPC request format is invalid.',
			);
		});
	});

	describe('#validateProtocolMessage', () => {
		it('should throw an error for an invalid event value type', () => {
			expect(validateProtocolMessage.bind(validateProtocolMessage, undefined)).toThrow(
				'Protocol message format is invalid.',
			);
		});

		it('should throw an error for an invalid event value type with number', () => {
			const inValidMessage: unknown = {
				data: {},
				event: 6788,
			};
			expect(validateProtocolMessage.bind(validateProtocolMessage, inValidMessage)).toThrow(
				'Protocol message format is invalid.',
			);
		});
	});

	describe('#validatePacket', () => {
		describe('valid packet', () => {
			const validPackets = [
				{
					event: 'remote-message',
					data: {
						event: 'postNodeInfo',
						data:
							'\n' +
							'@da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba\u0012\u00031.1\u001a\u001027dce6af38f646c3',
					},
				},
				{ event: '#handshake', data: { authToken: null }, cid: 1 },
				{ event: 'rpc-request', data: { procedure: 'getPeers' }, cid: 3 },
				{ event: 'rpc-request', data: { procedure: 'getNodeInfo' }, cid: 2 },
				{ event: '#handshake', data: { authToken: null }, cid: 1 },
				{
					event: '#disconnect',
					data: { code: 1000, data: 'Intentionally removed peer 127.0.0.1:5006' },
				},
			];

			it('should not throw an error if the packet is valid', () => {
				validPackets.forEach(packet => {
					expect(() => validatePacket(packet)).not.toThrow('Packet format is invalid.');
				});
			});
		});

		describe('invalid packet', () => {
			it('should throw an error if the message contains additional keywords', () => {
				expect(() => validatePacket({ cid: 4, invalidProperty: { something: 'invalid' } })).toThrow(
					'Packet format is invalid.',
				);
			});
		});
	});
});
