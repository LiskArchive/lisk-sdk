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
import { BaseChannel } from 'lisk-framework';
import { BlockPropagationStats, PeerInfo, SharedState } from '../types';

interface BlockStats {
	readonly blocks: Record<string, BlockPropagationStats>;
	readonly averageReceivedBlocks: number;
	readonly connectedPeers: number;
}

const getAverageReceivedBlocks = (blocks: { [key: string]: BlockPropagationStats }) => {
	let totalCount = 0;

	for (const blockStat of Object.values(blocks)) {
		totalCount += blockStat.count;
	}

	return Object.keys(blocks).length ? totalCount / Object.keys(blocks).length : 0;
};

export const getBlockStats = async (
	channel: BaseChannel,
	state: SharedState,
): Promise<BlockStats> => {
	const connectedPeers = await channel.invoke<ReadonlyArray<PeerInfo>>('app:getConnectedPeers');

	return {
		blocks: state.blocks,
		averageReceivedBlocks: getAverageReceivedBlocks(state.blocks),
		connectedPeers: connectedPeers.length,
	};
};
