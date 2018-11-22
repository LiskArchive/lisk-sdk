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
/* tslint:disable:interface-name no-empty-interface */

import { IPeerConfig, Peer } from './peer';

export interface IBlockchainPeerConfig extends IPeerConfig {
	readonly height: number;
}

export class BlockchainPeer extends Peer {
	private height: number;

	public constructor(peerConfig: IBlockchainPeerConfig) {
		super(peerConfig);
		this.height = peerConfig.height;
	}

	public getHeight(): number {
		return this.height;
	}
	public setHeight(height: number): void {
		this.height = height;
	}
}
