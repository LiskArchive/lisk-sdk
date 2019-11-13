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
 */
import {
	P2PPeerInfo,
	PeerLists,
	ProtocolPeerInfo,
} from '../p2p_types';
import { constructPeerId } from './misc';

export const sanitizeIncomingPeerInfo = (
	rawPeerInfo: unknown,
): P2PPeerInfo | undefined => {
	if (!rawPeerInfo) {
		return undefined;
	}

	const {
		ipAddress,
		wsPort,
		height,
		...restOfPeerInfo
	} = rawPeerInfo as ProtocolPeerInfo;

	return {
		peerId: constructPeerId(ipAddress, wsPort),
		ipAddress,
		wsPort,
		sharedState: {
			height: typeof height === 'number' ? height : 0, // TODO: Remove the usage of height for choosing among peers having same ipAddress, instead use productivity and reputation
			...restOfPeerInfo,
		},
	};
};

export const sanitizeInitialPeerInfo = (peerInfo: ProtocolPeerInfo) => ({
	peerId: constructPeerId(peerInfo.ipAddress, peerInfo.wsPort),
	ipAddress: peerInfo.ipAddress,
	wsPort: peerInfo.wsPort,
});

export const sanitizePeerLists = (
	lists: PeerLists,
	nodeInfo: P2PPeerInfo,
): PeerLists => {
	const blacklistedPeers = lists.blacklistedPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		return true;
	});

	const blacklistedIPs = blacklistedPeers.map(peerInfo => peerInfo.ipAddress);

	const seedPeers = lists.seedPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	const fixedPeers = lists.fixedPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	const whitelisted = lists.whitelisted.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		if (fixedPeers.map(peer => peer.peerId).includes(peerInfo.peerId)) {
			return false;
		}

		if (seedPeers.map(peer => peer.peerId).includes(peerInfo.peerId)) {
			return false;
		}

		return true;
	});

	const previousPeers = lists.previousPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	return {
		blacklistedPeers,
		seedPeers,
		fixedPeers,
		whitelisted,
		previousPeers,
	};
};
