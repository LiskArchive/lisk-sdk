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
 */
'use strict';

const {load} = require('./config');

module.exports = {
	accounts: {
		// sql to be included
	},
	blocks: {
		aggregateBlocksReward: load('blocks/aggregateBlocksReward.sql'),
		count: load('blocks/count.sql'),
		deleteBlock: load('blocks/deleteBlock.sql'),
		getGenesisBlock: load('blocks/getGenesisBlock.sql'),
		getGenesisBlockId: load('blocks/getGenesisBlockId.sql'),
		getIdSequence: load('blocks/getIdSequence.sql'),
		loadBlocksOffset: load('blocks/loadBlocksOffset.sql'),
		loadLastBlock: load('blocks/loadLastBlock.sql'),
		loadLastNBlock: load('blocks/loadLastNBlock.sql'),
		blockExists: load('blocks/blockExists.sql'),
		deleteAfterBlock: load('blocks/deleteAfterBlock.sql'),
		getBlocksForTransport: load('blocks/getBlocksForTransport.sql'),
		getHeightByLastId: load('blocks/getHeightByLastId.sql'),
		getCommonBlock: load('blocks/getCommonBlock.sql')
	},
	delegates: {
		countDuplicatedDelegates: load('delegates/countDuplicatedDelegates.sql'),
		getDelegatesByPublicKeys: load('delegates/getDelegatesByPublicKeys.sql'),
		insertFork: load('delegates/insertFork.sql')
	},
	peers: {
		// sql to be included
	},
	rounds: {
		getVotes: load('rounds/getVotes.sql'),
		updateVotes: load('rounds/updateVotes.sql'),
		updateBlockId: load('rounds/updateBlockId.sql'),
		summedRound: load('rounds/summedRound.sql'),
		clearRoundSnapshot: load('rounds/clearRoundSnapshot.sql'),
		performRoundSnapshot: load('rounds/performRoundSnapshot.sql'),
		restoreRoundSnapshot: load('rounds/restoreRoundSnapshot.sql'),
		clearVotesSnapshot: load('rounds/clearVotesSnapshot.sql'),
		performVotesSnapshot: load('rounds/performVotesSnapshot.sql'),
		restoreVotesSnapshot: load('rounds/restoreVotesSnapshot.sql'),
		getMemRounds: load('rounds/getMemRounds.sql'),
		flush: load('rounds/flush.sql'),
		truncateBlocks: load('rounds/truncateBlocks.sql'),
		getDelegatesSnapshot: load('rounds/getDelegatesSnapshot.sql')
	}
};
