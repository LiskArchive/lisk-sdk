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
	InvalidPeerException,
	PeerInboundHandshakeException,
	RPCResponseException,
	InvalidRPCResponseException,
	InvalidProtocolMessageException,
	InvalidRPCRequestException,
	RPCResponseAlreadySentException,
	RequestFailException,
} from '../../src';

describe('exceptions', () => {
	describe('#PeerInboundHandshakeException', () => {
		const remoteAddress = '127.0.0.1';
		const statusCode = 4501;
		const defaultMessage = `Received inbound connection from peer ${remoteAddress} which is already in our triedPeers map.`;
		let peerTransportError: PeerInboundHandshakeException;

		beforeEach(async () => {
			peerTransportError = new PeerInboundHandshakeException(
				defaultMessage,
				statusCode,
				remoteAddress,
			);
		});

		it('should create a new instance of PeerInboundHandshakeException', async () => {
			expect(peerTransportError).to.be.instanceof(
				PeerInboundHandshakeException,
			);
		});

		it('should set error name to `PeerInboundHandshakeException`', async () => {
			expect(peerTransportError.name).to.eql('PeerInboundHandshakeException');
		});

		it('should set error property remoteAddress when passed as an argument', async () => {
			expect(peerTransportError.remoteAddress).to.eql(remoteAddress);
		});
	});

	describe('#RPCResponseException', () => {
		const peerId = '127.0.0.1:5001';
		const defaultMessage = `Error when fetching peerlist of peer with peer Id ${peerId}`;
		let rpcGetPeersFailed: RPCResponseException;

		beforeEach(async () => {
			rpcGetPeersFailed = new RPCResponseException(defaultMessage, peerId);
		});

		it('should create a new instance of RPCResponseException', async () => {
			expect(rpcGetPeersFailed).to.be.instanceof(RPCResponseException);
		});

		it('should set error name to `RPCResponseException`', async () => {
			expect(rpcGetPeersFailed.name).to.eql('RPCResponseException');
		});

		it('should set error property peer Id when passed as an argument', async () => {
			expect(rpcGetPeersFailed)
				.and.to.have.property('peerId')
				.which.is.eql(peerId);
		});
	});

	describe('#InvalidPeer', () => {
		const defaultMessage = 'Invalid peer ip or port';
		let invalidPeer: InvalidPeerException;

		beforeEach(async () => {
			invalidPeer = new InvalidPeerException(defaultMessage);
		});

		it('should create a new instance of InvalidPeerException', async () => {
			expect(invalidPeer).to.be.instanceof(InvalidPeerException);
		});

		it('should set error name to `InvalidPeer`', async () => {
			expect(invalidPeer.name).to.eql('InvalidPeerException');
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidPeer.message).to.eql(defaultMessage);
		});
	});

	describe('#InvalidRPCResponse', () => {
		const defaultMessage = 'Invalid response type';
		let invalidRPCResponse: InvalidRPCResponseException;

		beforeEach(async () => {
			invalidRPCResponse = new InvalidRPCResponseException(defaultMessage);
		});

		it('should create a new instance of InvalidRPCResponse', async () => {
			expect(invalidRPCResponse).to.be.instanceof(InvalidRPCResponseException);
		});

		it('should set error name to `InvalidRPCResponseException`', async () => {
			expect(invalidRPCResponse.name).to.eql('InvalidRPCResponseException');
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidRPCResponse.message).to.eql(defaultMessage);
		});
	});

	describe('#InvalidProtocolMessageException', () => {
		const defaultMessage = 'Invalid protocol message';
		let invalidProtocolMessageException: InvalidProtocolMessageException;

		beforeEach(async () => {
			invalidProtocolMessageException = new InvalidProtocolMessageException(
				defaultMessage,
			);
		});

		it('should create a new instance of InvalidProtocolMessageException', async () => {
			expect(invalidProtocolMessageException).to.be.instanceof(
				InvalidProtocolMessageException,
			);
		});

		it('should set error name to `InvalidProtocolMessageException`', async () => {
			expect(invalidProtocolMessageException.name).to.eql(
				'InvalidProtocolMessageException',
			);
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidProtocolMessageException.message).to.eql(defaultMessage);
		});
	});

	describe('#InvalidRPCRequestException', () => {
		let invalidRPCRequestException: InvalidRPCRequestException;
		const defaultMessage = 'Invalid RPC request error';

		beforeEach(async () => {
			invalidRPCRequestException = new InvalidRPCRequestException(
				defaultMessage,
			);
		});

		it('should create a new instance of InvalidRPCRequestException', async () => {
			expect(invalidRPCRequestException).to.be.instanceof(
				InvalidRPCRequestException,
			);
		});

		it('should set error name to `InvalidRPCRequestException`', async () => {
			expect(invalidRPCRequestException.name).to.eql(
				'InvalidRPCRequestException',
			);
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidRPCRequestException.message).to.eql(defaultMessage);
		});
	});

	describe('#RPCResponseAlreadySentException', () => {
		const defaultMessage = 'Response was already sent';
		let rPCResponseAlreadySentException: RPCResponseAlreadySentException;

		beforeEach(async () => {
			rPCResponseAlreadySentException = new RPCResponseAlreadySentException(
				defaultMessage,
			);
		});

		it('should create a new instance of RPCResponseAlreadySentException', async () => {
			expect(rPCResponseAlreadySentException).to.be.instanceof(
				RPCResponseAlreadySentException,
			);
		});

		it('should set error name to `RPCResponseAlreadySentException`', async () => {
			expect(rPCResponseAlreadySentException.name).to.eql(
				'ResponseAlreadySentError',
			);
		});

		it('should set error message when passed an argument', async () => {
			expect(rPCResponseAlreadySentException.message).to.eql(defaultMessage);
		});
	});

	describe('#RequestFailException', () => {
		const defaultMessage =
			'Request failed due to no peers found in peer selection';
		const errorResponseMessage = 'Invalid block id';
		const response = new Error(errorResponseMessage);
		const peerId = '127.0.0.1:4000';
		const peerVersion = '1.5.0';

		let requestFailException: RequestFailException;

		beforeEach(async () => {
			requestFailException = new RequestFailException(
				defaultMessage,
				response,
				peerId,
				peerVersion,
			);
		});

		it('should create a new instance of RequestFailException', async () => {
			expect(requestFailException).to.be.instanceof(RequestFailException);
		});

		it('should set error name to `RequestFailException`', async () => {
			expect(requestFailException.name).to.eql('RequestFailException');
		});

		it('should set error message when passed an argument', async () => {
			expect(requestFailException.message).to.eql(
				`${defaultMessage}: Peer Id: ${peerId}: Peer Version: ${peerVersion}`,
			);
		});

		it('should set response object within this custom error', async () => {
			expect(requestFailException.response)
				.to.eql(response)
				.to.have.property('message')
				.eql(errorResponseMessage);
		});
	});
});
