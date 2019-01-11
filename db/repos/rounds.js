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

const sql = require('../sql').rounds;

/**
 * Rounds database interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires db/sql
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a RoundsRepository
 */
class RoundsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
	}

	/**
	 * Drop the table for round snapshot.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	clearRoundSnapshot() {
		return this.db.none(sql.clearRoundSnapshot);
	}

	/**
	 * Create table for the round snapshot.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	performRoundSnapshot() {
		return this.db.none(sql.performRoundSnapshot);
	}

	/**
	 * Checks round snapshot availability for particular round.
	 *
	 * @returns {Promise}
	 */
	checkSnapshotAvailability(round) {
		return this.db.oneOrNone(
			sql.checkSnapshotAvailability,
			{ round },
			a => (a ? a.available : null)
		);
	}

	/**
	 * Get number of records from mem_round_snapshot table.
	 *
	 * @returns {Promise}
	 */
	countRoundSnapshot() {
		return this.db.one(sql.countRoundSnapshot, [], a => +a.count);
	}

	/**
	 * Create table for the round snapshot.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 * @todo Add @param tag
	 */
	getDelegatesSnapshot(limit) {
		return this.db.query(sql.getDelegatesSnapshot, [limit]);
	}

	/**
	 * Delete table for votes snapshot.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	clearVotesSnapshot() {
		return this.db.none(sql.clearVotesSnapshot);
	}

	/**
	 * Take a snapshot of the votes by creating table and populating records from votes.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	performVotesSnapshot() {
		return this.db.none(sql.performVotesSnapshot);
	}

	/**
	 * Update accounts from the round snapshot.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	restoreRoundSnapshot() {
		return this.db.none(sql.restoreRoundSnapshot);
	}

	/**
	 * Update votes for account from a snapshot.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	restoreVotesSnapshot() {
		return this.db.none(sql.restoreVotesSnapshot);
	}
}

module.exports = RoundsRepository;
