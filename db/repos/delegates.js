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

const sql = require('../sql').delegates;

/**
 * Delegates database interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires db/sql
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a DelegatesRepository
 */
class DelegatesRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
	}

	/**
	 * Inserts a fork data table entry.
	 *
	 * @param {Object} fork
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	insertFork(fork) {
		return this.db.none(sql.insertFork, fork);
	}

	/**
	 * Gets delegates for a list of public keys.
	 *
	 * @param {string} publicKeys - Comma Separated list of public keys
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	getDelegatesByPublicKeys(publicKeys) {
		return this.db.any(sql.getDelegatesByPublicKeys, { publicKeys });
	}

	/**
	 * Counts duplicate delegates by transactionId.
	 *
	 * @returns {Promise<number>}
	 * @todo Add description for the return value
	 */
	countDuplicatedDelegates() {
		return this.db.one(sql.countDuplicatedDelegates, [], a => +a.count);
	}
}

// TODO: Move DelegatesRepository#insertFork into a separate db repo

module.exports = DelegatesRepository;
