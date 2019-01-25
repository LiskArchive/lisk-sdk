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
	PeerTransportError,
	RPCResponseError,
	InvalidRPCResponseError,
	InvalidProtocolMessageError,
	InvalidRPCRequestError,
	RPCResponseAlreadySentError,
	RequestFailError,
} from '../../src';

describe('errors', () => {
	describe('#NotEnoughPeersError', () => {
		let notEnoughPeersError: NotEnoughPeersError;
		const defaultMessage =
			'Requested number of peers is greater than available good peers';

		beforeEach(() => {
			notEnoughPeersError = new NotEnoughPeersError(defaultMessage);
			return Promise.resolve();
		});

		describe('should create an error object instance of NotEnoughPeersError', () => {
			it('should create a new instance of NotEnoughPeersError', () => {
				return expect(notEnoughPeersError)
					.to.be.an('object')
					.and.be.instanceof(NotEnoughPeersError);
			});

			it('should set error name to `NotEnoughPeersError`', () => {
				return expect(notEnoughPeersError.name).to.eql('NotEnoughPeersError');
			});
		});

		describe('should set error object properties', () => {
			beforeEach(() => {
				notEnoughPeersError = new NotEnoughPeersError(defaultMessage);
				return Promise.resolve();
			});

			it('should set error message when passed an argument', () => {
				return expect(notEnoughPeersError.message).to.eql(defaultMessage);
			});
		});
	});

	describe('#PeerTransportError', () => {
		let peerTransportError: PeerTransportError;
		let peerId = '0.0.0.0:80';
		const defaultMessage = `Received inbound connection from peer ${peerId} which is already in our triedPeers map.`;

		beforeEach(() => {
			peerTransportError = new PeerTransportError(defaultMessage, peerId);
			return Promise.resolve();
		});

		describe('should create an error object', () => {
			it('should create a new instance of PeerTransportError', () => {
				return expect(peerTransportError)
					.to.be.an('object')
					.and.be.instanceof(PeerTransportError);
			});

			it('should set error name to `PeerTransportError`', () => {
				return expect(peerTransportError.name).to.eql('PeerTransportError');
			});
		});

		describe('should set error object property', () => {
			beforeEach(() => {
				peerTransportError = new PeerTransportError(defaultMessage, peerId);
				return Promise.resolve();
			});

			it('should set error property peerId when passed as an argument', () => {
				return expect(peerTransportError.peerId).to.eql(peerId);
			});
		});
	});

	describe('#RPCResponseError', () => {
		let rpcGetPeersFailed: RPCResponseError;
		const peerIp = '127.0.0.1:5001';
		const peerPort = 5001;
		const defaultMessage = `Error when fetching peerlist of peer with peer ip ${peerIp} and port ${peerPort}`;
		const defaultError = new Error('Peer not available');

		beforeEach(() => {
			rpcGetPeersFailed = new RPCResponseError(
				defaultMessage,
				defaultError,
				peerIp,
				peerPort,
			);
			return Promise.resolve();
		});

		describe('should create an error object', () => {
			it('should create a new instance of RPCResponseError', () => {
				return expect(rpcGetPeersFailed)
					.to.be.an('object')
					.and.be.instanceof(RPCResponseError);
			});

			it('should set error name to `RPCResponseError`', () => {
				return expect(rpcGetPeersFailed.name).to.eql('RPCResponseError');
			});
		});

		describe('should set error object properties', () => {
			beforeEach(() => {
				rpcGetPeersFailed = new RPCResponseError(
					defaultMessage,
					defaultError,
					peerIp,
					peerPort,
				);
				return Promise.resolve();
			});

			it('should set error property peer ip when passed as an argument', () => {
				return expect(rpcGetPeersFailed)
					.and.to.have.property('peerIp')
					.which.is.eql(peerIp);
			});

			it('should set error property peer port when passed as an argument', () => {
				return expect(rpcGetPeersFailed)
					.and.to.have.property('peerPort')
					.which.is.eql(peerPort);
			});

			it('should set error property cause when passed as an argument', () => {
				expect(rpcGetPeersFailed)
					.and.to.have.property('cause')
					.and.to.be.a('function');

				return expect(rpcGetPeersFailed.cause())
					.is.instanceOf(Error)
					.has.property('message')
					.and.eql('Peer not available');
			});
		});
	});

	describe('#InvalidPeer', () => {
		let invalidPeer: InvalidPeerError;
		const defaultMessage = 'Invalid peer ip or port';

		beforeEach(() => {
			invalidPeer = new InvalidPeerError(defaultMessage);
			return Promise.resolve();
		});

		describe('should create an error object instance of InvalidPeer', () => {
			it('should create a new instance of InvalidPeer', () => {
				return expect(invalidPeer)
					.to.be.an('object')
					.and.be.instanceof(InvalidPeerError);
			});

			it('should set error name to `InvalidPeerError`', () => {
				return expect(invalidPeer.name).to.eql('InvalidPeerError');
			});
		});

		describe('should set error object properties', () => {
			beforeEach(() => {
				invalidPeer = new InvalidPeerError(defaultMessage);
				return Promise.resolve();
			});

			it('should set error message when passed an argument', () => {
				return expect(invalidPeer.message).to.eql(defaultMessage);
			});
		});
	});

	describe('#InvalidRPCResponse', () => {
		let invalidRPCResponse: InvalidRPCResponseError;
		const defaultMessage = 'Invalid response type';

		beforeEach(() => {
			invalidRPCResponse = new InvalidRPCResponseError(defaultMessage);
			return Promise.resolve();
		});

		describe('should create an error object instance of InvalidRPCResponse', () => {
			it('should create a new instance of InvalidRPCResponse', () => {
				return expect(invalidRPCResponse)
					.to.be.an('object')
					.and.be.instanceof(InvalidRPCResponseError);
			});

			it('should set error name to `InvalidRPCResponseError`', () => {
				return expect(invalidRPCResponse.name).to.eql(
					'InvalidRPCResponseError',
				);
			});
		});

		describe('should set error object properties', () => {
			beforeEach(() => {
				invalidRPCResponse = new InvalidRPCResponseError(defaultMessage);
				return Promise.resolve();
			});

			it('should set error message when passed an argument', () => {
				return expect(invalidRPCResponse.message).to.eql(defaultMessage);
			});
		});
	});

	describe('#InvalidProtocolMessageError', () => {
		let invalidProtocolMessageError: InvalidProtocolMessageError;
		const defaultMessage = 'Invalid protocol message';

		beforeEach(async () => {
			invalidProtocolMessageError = new InvalidProtocolMessageError(
				defaultMessage,
			);
			return Promise.resolve();
		});

		it('should create a new instance of InvalidProtocolMessageError', () => {
			return expect(invalidProtocolMessageError)
				.to.be.an('object')
				.and.be.instanceof(InvalidProtocolMessageError);
		});

		it('should set error name to `InvalidProtocolMessageError`', () => {
			return expect(invalidProtocolMessageError.name).to.eql(
				'InvalidProtocolMessageError',
			);
		});

		it('should set error message when passed an argument', () => {
			return expect(invalidProtocolMessageError.message).to.eql(defaultMessage);
		});
	});

	describe('#InvalidRPCRequestError', () => {
		let invalidRPCRequestError: InvalidRPCRequestError;
		const defaultMessage = 'Invalid RPC request error';

		beforeEach(async () => {
			invalidRPCRequestError = new InvalidRPCRequestError(defaultMessage);
			return Promise.resolve();
		});

		it('should create a new instance of InvalidRPCRequestError', () => {
			return expect(invalidRPCRequestError)
				.to.be.an('object')
				.and.be.instanceof(InvalidRPCRequestError);
		});

		it('should set error name to `InvalidRPCRequestError`', () => {
			return expect(invalidRPCRequestError.name).to.eql(
				'InvalidRPCRequestError',
			);
		});

		it('should set error message when passed an argument', () => {
			return expect(invalidRPCRequestError.message).to.eql(defaultMessage);
		});
	});

	describe('#RPCResponseAlreadySentError', () => {
		let rpcResponseAlreadySentError: RPCResponseAlreadySentError;
		const defaultMessage = 'Response was already sent';

		beforeEach(async () => {
			rpcResponseAlreadySentError = new RPCResponseAlreadySentError(
				defaultMessage,
			);
			return Promise.resolve();
		});

		it('should create a new instance of RPCResponseAlreadySentError', () => {
			return expect(rpcResponseAlreadySentError)
				.to.be.an('object')
				.and.be.instanceof(RPCResponseAlreadySentError);
		});

		it('should set error name to `RPCResponseAlreadySentError`', () => {
			return expect(rpcResponseAlreadySentError.name).to.eql(
				'ResponseAlreadySentError',
			);
		});

		it('should set error message when passed an argument', () => {
			return expect(rpcResponseAlreadySentError.message).to.eql(defaultMessage);
		});
	});

	describe('#RequestFailError', () => {
		let requestFailError: RequestFailError;
		const defaultMessage =
			'Request failed due to no peers found in peer selection';

		beforeEach(async () => {
			requestFailError = new RequestFailError(defaultMessage);
			return Promise.resolve();
		});

		it('should create a new instance of RequestFailError', () => {
			return expect(requestFailError)
				.to.be.an('object')
				.and.be.instanceof(RequestFailError);
		});

		it('should set error name to `RequestFailError`', () => {
			return expect(requestFailError.name).to.eql('RequestFailError');
		});

		it('should set error message when passed an argument', () => {
			return expect(requestFailError.message).to.eql(defaultMessage);
		});
	});
});
