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
import { Peer, PeerConfig } from './peer';
import { checkIncomingPeerValues } from './validators';

interface RawPeerObject {
	readonly height: string | number;
	readonly ip: string;
	readonly os?: string;
	readonly version?: string;
	readonly wsPort: string | number;
}

export const instantiatePeerFromResponse = (peer: unknown): boolean | Peer => {
	if (checkIncomingPeerValues(peer)) {
		const rawPeer = peer as RawPeerObject;
		const peerConfig: PeerConfig = {
			ipAddress: rawPeer.ip,
			wsPort: +rawPeer.wsPort,
			height: +rawPeer.height,
			id: `${rawPeer.ip}:${rawPeer.wsPort}`,
			os: typeof rawPeer.os === 'string' ? rawPeer.os : '',
			version: typeof rawPeer.version === 'string' ? rawPeer.version : '',
		};

		return new Peer(peerConfig);
	}

	return false;
};
