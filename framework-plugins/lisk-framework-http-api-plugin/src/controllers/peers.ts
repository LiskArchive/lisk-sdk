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
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { BaseChannel } from 'lisk-framework';
import { paginateList } from '../utils';

const getPeerSchema = {
	type: 'object',
	properties: {
		limit: {
			type: 'string',
			format: 'uint32',
			description: 'Number of peers to be returned',
		},
		offset: {
			type: 'string',
			format: 'uint32',
			description: 'Offset to get peers after a specific point in a peer list',
		},
		state: {
			type: 'string',
			enum: ['connected', 'disconnected'],
		},
	},
};

enum PeerState {
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

export const getPeers = (channel: BaseChannel) => async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const errors = validator.validate(getPeerSchema, req.query);

	// 400 - Malformed query or parameters
	if (errors.length) {
		res.status(400).send({
			errors: [{ message: new LiskValidationError([...errors]).message }],
		});
		return;
	}
	const { limit = 100, offset = 0, state = PeerState.connected } = req.query;

	try {
		let peers;
		if (state === PeerState.disconnected) {
			peers = await channel.invoke<ReadonlyArray<PeerInfo>>('app:getDisconnectedPeers');
		} else {
			peers = await channel.invoke<ReadonlyArray<PeerInfo>>('app:getConnectedPeers');
		}

		res.status(200).send({
			meta: { count: peers.length, limit: +limit, offset: +offset },
			data: paginateList(peers, +limit, +offset),
		});
	} catch (err) {
		next(err);
	}
};
