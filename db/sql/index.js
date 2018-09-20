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

/**
 * @namespace sql
 * @memberof db
 * @see Parent: {@link db}
 * @property {module:db/sql} SQL
 */

/**
 * Description of the module.
 *
 * @module db/sql
 * @see Parent: {@link db.sql}
 */
module.exports = {
	accounts: {
		resetMemoryTables: link('accounts/reset_memory_tables.sql'),
		updateMemAccounts: link('accounts/update_mem_accounts.sql'),
		getDelegates: link('accounts/get_delegates.sql'),
		incrementAccount: link('accounts/increment_account.sql'),
		decrementAccount: link('accounts/decrement_account.sql'),
		removeAccountDependencies: link('accounts/remove_account_dependencies.sql'),
		columnDelegates: link('accounts/column_delegates.sql'),
		columnUDelegates: link('accounts/column_u_delegates.sql'),
		columnMultisignatures: link('accounts/column_multisignatures.sql'),
		columnUMultisignatures: link('accounts/column_u_multisignatures.sql'),
	},
	blocks: {
		aggregateBlocksReward: link('blocks/aggregate_blocks_reward.sql'),
		count: link('blocks/count.sql'),
		deleteBlock: link('blocks/delete_block.sql'),
		deleteBlocksAfterHeight: link('blocks/delete_blocks_after_height.sql'),
		getGenesisBlock: link('blocks/get_genesis_block.sql'),
		getGenesisBlockId: link('blocks/get_genesis_block_id.sql'),
		getIdSequence: link('blocks/get_id_sequence.sql'),
		loadBlocksOffset: link('blocks/load_blocks_offset.sql'),
		loadLastBlock: link('blocks/load_last_block.sql'),
		loadLastNBlockIds: link('blocks/load_last_n_block_ids.sql'),
		blockExists: link('blocks/block_exists.sql'),
		deleteAfterBlock: link('blocks/delete_after_block.sql'),
		getBlockForTransport: link('blocks/get_block_for_transport.sql'),
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
		runtime: link('migrations/runtime.sql'),
	},
	peers: {
		list: link('peers/list.sql'),
		clear: link('peers/clear.sql'),
	},
	rounds: {
		updateDelegatesRanks: link('rounds/update_delegates_ranks.sql'),
		getVotes: link('rounds/get_votes.sql'),
		updateVotes: link('rounds/update_votes.sql'),
		updateMissedBlocks: link('rounds/update_missed_blocks.sql'),
		summedRound: link('rounds/summed_round.sql'),
		clearRoundSnapshot: link('rounds/clear_round_snapshot.sql'),
		performRoundSnapshot: link('rounds/perform_round_snapshot.sql'),
		restoreRoundSnapshot: link('rounds/restore_round_snapshot.sql'),
		clearVotesSnapshot: link('rounds/clear_votes_snapshot.sql'),
		performVotesSnapshot: link('rounds/perform_votes_snapshot.sql'),
		restoreVotesSnapshot: link('rounds/restore_votes_snapshot.sql'),
		checkSnapshotAvailability: link('rounds/check_snapshot_availability.sql'),
		countRoundSnapshot: link('rounds/count_round_snapshot.sql'),
		getMemRounds: link('rounds/get_mem_rounds.sql'),
		flush: link('rounds/flush.sql'),
		getDelegatesSnapshot: link('rounds/get_delegates_snapshot.sql'),
		insertRoundInformationWithAmount: link(
			'rounds/insert_round_information_with_amount.sql'
		),
		insertRoundInformationWithDelegate: link(
			'rounds/insert_round_information_with_delegate.sql'
		),
		insertRoundRewards: link('rounds/insert_round_rewards.sql'),
		deleteRoundRewards: link('rounds/delete_round_rewards.sql'),
	},
	transactions: {
		count: link('transactions/count.sql'),
		countById: link('transactions/count_by_id.sql'),
		countList: link('transactions/count_list.sql'),
		getDappByIds: link('transactions/get_dapp_by_ids.sql'),
		getDelegateByIds: link('transactions/get_delegate_by_ids.sql'),
		getInTransferByIds: link('transactions/get_in_transfer_by_ids.sql'),
		getMultiByIds: link('transactions/get_multi_by_ids.sql'),
		getOutTransferByIds: link('transactions/get_out_transfer_by_ids.sql'),
		getSignatureByIds: link('transactions/get_signature_by_ids.sql'),
		getTransferByIds: link('transactions/get_transfer_by_ids.sql'),
		getVotesByIds: link('transactions/get_votes_by_ids.sql'),
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
