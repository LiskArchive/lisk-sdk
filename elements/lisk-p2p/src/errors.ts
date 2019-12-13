import { P2PPeerInfo } from './p2p_types';

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
/* tslint:disable: max-classes-per-file */
export class PeerInboundHandshakeError extends Error {
	public statusCode: number;
	public remoteAddress: string;
	public handshakeURL?: string;

	public constructor(
		message: string,
		statusCode: number,
		remoteAddress: string,
		handshakeURL?: string,
	) {
		super(message);
		this.name = 'PeerInboundHandshakeError';
		this.statusCode = statusCode;
		this.remoteAddress = remoteAddress;
		this.handshakeURL = handshakeURL;
	}
}

export class RPCResponseError extends Error {
	public peerId: string;

	public constructor(message: string, peerId: string) {
		super(message);
		this.name = 'RPCResponseError';
		this.peerId = peerId;
	}
}

export class InvalidRPCResponseError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidRPCResponseError';
	}
}

export class RPCResponseAlreadySentError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'ResponseAlreadySentError';
	}
}

export class ExistingPeerError extends Error {
	public peerInfo: P2PPeerInfo;

	public constructor(peerInfo: P2PPeerInfo) {
		super('Peer already exists');
		this.name = 'ExistingPeerError';
		this.peerInfo = peerInfo;
	}
}

export class InvalidNodeInfoError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidNodeInfoError';
	}
}

export class InvalidPeerInfoError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidPeerInfoError';
	}
}

export class InvalidPeerInfoListError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidPeerInfoListError';
	}
}

export class RequestFailError extends Error {
	public peerId: string;
	public peerVersion: string;
	public response: Error;
	public constructor(
		message: string,
		response?: Error,
		peerId?: string,
		peerVersion?: string,
	) {
		super(message);
		this.name = 'RequestFailError';
		// The request was made and the peer responded with error
		this.response = response || new Error(message);
		this.peerId = peerId || '';
		this.peerVersion = peerVersion || '';
		this.message = peerId
			? `${this.message}: Peer Id: ${this.peerId}: Peer Version: ${this.peerVersion}`
			: message;
	}
}

export class SendFailError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'SendFailError';
	}
}

export class InvalidRPCRequestError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidRPCRequestError';
	}
}

export class InvalidProtocolMessageError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidProtocolMessageError';
	}
}
