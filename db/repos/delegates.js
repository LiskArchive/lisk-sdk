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
 * Delegates database interaction module
 * @memberof module:delegates
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {DelegatesRepository}
 */
class DelegatesRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
	}

	/**
	 * Inserts a fork data table entry
	 * @param {Object} fork
	 * @return {Promise}
	 */
	insertFork(fork) {
		return this.db.none(sql.insertFork, fork);
	}

	/**
	 * Gets delegates for a list of public keys
	 * @param {string} publicKeys - Comma Separated list of public keys
	 * @return {Promise}
	 */
	getDelegatesByPublicKeys(publicKeys) {
		return this.db.any(sql.getDelegatesByPublicKeys, { publicKeys });
	}

	/**
	 * Counts duplicate delegates by transactionId.
	 * @return {Promise<number>}
	 */
	countDuplicatedDelegates() {
		return this.db.one(sql.countDuplicatedDelegates, [], a => +a.count);
	}
}

// TODO: Move DelegatesRepository#insertFork into a separate db repo

module.exports = DelegatesRepository;
