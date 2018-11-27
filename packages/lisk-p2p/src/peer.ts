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
/* tslint:disable:interface-name */
import { PeerState } from './p2p_types';

// TODO: Use to create outbound socket connection inside peer object.
// TODO: const socketClusterClient = require('socketcluster-client');

export interface PeerConfig {
	readonly clock?: Date;
	readonly height: number;
	readonly id: string;
	/* tslint:disable:next-line: no-any */
	readonly inboundSocket?: any; // TODO: Type SCServerSocket
	readonly ipAddress: string;
	readonly os?: string;
	readonly version?: string;
	readonly wsPort: number;
}

export class Peer {
	public height: number;
	public readonly id: string;
	public readonly inboundSocket: any;
	public readonly ipAddress: string;
	public readonly wsPort: number;

	public constructor(peerConfig: PeerConfig) {
		this.id = peerConfig.id;
		this.ipAddress = peerConfig.ipAddress;
		this.wsPort = peerConfig.wsPort;
		this.inboundSocket = peerConfig.inboundSocket;
		this.height = peerConfig.height;
	}
	// TODO: Return BANNED when appropriate.
	public get state(): PeerState {
		if (this.inboundSocket.state === this.inboundSocket.OPEN) {
			return PeerState.CONNECTED;
		}

		return PeerState.DISCONNECTED;
	}
}
