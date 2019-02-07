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
	InvalidPeerError,
	NotEnoughPeersError,
	PeerInboundHandshakeError,
	RPCResponseError,
	InvalidRPCResponseError,
	InvalidProtocolMessageError,
	InvalidRPCRequestError,
	RPCResponseAlreadySentError,
	RequestFailError,
} from '../../src';

describe('errors', () => {
	describe('#NotEnoughPeersError', () => {
		const defaultMessage =
			'Requested number of peers is greater than available good peers';
		let notEnoughPeersError: NotEnoughPeersError;

		beforeEach(async () => {
			notEnoughPeersError = new NotEnoughPeersError(defaultMessage);
		});

		it('should create a new instance of NotEnoughPeersError', async () => {
			expect(notEnoughPeersError)
				.to.be.an('object')
				.and.be.instanceof(NotEnoughPeersError);
		});

		it('should set error name to `NotEnoughPeersError`', async () => {
			expect(notEnoughPeersError.name).to.eql('NotEnoughPeersError');
		});

		it('should set error message when passed an argument', async () => {
			expect(notEnoughPeersError.message).to.eql(defaultMessage);
		});
	});

	describe('#PeerInboundHandshakeError', () => {
		const remoteAddress = '127.0.0.1';
		const defaultMessage = `Received inbound connection from peer ${remoteAddress} which is already in our triedPeers map.`;
		let peerTransportError: PeerInboundHandshakeError;

		beforeEach(async () => {
			peerTransportError = new PeerInboundHandshakeError(defaultMessage, remoteAddress);
		});

		it('should create a new instance of PeerInboundHandshakeError', async () => {
			expect(peerTransportError)
				.to.be.an('object')
				.and.be.instanceof(PeerInboundHandshakeError);
		});

		it('should set error name to `PeerInboundHandshakeError`', async () => {
			expect(peerTransportError.name).to.eql('PeerInboundHandshakeError');
		});

		it('should set error property remoteAddress when passed as an argument', async () => {
			expect(peerTransportError.remoteAddress).to.eql(remoteAddress);
		});
	});

	describe('#RPCResponseError', () => {
		const peerIp = '127.0.0.1:5001';
		const peerPort = 5001;
		const defaultMessage = `Error when fetching peerlist of peer with peer ip ${peerIp} and port ${peerPort}`;
		const defaultError = new Error('Peer not available');
		let rpcGetPeersFailed: RPCResponseError;

		beforeEach(async () => {
			rpcGetPeersFailed = new RPCResponseError(
				defaultMessage,
				defaultError,
				peerIp,
				peerPort,
			);
		});

		it('should create a new instance of RPCResponseError', async () => {
			expect(rpcGetPeersFailed)
				.to.be.an('object')
				.and.be.instanceof(RPCResponseError);
		});

		it('should set error name to `RPCResponseError`', async () => {
			expect(rpcGetPeersFailed.name).to.eql('RPCResponseError');
		});

		it('should set error property peer ip when passed as an argument', async () => {
			expect(rpcGetPeersFailed)
				.and.to.have.property('peerIp')
				.which.is.eql(peerIp);
		});

		it('should set error property peer port when passed as an argument', async () => {
			expect(rpcGetPeersFailed)
				.and.to.have.property('peerPort')
				.which.is.eql(peerPort);
		});

		it('should set error property cause when passed as an argument', async () => {
			expect(rpcGetPeersFailed)
				.and.to.have.property('cause')
				.and.to.be.a('function');

			expect(rpcGetPeersFailed.cause())
				.is.instanceOf(Error)
				.has.property('message')
				.and.eql('Peer not available');
		});
	});

	describe('#InvalidPeer', () => {
		const defaultMessage = 'Invalid peer ip or port';
		let invalidPeer: InvalidPeerError;

		beforeEach(async () => {
			invalidPeer = new InvalidPeerError(defaultMessage);
		});

		it('should create a new instance of InvalidPeerError', async () => {
			expect(invalidPeer)
				.to.be.an('object')
				.and.be.instanceof(InvalidPeerError);
		});

		it('should set error name to `InvalidPeer`', async () => {
			expect(invalidPeer.name).to.eql('InvalidPeerError');
		});

		it('should set error message when passed an argument', async () => {
			expect(invalidPeer.message).to.eql(defaultMessage);
		});
	});

	describe('#InvalidRPCResponse', () => {
		const defaultMessage = 'Invalid response type';
		let invalidRPCResponse: InvalidRPCResponseError;

		beforeEach(async () => {
			invalidRPCResponse = new InvalidRPCResponseError(defaultMessage);
		});

		it('should create a new instance of InvalidRPCResponse', async () => {
			expect(invalidRPCResponse)
				.to.be.an('object')
				.and.be.instanceof(InvalidRPCResponseError);
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
			expect(invalidProtocolMessageError)
				.to.be.an('object')
				.and.be.instanceof(InvalidProtocolMessageError);
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
			expect(invalidRPCRequestError)
				.to.be.an('object')
				.and.be.instanceof(InvalidRPCRequestError);
		});

		it('should set error name to `InvalidRPCRequestError`', async () => {
			expect(invalidRPCRequestError.name).to.eql(
				'InvalidRPCRequestError',
			);
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
			expect(rpcResponseAlreadySentError)
				.to.be.an('object')
				.and.be.instanceof(RPCResponseAlreadySentError);
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
		let requestFailError: RequestFailError;

		beforeEach(async () => {
			requestFailError = new RequestFailError(defaultMessage);
		});

		it('should create a new instance of RequestFailError', async () => {
			expect(requestFailError)
				.to.be.an('object')
				.and.be.instanceof(RequestFailError);
		});

		it('should set error name to `RequestFailError`', async () => {
			expect(requestFailError.name).to.eql('RequestFailError');
		});

		it('should set error message when passed an argument', async () => {
			expect(requestFailError.message).to.eql(defaultMessage);
		});
	});
});
