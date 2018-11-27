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
import { PeerConfig, Peer } from '../../src';

export const initializePeerList = (): ReadonlyArray<Peer> => {
	const peerOption1: PeerConfig = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		id: '12.12.12.12:5001',
	};

	const peerOption2: PeerConfig = {
		ipAddress: '127.0.0.1',
		wsPort: 5002,
		height: 545981,
		id: '127.0.0.1:5002',
	};
	const peerOption3: PeerConfig = {
		ipAddress: '18.28.48.1',
		wsPort: 5008,
		height: 645980,
		id: '18.28.48.1:5008',
	};
	const peerOption4: PeerConfig = {
		ipAddress: '192.28.138.1',
		wsPort: 5006,
		height: 645982,
		id: '192.28.138.1:5006',
	};
	const peer1 = new Peer(peerOption1);
	const peer2 = new Peer(peerOption2);
	const peer3 = new Peer(peerOption3);
	const peer4 = new Peer(peerOption4);

	return [peer1, peer2, peer3, peer4];
};
