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
import { valid as isValidVersion } from 'semver';
import { isAlpha, isIP, isNumeric, isPort } from 'validator';
import { InvalidPeer } from './errors';
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

export const checkForValidPeerAddress = (
	ip: string,
	wsPort: string,
): boolean => {
	if ((!isIP(ip, IPV4_NUMBER) && !isIP(ip, IPV6_NUMBER)) || !isPort(wsPort)) {
		return false;
	}

	return true;
};

export const instantiatePeerFromResponse = (peer: unknown): PeerConfig => {
	if (!peer) {
		throw new InvalidPeer(`Invalid peer object`);
	}

	// TODO: We will use the ProtocolPeerInfo from p2p_types.ts which is similar to RawPeerObject
	const rawPeer = peer as RawPeerObject;

	if (
		!rawPeer.ip ||
		!rawPeer.wsPort ||
		!checkForValidPeerAddress(rawPeer.ip, rawPeer.wsPort)
	) {
		throw new InvalidPeer(`Invalid peer ip or port`);
	}

	if (!rawPeer.version || !isValidVersion(rawPeer.version)) {
		throw new InvalidPeer(`Invalid peer version`);
	}

	const version = rawPeer.version;
	const wsPort = +rawPeer.wsPort;
	const os = rawPeer.os && isAlpha(rawPeer.os.toString()) ? rawPeer.os : '';
	const id = `${rawPeer.ip}:${rawPeer.wsPort}`;
	const height =
		rawPeer.height && isNumeric(rawPeer.height.toString())
			? +rawPeer.height
			: 0;

	const peerConfig: PeerConfig = {
		ipAddress: rawPeer.ip,
		wsPort,
		height,
		id,
		os,
		version,
	};

	return peerConfig;
};
