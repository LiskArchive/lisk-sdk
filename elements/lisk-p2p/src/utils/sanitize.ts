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
	PeerFromConfig,
	PeerLists,
	PeerListsFromConfig,
} from '../p2p_types';

const sanitizePeerFromConfig = (
	peerFromConfig: PeerFromConfig,
): P2PPeerInfo => ({
	id: `${peerFromConfig.ip}:${peerFromConfig.wsPort}`,
	ipAddress: peerFromConfig.ip,
	sharedState: {
		wsPort: peerFromConfig.wsPort,
		advertiseAddress: true,
	},
});

export const sanitizePeerLists = (
	peerListsFromConfig: PeerListsFromConfig,
	nodeIpAddress: string,
): PeerLists => {
	const blacklistedIPs = peerListsFromConfig.blacklistedIPs.filter(
		ipAddress => {
			if (ipAddress === nodeIpAddress) {
				return false;
			}

			return true;
		},
	);

	const seeds = peerListsFromConfig.seeds
		.map(sanitizePeerFromConfig)
		.filter(peerInfo => {
			if (peerInfo.ipAddress === nodeIpAddress) {
				return false;
			}

			if (blacklistedIPs.includes(peerInfo.ipAddress)) {
				return false;
			}

			return true;
		});

	const fixed = peerListsFromConfig.fixed
		.map(sanitizePeerFromConfig)
		.filter(peerInfo => {
			if (peerInfo.ipAddress === nodeIpAddress) {
				return false;
			}

			if (blacklistedIPs.includes(peerInfo.ipAddress)) {
				return false;
			}

			return true;
		});

	const whitelisted = peerListsFromConfig.whitelisted
		.map(sanitizePeerFromConfig)
		.filter(peerInfo => {
			if (peerInfo.ipAddress === nodeIpAddress) {
				return false;
			}

			if (blacklistedIPs.includes(nodeIpAddress)) {
				return false;
			}

			if (fixed.map(peer => peer.id).includes(peerInfo.id)) {
				return false;
			}

			if (seeds.map(peer => peer.id).includes(peerInfo.id)) {
				return false;
			}

			return true;
		});

	const previous = peerListsFromConfig.previous.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeIpAddress) {
			return false;
		}

		if (blacklistedIPs.includes(nodeIpAddress)) {
			return false;
		}

		return true;
	});

	return {
		blacklistedIPs,
		seeds,
		fixed,
		whitelisted,
		previous,
	};
};
