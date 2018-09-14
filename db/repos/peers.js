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

const sql = require('../sql').peers;
const ed = require('../../helpers/ed.js');

const cs = {}; // Reusable ColumnSet objects

/**
 * Peers database interaction class.
 *
 * @class
 * @memberof db.repos
 * @see Parent: {@link db.repos}
 * @requires db/sql
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a PeersRepository
 */
class PeersRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
		this.cs = cs;

		if (!cs.insert) {
			cs.insert = new pgp.helpers.ColumnSet(
				[
					'ip',
					'wsPort',
					'state',
					'height',
					'os',
					'version',
					'clock',
					{
						name: 'broadhash',
						init: c => (c.value ? ed.hexToBuffer(c.value) : null),
					},
				],
				{ table: 'peers' }
			);
		}
	}

	/**
	 * Gets all peers from database.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	list() {
		return this.db.any(sql.list);
	}

	/**
	 * Clears all peers from database.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	clear() {
		return this.db.none(sql.clear);
	}

	/**
	 * Inserts a new peer into database.
	 *
	 * @param {Array} peers - Array of peer objects to be inserted
	 * @returns {Promise<null>}
	 * Resolves with `null` when successfully inserted.
	 */
	insert(peers) {
		const query = () => this.pgp.helpers.insert(peers, cs.insert);
		return this.db.none(query);
	}
}

module.exports = PeersRepository;
