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
import { Peer } from '../../src/peer';
import { P2PPeerInfo } from '../../src/p2p_types';

export const initializePeerInfoList = (): ReadonlyArray<P2PPeerInfo> => {
	const peerOption1: P2PPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
	};

	const peerOption2: P2PPeerInfo = {
		ipAddress: '127.0.0.1',
		wsPort: 5002,
		height: 545981,
	};

	const peerOption3: P2PPeerInfo = {
		ipAddress: '18.28.48.1',
		wsPort: 5008,
		height: 645980,
	};

	const peerOption4: P2PPeerInfo = {
		ipAddress: '192.28.138.1',
		wsPort: 5006,
		height: 645982,
	};

	const peerOption5: P2PPeerInfo = {
		ipAddress: '178.21.90.199',
		wsPort: 5001,
		height: 645980,
	};

	return [peerOption1, peerOption2, peerOption3, peerOption4, peerOption5];
};

export const initializePeerList = (): ReadonlyArray<Peer> =>
	initializePeerInfoList().map((peerInfo: P2PPeerInfo) => new Peer(peerInfo));
