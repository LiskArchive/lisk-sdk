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

var PQ = require('pg-promise').ParameterizedQuery;

/**
 * Voters database interaction module
 * @memberof module:accounts
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {VotersRepo}
 */
function VotersRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.sortFields = [
		'username',
		'address',
		'publicKey'
	];
}

var Queries = {
	getVoters: new PQ('SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" = $1 LIMIT $2 OFFSET $3'),

	getVotersCount: new PQ('SELECT COUNT("accountId") AS "votersCount" FROM mem_accounts2delegates WHERE "dependentId" = $1')
};

/**
 * Search the voters for a delegate with a public Key
 * @param {Object} params
 * @param {string} params.publicKey
 * @param {int} params.limit
 * @param {int} params.offset
 * @return {Promise}
 */
VotersRepo.prototype.list = function (params) {
	return this.db.query(Queries.getVoters, [params.publicKey, params.limit, params.offset]);
};

/**
 * Count voters for a delegate with a public key
 * @param {string} publicKey
 * @return {Promise}
 */
VotersRepo.prototype.count = function (publicKey) {
	return this.db.one(Queries.getVotersCount, [publicKey]).then(function (result) {
		return result.votersCount;
	});
};

module.exports = VotersRepo;
