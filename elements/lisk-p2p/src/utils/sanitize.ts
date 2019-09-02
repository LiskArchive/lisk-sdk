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
import { P2PPeerInfo, PeerLists, ProtocolPeerInfo } from '../p2p_types';

export const sanitizeIncomingPeerInfo = (
	peerInfo: ProtocolPeerInfo,
): P2PPeerInfo => {
	const { ip, ...restOfPeerInfo } = peerInfo;

	return {
		ipAddress: ip,
		...restOfPeerInfo,
	};
};

export const sanitizeOutgoingPeerInfo = (
	peerInfo: P2PPeerInfo,
): ProtocolPeerInfo => {
	const { ipAddress, ...restOfPeerInfo } = peerInfo;

	return {
		ip: ipAddress,
		...restOfPeerInfo,
	};
};

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

		if (
			fixedPeers
				.map(constructPeerIdFromPeerInfo)
				.includes(constructPeerIdFromPeerInfo(peerInfo))
		) {
			return false;
		}

		if (
			seedPeers
				.map(constructPeerIdFromPeerInfo)
				.includes(constructPeerIdFromPeerInfo(peerInfo))
		) {
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
