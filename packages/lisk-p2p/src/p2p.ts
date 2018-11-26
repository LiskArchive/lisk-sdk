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
	NetworkStatus,
	P2PMessagePacket,
	P2PNodeStatus,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';
/* tslint:disable: no-unused-expression */

export class P2P {
	// TODO
	public getNetworkStatus = (): NetworkStatus => true;
	// TODO
	public getNodeStatus = (): P2PNodeStatus => true;
	// TODO
	public request = async (
		packet: P2PRequestPacket,
	): Promise<P2PResponsePacket> => {
		const response = packet;

		return Promise.resolve(response);
	};

	public send = (message: P2PMessagePacket): void => {
		message;
		// TODO
	};
	public setNodeStatus = (nodeStatus: P2PNodeStatus): void => {
		nodeStatus;
		// TODO
	};
	// TODO
	public start = (): PromiseConstructorLike => Promise;
	// TODO
	public stop = (): PromiseConstructorLike => Promise;
}
