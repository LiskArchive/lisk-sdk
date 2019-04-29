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
/* tslint:disable: max-classes-per-file */
import * as VError from 'verror';

export class PeerInboundHandshakeError extends VError {
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

export class PeerOutboundConnectionError extends VError {
	public statusCode?: number;

	public constructor(
		message: string,
		statusCode?: number,
	) {
		super(message);
		this.name = 'PeerOutboundConnectError';
		this.statusCode = statusCode;
	}
}

export class NotEnoughPeersError extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'NotEnoughPeersError';
	}
}

export class RPCResponseError extends VError {
	public peerIp: string;
	public peerPort: number;

	public constructor(
		message: string,
		cause: Error,
		peerIp: string,
		peerPort: number,
	) {
		super(cause, message);
		this.name = 'RPCResponseError';
		this.peerIp = peerIp;
		this.peerPort = peerPort;
	}
}

export class FetchPeerStatusError extends VError {
	public constructor(message: string, cause: Error) {
		super(cause, message);
		this.name = 'FetchPeerStatusError';
	}
}

export class InvalidRPCResponseError extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidRPCResponseError';
	}
}

export class RPCResponseAlreadySentError extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'ResponseAlreadySentError';
	}
}

export class InvalidPeerError extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidPeerError';
	}
}

export class RequestFailError extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'RequestFailError';
	}
}

export class InvalidRPCRequestError extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidRPCRequestError';
	}
}

export class InvalidProtocolMessageError extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidProtocolMessageError';
	}
}
