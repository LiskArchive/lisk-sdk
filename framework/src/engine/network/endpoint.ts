/*
 * Copyright © 2021 Lisk Foundation
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
import { codec } from '@liskhq/lisk-codec';
import { P2P, p2pTypes } from '@liskhq/lisk-p2p';
import { customNodeInfoSchema } from './schema';

interface InitArgs {
	p2p: P2P;
}

export class Endpoint {
	[key: string]: unknown;
	private _p2p!: P2P;

	public init(args: InitArgs) {
		this._p2p = args.p2p;
	}

	public getConnectedPeers() {
		const peers = this._p2p.getConnectedPeers();

		return peers.map(peer => {
			const parsedPeer = {
				...peer,
				chainID: peer.chainID?.toString('hex') ?? '',
			};

			if (parsedPeer.options) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				parsedPeer.options = codec.toJSON(customNodeInfoSchema, parsedPeer.options);
			}

			return parsedPeer;
		});
	}

	public getDisconnectedPeers() {
		const peers = this._p2p.getDisconnectedPeers();

		return peers.map(peer => {
			const parsedPeer = {
				...peer,
				chainID: peer.chainID?.toString('hex') ?? '',
			};

			if (parsedPeer.options) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				parsedPeer.options = codec.toJSON(customNodeInfoSchema, parsedPeer.options);
			}

			return parsedPeer;
		});
	}

	public getStats(): p2pTypes.NetworkStats {
		return this._p2p.getNetworkStats();
	}
}
