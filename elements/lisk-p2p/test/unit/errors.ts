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
import { P2PPeerInfo } from '../../src';
import { constructPeerId } from '../../src/utils';

describe('errors', () => {
	describe('#PeerInboundHandshakeError', () => {
		const remoteAddress = '127.0.0.1';
		const statusCode = 4501;
		const defaultMessage = `Received inbound connection from peer ${remoteAddress} which is already in our triedPeers map.`;
		let peerTransportError: PeerInboundHandshakeError;

		beforeEach(async () => {
			peerTransportError = new PeerInboundHandshakeError(
				defaultMessage,
				statusCode,
				remoteAddress,
			);
		});

		it('should create a new instance of PeerInboundHandshakeError', async () => {
			expect(peerTransportError).to.be.instanceof(PeerInboundHandshakeError);
		});

		it('should set error name to `PeerInboundHandshakeError`', async () => {
			expect(peerTransportError.name).to.eql('PeerInboundHandshakeError');
		});

		it('should set error property remoteAddress when passed as an argument', async () => {
			expect(peerTransportError.remoteAddress).to.eql(remoteAddress);
		});
	});

	describe('#RPCResponseError', () => {
		const peerId = '127.0.0.1:5001';
		const defaultMessage = `Error when fetching peerlist of peer with peer Id ${peerId}`;
		let rpcGetPeersFailed: RPCResponseError;

		beforeEach(async () => {
			rpcGetPeersFailed = new RPCResponseError(defaultMessage, peerId);
		});

		it('should create a new instance of RPCResponseError', async () => {
			expect(rpcGetPeersFailed).to.be.instanceof(RPCResponseError);
		});

		it('should set error name to `RPCResponseError`', async () => {
			expect(rpcGetPeersFailed.name).to.eql('RPCResponseError');
		});

		it('should set error property peer Id when passed as an argument', async () => {
			expect(rpcGetPeersFailed)
				.and.to.have.property('peerId')
				.which.is.eql(peerId);
		});
	});

	describe('#InvalidPeerInfoError', () => {
		const defaultMessage = 'Invalid peer ipAddress or port';
		let invalidPeer: InvalidPeerInfoError;

		beforeEach(async () => {
			invalidPeer = new InvalidPeerInfoError(defaultMessage);
		});

		it('should create a new instance of InvalidPeerInfoError', async () => {
			expect(invalidPeer).to.be.instanceof(InvalidPeerInfoError);
		});

		it('should set error name to `InvalidPeerInfoError`', async () => {
			expect(invalidPeer.name).to.eql('InvalidPeerInfoError');
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidPeer.message).to.eql(defaultMessage);
		});
	});

	describe('#ExistingPeerError', () => {
		const existingPeerErrorMessagge = 'Peer already exists';
		const peerInfo: P2PPeerInfo = {
			ipAddress: '0.0.0.0',
			wsPort: 5000,
			peerId: constructPeerId('0.0.0.0', 5000),
		};
		let existingPeer: ExistingPeerError;

		beforeEach(async () => {
			existingPeer = new ExistingPeerError(peerInfo);
		});

		it('should create a new instance of ExistingPeerError', async () => {
			expect(existingPeer).to.be.instanceof(ExistingPeerError);
		});

		it('should set error name to `ExistingPeerError`', async () => {
			expect(existingPeer.name).to.eql('ExistingPeerError');
		});

		it(`should set error message to ${existingPeerErrorMessagge}`, async () => {
			expect(existingPeer.message).to.eql(existingPeerErrorMessagge);
		});

		it(`should set peerInfo parameter when passing an argument`, async () => {
			expect(existingPeer.peerInfo).to.eql(peerInfo);
		});
	});

	describe('#InvalidNodeInfoError', () => {
		const InvalidNodeInfoErrorMessagge = 'Invalid NodeInfo version';
		let invalidNodeInfo: InvalidNodeInfoError;

		beforeEach(async () => {
			invalidNodeInfo = new InvalidNodeInfoError(InvalidNodeInfoErrorMessagge);
		});

		it('should create a new instance of InvalidNodeInfoError', async () => {
			expect(invalidNodeInfo).to.be.instanceof(InvalidNodeInfoError);
		});

		it('should set error name to `InvalidNodeInfoError`', async () => {
			expect(invalidNodeInfo.name).to.eql('InvalidNodeInfoError');
		});

		it(`should set error message to ${InvalidNodeInfoError}`, async () => {
			expect(invalidNodeInfo.message).to.eql(InvalidNodeInfoErrorMessagge);
		});
	});

	describe('#InvalidRPCResponseError', () => {
		const defaultMessage = 'Invalid response type';
		let invalidRPCResponse: InvalidRPCResponseError;

		beforeEach(async () => {
			invalidRPCResponse = new InvalidRPCResponseError(defaultMessage);
		});

		it('should create a new instance of InvalidRPCResponse', async () => {
			expect(invalidRPCResponse).to.be.instanceof(InvalidRPCResponseError);
		});

		it('should set error name to `InvalidRPCResponseError`', async () => {
			expect(invalidRPCResponse.name).to.eql('InvalidRPCResponseError');
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidRPCResponse.message).to.eql(defaultMessage);
		});
	});

	describe('#InvalidProtocolMessageError', () => {
		const defaultMessage = 'Invalid protocol message';
		let invalidProtocolMessageError: InvalidProtocolMessageError;

		beforeEach(async () => {
			invalidProtocolMessageError = new InvalidProtocolMessageError(
				defaultMessage,
			);
		});

		it('should create a new instance of InvalidProtocolMessageError', async () => {
			expect(invalidProtocolMessageError).to.be.instanceof(
				InvalidProtocolMessageError,
			);
		});

		it('should set error name to `InvalidProtocolMessageError`', async () => {
			expect(invalidProtocolMessageError.name).to.eql(
				'InvalidProtocolMessageError',
			);
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidProtocolMessageError.message).to.eql(defaultMessage);
		});
	});

	describe('#InvalidRPCRequestError', () => {
		let invalidRPCRequestError: InvalidRPCRequestError;
		const defaultMessage = 'Invalid RPC request error';

		beforeEach(async () => {
			invalidRPCRequestError = new InvalidRPCRequestError(defaultMessage);
		});

		it('should create a new instance of InvalidRPCRequestError', async () => {
			expect(invalidRPCRequestError).to.be.instanceof(InvalidRPCRequestError);
		});

		it('should set error name to `InvalidRPCRequestError`', async () => {
			expect(invalidRPCRequestError.name).to.eql('InvalidRPCRequestError');
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidRPCRequestError.message).to.eql(defaultMessage);
		});
	});

	describe('#RPCResponseAlreadySentError', () => {
		const defaultMessage = 'Response was already sent';
		let rpcResponseAlreadySentError: RPCResponseAlreadySentError;

		beforeEach(async () => {
			rpcResponseAlreadySentError = new RPCResponseAlreadySentError(
				defaultMessage,
			);
		});

		it('should create a new instance of RPCResponseAlreadySentError', async () => {
			expect(rpcResponseAlreadySentError).to.be.instanceof(
				RPCResponseAlreadySentError,
			);
		});

		it('should set error name to `RPCResponseAlreadySentError`', async () => {
			expect(rpcResponseAlreadySentError.name).to.eql(
				'ResponseAlreadySentError',
			);
		});

		it('should set error message when passed an argument', async () => {
			expect(rpcResponseAlreadySentError.message).to.eql(defaultMessage);
		});
	});

	describe('#RequestFailError', () => {
		const defaultMessage =
			'Request failed due to no peers found in peer selection';
		const errorResponseMessage = 'Invalid block id';
		const response = new Error(errorResponseMessage);
		const peerId = '127.0.0.1:4000';
		const peerVersion = '1.5.0';

		let requestFailError: RequestFailError;

		beforeEach(async () => {
			requestFailError = new RequestFailError(
				defaultMessage,
				response,
				peerId,
				peerVersion,
			);
		});

		it('should create a new instance of RequestFailError', async () => {
			expect(requestFailError).to.be.instanceof(RequestFailError);
		});

		it('should set error name to `RequestFailError`', async () => {
			expect(requestFailError.name).to.eql('RequestFailError');
		});

		it('should set error message when passed an argument', async () => {
			expect(requestFailError.message).to.eql(
				`${defaultMessage}: Peer Id: ${peerId}: Peer Version: ${peerVersion}`,
			);
		});

		it('should set response object within this custom error', async () => {
			expect(requestFailError.response)
				.to.eql(response)
				.to.have.property('message')
				.eql(errorResponseMessage);
		});
	});
});
