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
import { Request, Response } from 'express';
import { BaseChannel } from 'lisk-framework';
import { BlockPropagationStats, PeerInfo, SharedState } from '../types';

const getAverageReceivedBlocks = (blocks: { [key: string]: BlockPropagationStats }) => {
	let totalCount = 0;

	for (const blockStat of Object.values(blocks)) {
		totalCount += blockStat.count;
	}

	return totalCount / Object.keys(blocks).length;
};

export const getBlockStats = (channel: BaseChannel, state: SharedState) => async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const connectedPeers = await channel.invoke<ReadonlyArray<PeerInfo>>('app:getConnectedPeers');
	res.status(200).json({
		meta: {},
		data: {
			...state.blocks,
			averageReceivedBlocks: getAverageReceivedBlocks(state.blocks.blocks),
			connectedPeers: connectedPeers.length,
		},
	});
};
