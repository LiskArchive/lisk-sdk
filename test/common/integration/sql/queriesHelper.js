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
/* eslint-disable class-methods-use-this */

'use strict';

const path = require('path');
const QueryFile = require('pg-promise').QueryFile;

const { ACTIVE_DELEGATES } = global.constants;

let self;

class Queries {
	constructor(library, db) {
		this.library = library;
		this.db = db;

		this.validateAccountsBalancesQuery = new QueryFile(
			path.join(__dirname, '../sql/rounds/validate_accounts_balances.sql'),
			{ minify: true }
		);

		self = this;
	}

	validateAccountsBalances() {
		return self.db.query(self.validateAccountsBalancesQuery);
	}

	getPostgresVersion() {
		return self.db.query('SELECT version()');
	}

	getAccounts() {
		return self.db.query('SELECT * FROM mem_accounts');
	}

	getAccount(address) {
		return self.db.query(
			'SELECT * FROM mem_accounts WHERE address = ${address}',
			{ address }
		);
	}

	getDelegates() {
		return self.db.query(
			'SELECT * FROM mem_accounts m LEFT JOIN delegates d ON d.username = m.username WHERE d."transactionId" IS NOT NULL'
		);
	}

	getDelegatesOrderedByVote() {
		return self.db.query(
			`SELECT "publicKey", vote FROM mem_accounts ORDER BY vote DESC, "publicKey" ASC LIMIT ${ACTIVE_DELEGATES}`
		);
	}

	getFullBlock(height) {
		return self.db
			.query('SELECT * FROM full_blocks_list WHERE b_height = ${height}', {
				height,
			})
			.then(rows => {
				// Normalize blocks
				return self.library.modules.blocks.utils.readDbRows(rows);
			});
	}

	getAllBlocks() {
		return self.db
			.query('SELECT * FROM full_blocks_list ORDER BY b_height DESC')
			.then(rows => {
				// Normalize blocks
				return self.library.modules.blocks.utils.readDbRows(rows);
			});
	}

	getBlocks(round) {
		return self.db.query(
			'SELECT * FROM blocks WHERE CEIL(height / 101::float)::int = ${round} ORDER BY height ASC',
			{ round }
		);
	}

	getRoundRewards(round) {
		return self.db
			.query(
				'SELECT ENCODE("publicKey", \'hex\') AS "publicKey", SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = ${round} GROUP BY "publicKey"',
				{ round }
			)
			.then(rows => {
				const rewards = {};
				_.each(rows, row => {
					rewards[row.publicKey] = {
						publicKey: row.publicKey,
						fees: row.fees,
						rewards: row.rewards,
					};
				});
				return rewards;
			});
	}

	getVoters() {
		return self.db.query(
			'SELECT "dependentId", ARRAY_AGG("accountId") FROM mem_accounts2delegates GROUP BY "dependentId"'
		);
	}
}

module.exports = Queries;
