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

const sql = require('../sql').multisignatures;

/**
 * Multisignature database interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires db/sql
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a MultisignaturesRepository
 */
class MultisignaturesRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
	}

	/**
	 * Gets list of public keys for a member address.
	 *
	 * @param {string} address - Address of a member
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	getMemberPublicKeys(address) {
		return this.db.one(
			sql.getMemberPublicKeys,
			{ address },
			a => a.memberAccountKeys
		);
	}

	/**
	 * Gets list of addresses for group by a public key.
	 *
	 * @param {string} publicKey - Public key of a group
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	getGroupIds(publicKey) {
		return this.db.one(sql.getGroupIds, { publicKey }, a => a.groupAccountIds);
	}
}

module.exports = MultisignaturesRepository;
