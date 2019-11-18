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

import { PeerLists } from '../p2p_types';

export const sanitizePeerLists = (
	peerLists: PeerLists,
	nodeIpAddress: string,
): PeerLists => {
	const blacklistedIPs = peerLists.blacklistedIPs.filter(ipAddress => {
		if (ipAddress === nodeIpAddress) {
			return false;
		}

		return true;
	});

	const seeds = peerLists.seeds.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeIpAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	const fixed = peerLists.fixed.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeIpAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	const whitelisted = peerLists.whitelisted.filter(peerInfo => {
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

	const previous = peerLists.previous.filter(peerInfo => {
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
