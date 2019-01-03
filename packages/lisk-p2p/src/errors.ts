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
import VError from 'verror';

export class PeerTransportError extends VError {
	public peerId: string;

	public constructor(message: string, peerId: string) {
		super(message);
		this.name = 'PeerTransportError';
		this.peerId = peerId;
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

export class InvalidRPCResponse extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidRPCResponse';
	}
}

export class InvalidPeer extends VError {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidPeer';
	}
}
