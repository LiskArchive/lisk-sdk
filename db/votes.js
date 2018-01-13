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
 * Votes database interaction module
 * @memberof module:accounts
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {VotesRepo}
 */
function VotesRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.sortFields = [
		'username',
		'address',
		'publicKey'
	];
}

var Queries = {
	getVotes: new PQ('SELECT "dependentId" FROM mem_accounts2delegates WHERE "accountId" = $1 LIMIT $2 OFFSET $3'),

	getVotesCount: new PQ('SELECT COUNT("dependentId") AS "votesCount" FROM mem_accounts2delegates WHERE "accountId" = $1')
};

/**
 * Search votes for delegate with an address
 * @param {Object} params
 * @param {string} params.address
 * @param {int} params.limit
 * @param {int} params.offset
 * @return {Promise}
 */
VotesRepo.prototype.list = function (params) {
	return this.db.query(Queries.getVotes, [params.address, params.limit, params.offset]);
};

/**
 * Count votes for a delegate with an address
 * @param {string} address
 * @return {Promise}
 */
VotesRepo.prototype.count = function (address) {
	return this.db.one(Queries.getVotesCount, [address]).then(function (result) {
		return result.votesCount;
	});
};

module.exports = VotesRepo;
