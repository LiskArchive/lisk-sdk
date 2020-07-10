/*
 * Copyright © 2020 Lisk Foundation
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

export const generatePeers = (numOfPeers = 200) => {
	const peers = [];
	for (let i = 0; i < numOfPeers; i += 1) {
		peers.push({
			ipAddress: `1.1.1.${i}`,
			port: 1000 + i,
			networkId: 'networkId',
			networVersion: '1.1',
			nonce: `nonce${i}`,
		});
	}

	return peers;
};
