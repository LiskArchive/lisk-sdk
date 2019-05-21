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

const path = require('path');

const migrations = [
	path.join(path.dirname(__filename), './sql/20160723182900_create_schema.sql'),
	path.join(path.dirname(__filename), './sql/20160723182901_create_views.sql'),
	path.join(
		path.dirname(__filename),
		'./sql/20160724114255_create_memory_tables.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20160724132825_upcase_memory_table_addresses.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20160725173858_alter_mem_accounts_columns.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20160908120022_add_virgin_column_to_mem_accounts.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20160908215531_protect_mem_accounts_columns.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20161007153817_create_memory_table_indexes.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170124071600_recreate_trs_list_view.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170319001337_create_indexes.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170321001337_create_rounds_fees_table.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170328001337_recreate_trs_list_view.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170403001337_calculate_blocks_rewards.sql'
	),
	path.join(path.dirname(__filename), './sql/20170408001337_create_index.sql'),
	path.join(
		path.dirname(__filename),
		'./sql/20170422001337_recreate_calculate_blocks_rewards.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170428001337_recreate_trs_lisk_view.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170614155841_unique_delegates_constraint.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170921105500_recreate_revert_mem_account_trigger.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20171207000006_create_transfer_trs_table.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20171207000007_recreate_full_block_list_view.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180205000001_drop_rewards_related_functions.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180205000003_create_rounds_rewards_table.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180205000004_apply_round_exception_mainnet.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180214164336_change_case_for_blocks_columns_in_mem_accounts.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180227120000_enforce_uppercase_trs_recipienId.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180419001337_alter_mem_blockid_column.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180423001337_remove_virgin_column.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180503114500_add_row_id_to_trs_list_view.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180814001337_add_indexes_for_trs_table.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180901001337_recreate_full_blocks_list_view.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180903001337_rename_rate_to_rank_in_delegates.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20181023001337_change_round_type_in_mem_rounds.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20181106000001_remove_duplicate_rows_and_add_unique_constraint_in_dapps.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20181106000002_remove_duplicate_rows_and_add_unique_constraint_in_votes.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20181106000003_remove_duplicate_rows_and_add_unique_constraint_in_transfer.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20181106000004_remove_duplicate_rows_and_add_unique_constraint_in_intransfer.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20181106000005_remove_duplicate_rows_and_add_unique_constraint_in_multisignatures.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190104000001_add_recipient_public_key_to_full_block_list.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190204170819_migrate_trs_dependant_tables_to_trs_trable.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190313102300_drop_blocks_list_and_trs_list_views.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190319111600_remove_unconfirmed_state.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190319111700_remove_unconfirmed_state_from_mem_accounts_trigger.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190410112400_add_asset_field_mem_accounts.sql'
	),
];

module.exports = {
	migrations,
};
