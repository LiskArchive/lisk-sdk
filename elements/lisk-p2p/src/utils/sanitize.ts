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
import { constructPeerIdFromPeerInfo } from '.';
import {
	P2PNodeInfo,
	P2PPeerInfo,
	P2PSharedState,
	PeerLists,
	ProtocolNodeInfo,
	ProtocolPeerInfo,
} from '../p2p_types';

export const sanitizeIncomingPeerInfo = (
	peerInfo: ProtocolPeerInfo,
): P2PPeerInfo => {
	const { ip, ...restOfPeerInfo } = peerInfo;

	return {
		peerId: constructPeerIdFromPeerInfo(peerInfo.ip, peerInfo.wsPort),
		sharedState: {
			ipAddress: ip,
			...restOfPeerInfo,
		},
	};
};

export const sanitizeOutgoingPeerInfo = (
	peerInfo: P2PPeerInfo,
): ProtocolPeerInfo => {
	const {
		sharedState: { ipAddress, ...restOfPeerInfo },
	} = peerInfo;

	return {
		ip: ipAddress,
		...restOfPeerInfo,
	};
};

export const sanitizePeerLists = (
	lists: PeerLists,
	nodeInfo: P2PSharedState,
): PeerLists => {
	const blacklistedPeers = lists.blacklistedPeers.filter(peerInfo => {
		if (peerInfo.sharedState.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		return true;
	});

	const blacklistedIPs = blacklistedPeers.map(
		peerInfo => peerInfo.sharedState.ipAddress,
	);

	const seedPeers = lists.seedPeers.filter(peerInfo => {
		if (peerInfo.sharedState.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.sharedState.ipAddress)) {
			return false;
		}

		return true;
	});

	const fixedPeers = lists.fixedPeers.filter(peerInfo => {
		if (peerInfo.sharedState.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.sharedState.ipAddress)) {
			return false;
		}

		return true;
	});

	const whitelisted = lists.whitelisted.filter(peerInfo => {
		if (peerInfo.sharedState.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.sharedState.ipAddress)) {
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
		if (peerInfo.sharedState.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.sharedState.ipAddress)) {
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

// Format the node info so that it will be valid from the perspective of both new and legacy nodes.
export const sanitizeNodeInfoToLegacyFormat = (
	nodeInfo: P2PNodeInfo,
): ProtocolNodeInfo => {
	const { httpPort, nonce, broadhash } = nodeInfo;

	return {
		...nodeInfo,
		broadhash: broadhash ? (broadhash as string) : '',
		nonce: nonce ? (nonce as string) : '',
		httpPort: httpPort ? (httpPort as number) : 0,
	};
};
