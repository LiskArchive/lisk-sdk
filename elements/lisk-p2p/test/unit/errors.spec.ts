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
	InvalidPeerInfoError,
	PeerInboundHandshakeError,
	RPCResponseError,
	InvalidRPCResponseError,
	InvalidProtocolMessageError,
	InvalidRPCRequestError,
	RPCResponseAlreadySentError,
	RequestFailError,
	ExistingPeerError,
	InvalidNodeInfoError,
} from '../../src/errors';
import { p2pTypes } from '../../src';
import { constructPeerId } from '../../src/utils';

describe('errors', () => {
	describe('#PeerInboundHandshakeError', () => {
		const remoteAddress = '127.0.0.1';
		const statusCode = 4501;
		const defaultMessage = `Received inbound connection from peer ${remoteAddress} which is already in our triedPeers map.`;
		let peerTransportError: PeerInboundHandshakeError;

		beforeEach(() => {
			peerTransportError = new PeerInboundHandshakeError(defaultMessage, statusCode, remoteAddress);
		});

		it('should create a new instance of PeerInboundHandshakeError', () => {
			expect(peerTransportError).toBeInstanceOf(PeerInboundHandshakeError);
		});

		it('should set error name to `PeerInboundHandshakeError`', () => {
			expect(peerTransportError.name).toBe('PeerInboundHandshakeError');
		});

		it('should set error property remoteAddress when passed as an argument', () => {
			expect(peerTransportError.remoteAddress).toEqual(remoteAddress);
		});
	});

	describe('#RPCResponseError', () => {
		const peerId = '127.0.0.1:5001';
		const defaultMessage = `Error when fetching peerlist of peer with peer Id ${peerId}`;
		let rpcGetPeersFailed: RPCResponseError;

		beforeEach(() => {
			rpcGetPeersFailed = new RPCResponseError(defaultMessage, peerId);
		});

		it('should create a new instance of RPCResponseError', () => {
			expect(rpcGetPeersFailed).toBeInstanceOf(RPCResponseError);
		});

		it('should set error name to `RPCResponseError`', () => {
			expect(rpcGetPeersFailed.name).toBe('RPCResponseError');
		});

		it('should set error property peer Id when passed as an argument', () => {
			expect(rpcGetPeersFailed).toMatchObject({
				name: 'RPCResponseError',
				peerId: constructPeerId('127.0.0.1', 5001),
			});
		});
	});

	describe('#InvalidPeerInfoError', () => {
		const defaultMessage = 'Invalid peer ipAddress or port';
		let invalidPeer: InvalidPeerInfoError;

		beforeEach(() => {
			invalidPeer = new InvalidPeerInfoError(defaultMessage);
		});

		it('should create a new instance of InvalidPeerInfoError', () => {
			expect(invalidPeer).toBeInstanceOf(InvalidPeerInfoError);
		});

		it('should set error name to `InvalidPeerInfoError`', () => {
			expect(invalidPeer.name).toBe('InvalidPeerInfoError');
		});

		it('should set error message when passed an argument', () => {
			expect(invalidPeer.message).toEqual(defaultMessage);
		});
	});

	describe('#ExistingPeerError', () => {
		const existingPeerErrorMessagge = 'Peer already exists';
		const peerInfo: p2pTypes.P2PPeerInfo = {
			ipAddress: '0.0.0.0',
			port: 5000,
			peerId: constructPeerId('0.0.0.0', 5000),
		};
		let existingPeer: ExistingPeerError;

		beforeEach(() => {
			existingPeer = new ExistingPeerError(peerInfo);
		});

		it('should create a new instance of ExistingPeerError', () => {
			expect(existingPeer).toBeInstanceOf(ExistingPeerError);
		});

		it('should set error name to `ExistingPeerError`', () => {
			expect(existingPeer.name).toBe('ExistingPeerError');
		});

		it(`should set error message to ${existingPeerErrorMessagge}`, () => {
			expect(existingPeer.message).toEqual(existingPeerErrorMessagge);
		});

		it('should set peerInfo parameter when passing an argument', () => {
			expect(existingPeer.peerInfo).toEqual(peerInfo);
		});
	});

	describe('#InvalidNodeInfoError', () => {
		const InvalidNodeInfoErrorMessagge = 'Invalid NodeInfo version';
		let invalidNodeInfo: InvalidNodeInfoError;

		beforeEach(() => {
			invalidNodeInfo = new InvalidNodeInfoError(InvalidNodeInfoErrorMessagge);
		});

		it('should create a new instance of InvalidNodeInfoError', () => {
			expect(invalidNodeInfo).toBeInstanceOf(InvalidNodeInfoError);
		});

		it('should set error name to `InvalidNodeInfoError`', () => {
			expect(invalidNodeInfo.name).toBe('InvalidNodeInfoError');
		});

		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		it(`should set error message to ${InvalidNodeInfoError}`, () => {
			expect(invalidNodeInfo.message).toEqual(InvalidNodeInfoErrorMessagge);
		});
	});

	describe('#InvalidRPCResponseError', () => {
		const defaultMessage = 'Invalid response type';
		let invalidRPCResponse: InvalidRPCResponseError;

		beforeEach(() => {
			invalidRPCResponse = new InvalidRPCResponseError(defaultMessage);
		});

		it('should create a new instance of InvalidRPCResponse', () => {
			expect(invalidRPCResponse).toBeInstanceOf(InvalidRPCResponseError);
		});

		it('should set error name to `InvalidRPCResponseError`', () => {
			expect(invalidRPCResponse.name).toBe('InvalidRPCResponseError');
		});

		it('should set error message when passed an argument', () => {
			expect(invalidRPCResponse.message).toEqual(defaultMessage);
		});
	});

	describe('#InvalidProtocolMessageError', () => {
		const defaultMessage = 'Invalid protocol message';
		let invalidProtocolMessageError: InvalidProtocolMessageError;

		beforeEach(() => {
			invalidProtocolMessageError = new InvalidProtocolMessageError(defaultMessage);
		});

		it('should create a new instance of InvalidProtocolMessageError', () => {
			expect(invalidProtocolMessageError).toBeInstanceOf(InvalidProtocolMessageError);
		});

		it('should set error name to `InvalidProtocolMessageError`', () => {
			expect(invalidProtocolMessageError.name).toBe('InvalidProtocolMessageError');
		});

		it('should set error message when passed an argument', () => {
			expect(invalidProtocolMessageError.message).toEqual(defaultMessage);
		});
	});

	describe('#InvalidRPCRequestError', () => {
		let invalidRPCRequestError: InvalidRPCRequestError;
		const defaultMessage = 'Invalid RPC request error';

		beforeEach(() => {
			invalidRPCRequestError = new InvalidRPCRequestError(defaultMessage);
		});

		it('should create a new instance of InvalidRPCRequestError', () => {
			expect(invalidRPCRequestError).toBeInstanceOf(InvalidRPCRequestError);
		});

		it('should set error name to `InvalidRPCRequestError`', () => {
			expect(invalidRPCRequestError.name).toBe('InvalidRPCRequestError');
		});

		it('should set error message when passed an argument', () => {
			expect(invalidRPCRequestError.message).toEqual(defaultMessage);
		});
	});

	describe('#RPCResponseAlreadySentError', () => {
		const defaultMessage = 'Response was already sent';
		let rpcResponseAlreadySentError: RPCResponseAlreadySentError;

		beforeEach(() => {
			rpcResponseAlreadySentError = new RPCResponseAlreadySentError(defaultMessage);
		});

		it('should create a new instance of RPCResponseAlreadySentError', () => {
			expect(rpcResponseAlreadySentError).toBeInstanceOf(RPCResponseAlreadySentError);
		});

		it('should set error name to `RPCResponseAlreadySentError`', () => {
			expect(rpcResponseAlreadySentError.name).toBe('ResponseAlreadySentError');
		});

		it('should set error message when passed an argument', () => {
			expect(rpcResponseAlreadySentError.message).toEqual(defaultMessage);
		});
	});

	describe('#RequestFailError', () => {
		const defaultMessage = 'Request failed due to no peers found in peer selection';
		const errorResponseMessage = 'Invalid block id';
		const response = new Error(errorResponseMessage);
		const peerId = '127.0.0.1:4000';
		const peerVersion = '1.5.0';

		let requestFailError: RequestFailError;

		beforeEach(() => {
			requestFailError = new RequestFailError(defaultMessage, response, peerId, peerVersion);
		});

		it('should create a new instance of RequestFailError', () => {
			expect(requestFailError).toBeInstanceOf(RequestFailError);
		});

		it('should set error name to `RequestFailError`', () => {
			expect(requestFailError.name).toBe('RequestFailError');
		});

		it('should set error message when passed an argument', () => {
			expect(requestFailError.message).toBe(
				`${defaultMessage}: Peer Id: ${peerId}: Peer Version: ${peerVersion}`,
			);
		});

		it('should set response object within this custom error', () => {
			expect(requestFailError.response).toMatchObject({
				message: errorResponseMessage,
			});
		});
	});
});
