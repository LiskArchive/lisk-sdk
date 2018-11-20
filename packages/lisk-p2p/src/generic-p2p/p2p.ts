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
/* tslint:disable:interface-name no-unused-expression */
import {
	INetworkStatus,
	IP2P,
	IP2PMessagePacket,
	IP2PNodeStatus,
	IP2PPenalty,
	IP2PRequestPacket,
	IP2PResponsePacket,
} from './p2p_types';

import { Peer } from './peer';

export interface IPeerReturnType {
	readonly options: IPeerOptions;
	readonly peers: ReadonlyArray<Peer>;
}
export interface IPeerOptions {
	readonly [key: string]: string | number;
}

export abstract class P2P implements IP2P {
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
	public abstract selectPeers(
		peers: ReadonlyArray<Peer>,
		options: IPeerOptions,
	): IPeerReturnType;

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
