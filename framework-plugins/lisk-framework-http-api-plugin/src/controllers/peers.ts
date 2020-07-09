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
import { Request, Response, NextFunction } from 'express';
import { isUInt32, isString } from '@liskhq/lisk-validator';
import { BaseChannel } from 'lisk-framework';

export enum PeerState {
	connected = 'connected',
	disconnected = 'disconnected',
}

interface PeerInfo {
	readonly ipAddress: string;
	readonly port: number;
	readonly networkId: string;
	readonly networkVersion: string;
	readonly nonce: string;
	readonly options: { [key: string]: unknown };
}

const filterPeers = (
	peers: ReadonlyArray<PeerInfo>,
	limit: number,
	offset: number,
): ReadonlyArray<PeerInfo> => {
	if (offset === 0) {
		return peers.slice(0, Math.min(limit, peers.length));
	}

	return peers.slice(offset, Math.min(limit + offset, peers.length));
};

export const getPeers = (channel: BaseChannel) => async (
	req: Request,
	res: Response,
	_next: NextFunction,
): Promise<void> => {
	const { limit = 100, offset = 0, state = PeerState.connected } = req.query;

	if (
		!isUInt32(Number(limit)) ||
		!isUInt32(Number(offset)) ||
		!isString(state) ||
		!(state === PeerState.connected || state === PeerState.disconnected)
	) {
		res.status(400).send({
			errors: [
				{
					message:
						'Invalid param value(s), limit and offset should be a valid number and state can be either "connected" or "disconnected"',
				},
			],
		});
		return;
	}

	try {
		let peers;
		if (state === PeerState.disconnected) {
			peers = await channel.invoke<ReadonlyArray<PeerInfo>>('app:getDisconnectedPeers');
		} else {
			peers = await channel.invoke<ReadonlyArray<PeerInfo>>('app:getConnectedPeers');
		}

		peers = filterPeers(peers, +limit, +offset);

		res.status(200).send(peers);
	} catch (err) {
		res.status(500).send({
			errors: [
				{ message: `Something went wrong while fetching peers list: ${(err as Error).message}` },
			],
		});
	}
};
