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
 * Delegates database interaction module
 * @memberof module:delegates
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {DappsRepo}
 */
function DelegatesRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;
}

var DelegatesSql = {
	countDuplicatedDelegates: 'WITH duplicates AS (SELECT COUNT(1) FROM delegates GROUP BY "transactionId" HAVING COUNT(1) > 1) SELECT count(1) FROM duplicates',

	insertFork: new PQ('INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES ($1, $2, $3, $4, $5, $6)'),

	getDelegatesByPublicKeys: 'SELECT ENCODE("publicKey", \'hex\') as "publicKey", username, address FROM mem_accounts WHERE "isDelegate" = 1 AND ENCODE("publicKey", \'hex\') IN ($1:csv) ORDER BY vote ASC, "publicKey" DESC'
};

/**
 * Count duplicate delegates by transactionId
 * @return {Promise}
 */
DelegatesRepo.prototype.countDuplicatedDelegates = function () {
	return this.db.query(DelegatesSql.countDuplicatedDelegates);
};

// TODO: Move DelegatesRepo#insertFork to a seperate db repos
/**
 * Insert a fork data table entry
 * @param {Object} fork
 * @return {promise}
 */
DelegatesRepo.prototype.insertFork = function (fork) {
	return this.db.none(DelegatesSql.insertFork, [fork.delegatePublicKey, fork.blockTimestamp, fork.blockId, fork.blockHeight, fork.previousBlock, fork.cause]);
};

/**
 * Get delegates for list of public keys
 * @param {string} publicKeys - Comma Separated list of public keys
 * @return {Promise}
 */
DelegatesRepo.prototype.getDelegatesByPublicKeys = function (publicKeys) {
	return this.db.query(DelegatesSql.getDelegatesByPublicKeys, [publicKeys]);
};

module.exports = DelegatesRepo;
