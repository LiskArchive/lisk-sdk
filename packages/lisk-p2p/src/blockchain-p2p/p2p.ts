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
import {
	INetworkStatus,
	IP2PMessagePacket,
	IP2PNodeStatus,
	IP2PPenalty,
	IP2PRequestPacket,
	IP2PResponsePacket,
} from './p2p_types';
import { Peer } from './peer';
/* tslint:disable:interface-name readonly-keyword no-empty-interface no-let no-unused-expression */

export interface IPeerReturnType {
	readonly options: IPeerOptions;
	readonly peers: ReadonlyArray<Peer>;
}
export interface IPeerOptions {
	readonly [key: string]: string | number;
}

export class BlockchainP2P {
	public applyPenalty = (penalty: IP2PPenalty): void => {
		// TODO
		penalty;
	};
	// TODO
	public getNetworkStatus = (): INetworkStatus => true;
	// TODO
	public getNodeStatus = (): IP2PNodeStatus => true;
	// TODO
	public request = async (
		packet: IP2PRequestPacket,
	): Promise<IP2PResponsePacket> => {
		const response = packet;

		return Promise.resolve(response);
	};

	public send = (message: IP2PMessagePacket): void => {
		message;
		// TODO
	};
	public setNodeStatus = (nodeStatus: IP2PNodeStatus): void => {
		nodeStatus;
		// TODO
	};
	// TODO
	public start = (): PromiseConstructorLike => Promise;
	// TODO
	public stop = (): PromiseConstructorLike => Promise;
}
