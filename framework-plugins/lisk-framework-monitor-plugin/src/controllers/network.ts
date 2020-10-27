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
import { BaseChannel } from 'lisk-framework';
import { PeerInfo } from '../types';

const getMajorityHeight = (peers: PeerInfo[]): { height: number; count: number } => {
	const heightHistogram = {} as { [key: number]: number };
	const majority = {
		height: 0,
		count: 0,
	};
	for (const { options } of peers) {
		const height = options.height as number;
		heightHistogram[height] = heightHistogram[height] + 1 || 1;
		if (heightHistogram[height] > majority.count) {
			majority.count = heightHistogram[height];
			majority.height = height;
		}
	}

	return majority;
};

export const getNetworkStats = (channel: BaseChannel) => async (
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const networkStats: { [key: string]: unknown } = await channel.invoke('app:getNetworkStats');
		const connectedPeers = await channel.invoke('app:getConnectedPeers');
		const majorityHeight = getMajorityHeight(connectedPeers as PeerInfo[]);
		const data = { ...networkStats, majorityHeight };

		res.status(200).json({ data, meta: {} });
	} catch (err) {
		next(err);
	}
};
