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
export class PeerInboundHandshakeException extends Error {
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
		this.name = 'PeerInboundHandshakeException';
		this.statusCode = statusCode;
		this.remoteAddress = remoteAddress;
		this.handshakeURL = handshakeURL;
	}
}

export class RPCResponseException extends Error {
	public peerId: string;

	public constructor(message: string, peerId: string) {
		super(message);
		this.name = 'RPCResponseException';
		this.peerId = peerId;
	}
}

export class InvalidRPCResponseException extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidRPCResponseException';
	}
}

export class RPCResponseAlreadySentException extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'ResponseAlreadySentError';
	}
}

export class InvalidPeerException extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidPeerException';
	}
}

export class RequestFailException extends Error {
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
		this.name = 'RequestFailException';
		// The request was made and the peer responded with error
		this.response = response || new Error(message);
		this.peerId = peerId || '';
		this.peerVersion = peerVersion || '';
		this.message = peerId
			? `${this.message}: Peer Id: ${this.peerId}: Peer Version: ${
					this.peerVersion
			  }`
			: message;
	}
}

export class SendFailException extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'SendFailException';
	}
}

export class InvalidRPCRequestException extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidRPCRequestException';
	}
}

export class InvalidProtocolMessageException extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidProtocolMessageException';
	}
}
