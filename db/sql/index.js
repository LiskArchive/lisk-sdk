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

const {link} = require('./config');

module.exports = {
	accounts: {
		// sql to be included
	},
	blocks: {
		aggregateBlocksReward: link('blocks/aggregateBlocksReward.sql'),
		count: link('blocks/count.sql'),
		deleteBlock: link('blocks/deleteBlock.sql'),
		getGenesisBlock: link('blocks/getGenesisBlock.sql'),
		getGenesisBlockId: link('blocks/getGenesisBlockId.sql'),
		getIdSequence: link('blocks/getIdSequence.sql'),
		loadBlocksOffset: link('blocks/loadBlocksOffset.sql'),
		loadLastBlock: link('blocks/loadLastBlock.sql'),
		loadLastNBlockIds: link('blocks/loadLastNBlockIds.sql'),
		blockExists: link('blocks/blockExists.sql'),
		deleteAfterBlock: link('blocks/deleteAfterBlock.sql'),
		getBlocksForTransport: link('blocks/getBlocksForTransport.sql'),
		getHeightByLastId: link('blocks/getHeightByLastId.sql'),
		getCommonBlock: link('blocks/getCommonBlock.sql')
	},
	dapps: {
		countByOutTransactionId: link('dapps/countByOutTransactionId.sql'),
		countByTransactionId: link('dapps/countByTransactionId.sql'),
		getExisting: link('dapps/getExisting.sql'),
		getGenesis: link('dapps/getGenesis.sql'),
		list: link('dapps/list.sql')
	},
	delegates: {
		countDuplicatedDelegates: link('delegates/countDuplicatedDelegates.sql'),
		getDelegatesByPublicKeys: link('delegates/getDelegatesByPublicKeys.sql'),
		insertFork: link('delegates/insertFork.sql')
	},
	multisignatures: {
		getMemberPublicKeys: link('multisignatures/getMemberPublicKeys.sql'),
		getGroupIds: link('multisignatures/getGroupIds.sql')
	},
	migrations: {
		getLastId: link('migrations/getLastId.sql'),
		add: link('migrations/add.sql'),
		memoryTables: link('migrations/memoryTables.sql'),
		runtime: link('migrations/runtime.sql')
	},
	peers: {
		list: link('peers/list.sql'),
		clear: link('peers/clear.sql')
	},
	rounds: {
		getVotes: link('rounds/getVotes.sql'),
		updateVotes: link('rounds/updateVotes.sql'),
		updateMissedBlocks: link('rounds/updateMissedBlocks.sql'),
		updateBlockId: link('rounds/updateBlockId.sql'),
		summedRound: link('rounds/summedRound.sql'),
		clearRoundSnapshot: link('rounds/clearRoundSnapshot.sql'),
		performRoundSnapshot: link('rounds/performRoundSnapshot.sql'),
		restoreRoundSnapshot: link('rounds/restoreRoundSnapshot.sql'),
		clearVotesSnapshot: link('rounds/clearVotesSnapshot.sql'),
		performVotesSnapshot: link('rounds/performVotesSnapshot.sql'),
		restoreVotesSnapshot: link('rounds/restoreVotesSnapshot.sql'),
		getMemRounds: link('rounds/getMemRounds.sql'),
		flush: link('rounds/flush.sql'),
		truncateBlocks: link('rounds/truncateBlocks.sql'),
		getDelegatesSnapshot: link('rounds/getDelegatesSnapshot.sql')
	},
	votes: {
		getVotes: link('votes/getVotes.sql'),
		getVotesCount: link('votes/getVotesCount.sql')
	},
	voters: {
		getVoters: link('voters/getVoters.sql'),
		getVotersCount: link('voters/getVotersCount.sql')
	}
};
