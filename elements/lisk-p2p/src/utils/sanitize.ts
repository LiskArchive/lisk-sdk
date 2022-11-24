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
import { isIPV4 } from '@liskhq/lisk-validator';
import {
	ConnectionKind,
	DEFAULT_PRODUCTIVITY,
	DEFAULT_REPUTATION_SCORE,
	PeerKind,
} from '../constants';
// eslint-disable-next-line import/no-cycle
import {
	P2PEnhancedPeerInfo,
	P2PInternalState,
	P2PPeerInfo,
	PeerLists,
	ProtocolPeerInfo,
	P2PSharedState,
} from '../types';

// eslint-disable-next-line import/no-cycle
import { constructPeerId, getNetgroup } from './network';

export const assignInternalInfo = (peerInfo: P2PPeerInfo, secret: number): P2PInternalState =>
	peerInfo.internalState
		? peerInfo.internalState
		: {
				reputation: DEFAULT_REPUTATION_SCORE,
				netgroup: getNetgroup(peerInfo.ipAddress, secret),
				latency: 0,
				connectTime: Date.now(),
				rpcCounter: new Map<string, number>(),
				rpcRates: new Map<string, number>(),
				messageCounter: new Map<string, number>(),
				messageRates: new Map<string, number>(),
				wsMessageCount: 0,
				wsMessageRate: 0,
				productivity: { ...DEFAULT_PRODUCTIVITY },
				advertiseAddress: true,
				connectionKind: ConnectionKind.NONE,
				peerKind: PeerKind.NONE,
		  };

export const sanitizeIncomingPeerInfo = (peerInfo: ProtocolPeerInfo): P2PPeerInfo => {
	const { ipAddress, port, ...restOfPeerInfo } = peerInfo;

	return {
		peerId: constructPeerId(ipAddress, port),
		ipAddress,
		port,
		sharedState: {
			...(restOfPeerInfo as P2PSharedState),
		},
	};
};

interface SanitizedPeer {
	peerId: string;
	port: number;
	ipAddress: string;
}

export const sanitizeInitialPeerInfo = (peerInfo: ProtocolPeerInfo): SanitizedPeer => ({
	peerId: constructPeerId(peerInfo.ipAddress, peerInfo.port),
	ipAddress: peerInfo.ipAddress,
	port: peerInfo.port,
});

export const sanitizeEnhancedPeerInfo = (peerInfo: P2PEnhancedPeerInfo): P2PPeerInfo => {
	const { dateAdded, numOfConnectionFailures, sourceAddress, bucketId, ...sharedPeerInfo } =
		peerInfo;

	return sharedPeerInfo;
};

export const sanitizePeerLists = (
	lists: PeerLists,
	nodeInfo: P2PPeerInfo,
	secret: number,
): PeerLists => {
	const blacklistedIPs = lists.blacklistedIPs.filter(blacklistedIP => {
		if (blacklistedIP === nodeInfo.ipAddress) {
			return false;
		}

		return true;
	});

	const fixedPeers = lists.fixedPeers
		.filter(peerInfo => {
			if (!isIPV4(peerInfo.ipAddress)) {
				return false;
			}

			if (peerInfo.ipAddress === nodeInfo.ipAddress) {
				return false;
			}

			if (blacklistedIPs.includes(peerInfo.ipAddress)) {
				return false;
			}

			return true;
		})
		.map(peer => {
			const peerInternalInfo = assignInternalInfo(peer, secret);

			return {
				...peer,
				internalState: { ...peerInternalInfo, peerKind: PeerKind.FIXED_PEER },
			};
		});

	const seedPeers = lists.seedPeers
		.filter(peerInfo => {
			if (!isIPV4(peerInfo.ipAddress)) {
				return false;
			}

			if (peerInfo.ipAddress === nodeInfo.ipAddress) {
				return false;
			}

			if (blacklistedIPs.includes(peerInfo.ipAddress)) {
				return false;
			}

			if (fixedPeers.map(peer => peer.peerId).includes(peerInfo.peerId)) {
				return false;
			}

			return true;
		})
		.map(peer => {
			const peerInternalInfo = assignInternalInfo(peer, secret);

			return {
				...peer,
				internalState: { ...peerInternalInfo, peerKind: PeerKind.SEED_PEER },
			};
		});

	const whitelisted = lists.whitelisted
		.filter(peerInfo => {
			if (!isIPV4(peerInfo.ipAddress)) {
				return false;
			}

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
		})
		.map(peer => {
			const peerInternalInfo = assignInternalInfo(peer, secret);

			return {
				...peer,
				internalState: {
					...peerInternalInfo,
					peerKind: PeerKind.WHITELISTED_PEER,
				},
			};
		});

	const previousPeers = lists.previousPeers.filter(peerInfo => {
		if (!isIPV4(peerInfo.ipAddress)) {
			return false;
		}

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

		if (whitelisted.map(peer => peer.peerId).includes(peerInfo.peerId)) {
			return false;
		}

		return true;
	});

	return {
		blacklistedIPs,
		seedPeers,
		fixedPeers,
		whitelisted,
		previousPeers,
	};
};
