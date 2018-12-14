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
import { isAlpha, isIP, isNumeric, isPort } from 'validator';
import { InvalidPeerAddress } from './errors';
import { PeerConfig } from './peer';

const IPV4_NUMBER = 4;
const IPV6_NUMBER = 6;

interface RawPeerObject {
	readonly height?: string;
	readonly ip: string;
	readonly os?: string;
	readonly version?: string;
	readonly wsPort: string;
}

export const checkPeerAddress = (peer: unknown): boolean => {
	if (!peer) {
		return false;
	}

	const { ip, wsPort } = peer as RawPeerObject;

	if (!ip || !wsPort) {
		return false;
	}

	if ((!isIP(ip, IPV4_NUMBER) && !isIP(ip, IPV6_NUMBER)) || !isPort(wsPort)) {
		return false;
	}

	return true;
};

export const instantiatePeerFromResponse = (
	peer: unknown,
): PeerConfig | Error => {
	if (!checkPeerAddress(peer)) {
		return new InvalidPeerAddress(`Invalid Peer Ip or Port`);
	}

	const rawPeer = peer as RawPeerObject;

	const os = rawPeer.os && isAlpha(rawPeer.os.toString()) ? rawPeer.os : '';
	const version =
		rawPeer.version && isAlpha(rawPeer.version.toString())
			? rawPeer.version
			: '';
	const id = `${rawPeer.ip}:${rawPeer.wsPort}`;
	const height =
		rawPeer.height && isNumeric(rawPeer.height.toString())
			? +rawPeer.height
			: 1;

	const peerConfig: PeerConfig = {
		ipAddress: rawPeer.ip,
		wsPort: +rawPeer.wsPort,
		height,
		id,
		os,
		version,
	};

	return peerConfig;
};
