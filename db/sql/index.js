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

const { link } = require('./config');

module.exports = {
	accounts: {
		resetMemoryTables: link('accounts/reset_memory_tables.sql'),
		countMemAccounts: link('accounts/count_mem_accounts.sql'),
		updateMemAccounts: link('accounts/update_mem_accounts.sql'),
		getOrphanedMemAccounts: link('accounts/get_orphaned_mem_accounts.sql'),
		getDelegates: link('accounts/get_delegates.sql'),
		incrementAccount: link('accounts/increment_account.sql'),
		decrementAccount: link('accounts/decrement_account.sql'),
		removeAccountDependencies: link('accounts/remove_account_dependencies.sql'),
		columnDelegates: link('accounts/column_delegates.sql'),
		columnUDelegates: link('accounts/column_u_delegates.sql'),
		columnMultisignatures: link('accounts/column_multisignatures.sql'),
		columnUMultisignatures: link('accounts/column_u_multisignatures.sql'),
		columnRank: link('accounts/column_rank.sql'),
	},
	blocks: {
		aggregateBlocksReward: link('blocks/aggregate_blocks_reward.sql'),
		count: link('blocks/count.sql'),
		deleteBlock: link('blocks/delete_block.sql'),
		getGenesisBlock: link('blocks/get_genesis_block.sql'),
		getGenesisBlockId: link('blocks/get_genesis_block_id.sql'),
		getIdSequence: link('blocks/get_id_sequence.sql'),
		loadBlocksOffset: link('blocks/load_blocks_offset.sql'),
		loadLastBlock: link('blocks/load_last_block.sql'),
		loadLastNBlockIds: link('blocks/load_last_n_block_ids.sql'),
		blockExists: link('blocks/block_exists.sql'),
		deleteAfterBlock: link('blocks/delete_after_block.sql'),
		getBlocksForTransport: link('blocks/get_blocks_for_transport.sql'),
		getHeightByLastId: link('blocks/get_height_by_last_id.sql'),
		getCommonBlock: link('blocks/get_common_block.sql'),
	},
	dapps: {
		countByOutTransactionId: link('dapps/count_by_out_transaction_id.sql'),
		countByTransactionId: link('dapps/count_by_transaction_id.sql'),
		getExisting: link('dapps/get_existing.sql'),
		getGenesis: link('dapps/get_genesis.sql'),
		list: link('dapps/list.sql'),
	},
	delegates: {
		countDuplicatedDelegates: link('delegates/count_duplicated_delegates.sql'),
		getDelegatesByPublicKeys: link(
			'delegates/get_delegates_by_public_keys.sql'
		),
		insertFork: link('delegates/insert_fork.sql'),
	},
	multisignatures: {
		getMemberPublicKeys: link('multisignatures/get_member_public_keys.sql'),
		getGroupIds: link('multisignatures/get_group_ids.sql'),
	},
	migrations: {
		getLastId: link('migrations/get_last_id.sql'),
		add: link('migrations/add.sql'),
		memoryTables: link('migrations/memory_tables.sql'),
		runtime: link('migrations/runtime.sql'),
		underscorePatch: link('migrations/underscore_patch.sql'),
	},
	peers: {
		list: link('peers/list.sql'),
		clear: link('peers/clear.sql'),
	},
	rounds: {
		getVotes: link('rounds/get_votes.sql'),
		updateVotes: link('rounds/update_votes.sql'),
		updateMissedBlocks: link('rounds/update_missed_blocks.sql'),
		updateBlockId: link('rounds/update_blockId.sql'),
		summedRound: link('rounds/summed_round.sql'),
		clearRoundSnapshot: link('rounds/clear_round_snapshot.sql'),
		performRoundSnapshot: link('rounds/perform_round_snapshot.sql'),
		restoreRoundSnapshot: link('rounds/restore_round_snapshot.sql'),
		clearVotesSnapshot: link('rounds/clear_votes_snapshot.sql'),
		performVotesSnapshot: link('rounds/perform_votes_snapshot.sql'),
		restoreVotesSnapshot: link('rounds/restore_votes_snapshot.sql'),
		getMemRounds: link('rounds/get_mem_rounds.sql'),
		flush: link('rounds/flush.sql'),
		truncateBlocks: link('rounds/truncate_blocks.sql'),
		getDelegatesSnapshot: link('rounds/get_delegates_snapshot.sql'),
		insertRoundInformationWithAmount: link(
			'rounds/insert_round_information_with_amount.sql'
		),
		insertRoundInformationWithDelegate: link(
			'rounds/insert_round_information_with_delegate.sql'
		),
	},
	votes: {
		getVotes: link('votes/get_votes.sql'),
		getVotesCount: link('votes/get_votes_count.sql'),
	},
	voters: {
		getVoters: link('voters/get_voters.sql'),
		getVotersCount: link('voters/get_voters_count.sql'),
	},
};
