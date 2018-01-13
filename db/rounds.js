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
 * Rounds database interaction module
 * @memberof module:rounds
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {RoundsRepo}
 */
function RoundsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;
}

var Queries = {
	getMemRounds: new PQ('SELECT "round" FROM mem_round GROUP BY "round"'),

	flush: new PQ('DELETE FROM mem_round WHERE "round" = ($1)::bigint;'),

	truncateBlocks: new PQ('DELETE FROM blocks WHERE "height" > ($1)::bigint;'),

	updateMissedBlocks: function (backwards) {
		return [
			'UPDATE mem_accounts SET "missedblocks" = "missedblocks"',
			(backwards ? '- 1' : '+ 1'),
			'WHERE "address" IN ($1:csv);'
		].join(' ');
	},

	getVotes: new PQ('SELECT d."delegate", d."amount" FROM (SELECT m."delegate", SUM(m."amount") AS "amount", "round" FROM mem_round m GROUP BY m."delegate", m."round") AS d WHERE "round" = ($1)::bigint'),

	updateVotes: new PQ('UPDATE mem_accounts SET "vote" = "vote" + ($1)::bigint WHERE "address" = $2;'),

	updateBlockId: new PQ('UPDATE mem_accounts SET "blockId" = $1 WHERE "blockId" = $2;'),

	summedRound: PQ('SELECT SUM(r.fee)::bigint AS "fees", ARRAY_AGG(r.reward) AS rewards, ARRAY_AGG(r.pk) AS delegates FROM (SELECT b."totalFee" AS fee, b.reward, ENCODE(b."generatorPublicKey", \'hex\') AS pk FROM blocks b WHERE CEIL(b.height / ($1)::float)::int = $2 ORDER BY b.height ASC) r;'),

	clearRoundSnapshot: 'DROP TABLE IF EXISTS mem_round_snapshot',

	performRoundSnapshot: 'CREATE TABLE mem_round_snapshot AS TABLE mem_round',

	restoreRoundSnapshot: 'INSERT INTO mem_round SELECT * FROM mem_round_snapshot',

	clearVotesSnapshot: 'DROP TABLE IF EXISTS mem_votes_snapshot',

	performVotesSnapshot: 'CREATE TABLE mem_votes_snapshot AS SELECT address, "publicKey", vote FROM mem_accounts WHERE "isDelegate" = 1',

	restoreVotesSnapshot: 'UPDATE mem_accounts m SET vote = b.vote FROM mem_votes_snapshot b WHERE m.address = b.address'
};

/**
 * Get round information from mem tables
 * @return {Promise}
 */
RoundsRepo.prototype.getMemRounds = function () {
	return this.db.query(Queries.getMemRounds);
};

/**
 * Remove a particular round from database
 * @param {string} round - Id of the round
 * @return {Promise}
 */
RoundsRepo.prototype.flush = function (round) {
	return this.db.none(Queries.flush, [round]);
};

// TODO: Move usage of RoundsRepo#truncateBlocks to db/blocks
/**
 * Delete all blocks above a particular height
 * @param {int} height
 * @return {Promise}
 */
RoundsRepo.prototype.truncateBlocks = function (height) {
	return this.db.none(Queries.truncateBlocks, [height]);
};

/**
 * Update the missedblocks attribute for an account
 * @param {boolean} backwards - Backward flag
 * @param {string} outsiders - Comma separated string of ids
 * @return {*}
 */
RoundsRepo.prototype.updateMissedBlocks = function (backwards, outsiders) {
	return this.db.none(Queries.updateMissedBlocks(backwards), [outsiders]);
};

// TODO: Move usage of RoundsRepo#getVotes to db/votes
/**
 * Get votes for a round
 * @param {string} round - Id of the round
 * @return {Promise}
 */
RoundsRepo.prototype.getVotes = function (round) {
	return this.db.query(Queries.getVotes, [round]);
};

// TODO: Move usage of RoundsRepo#updateVotes to db/votes
/**
 * Update the votes of for a particular account
 * @param {string} address - Address of the account
 * @param {int} amount - Votes to update
 */
RoundsRepo.prototype.updateVotes = function (address, amount) {
	return this.db.none(Queries.updateVotes, [amount, address]);
};

// TODO: Move usage of RoundsRepo#updateBlockId to db/accounts
/**
 * Update id of a particular block for an account
 * @param {string} newId
 * @param {string} oldId
 * @return {Promise}
 */
RoundsRepo.prototype.updateBlockId = function (newId, oldId) {
	return this.db.none(Queries.updateBlockId, [newId, oldId]);
};

/**
 * Summarize the results for a round
 * @param {string} round - Id of the round
 * @param {int} activeDelegates - Number of active delegates
 * @return {Promise}
 */
RoundsRepo.prototype.summedRound = function (round, activeDelegates) {
	return this.db.query(Queries.summedRound, [activeDelegates, round]);
};

/**
 * Drop the table for round snapshot
 * @return {Promise}
 */
RoundsRepo.prototype.clearRoundSnapshot = function () {
	return this.db.none(Queries.clearRoundSnapshot);
};

/**
 * Create table for the round snapshot
 * @return {Promise}
 */
RoundsRepo.prototype.performRoundSnapshot = function () {
	return this.db.none(Queries.performRoundSnapshot);
};

/**
 * Delete table for votes snapshot
 * @return {Promise}
 */
RoundsRepo.prototype.clearVotesSnapshot = function () {
	return this.db.none(Queries.clearVotesSnapshot);
};

/**
 * Take a snapshot of the votes by creating table and populating records from votes
 * @return {Promise}
 */
RoundsRepo.prototype.performVotesSnapshot = function () {
	return this.db.none(Queries.restoreRoundSnapshot);
};

/**
 * Update accounts from the round snapshot
 * @return {Promise}
 */
RoundsRepo.prototype.restoreRoundSnapshot = function () {
	return this.db.none(Queries.performVotesSnapshot);
};

/**
 * Update votes for account from a snapshot
 * @return {Promise}
 */
RoundsRepo.prototype.restoreVotesSnapshot = function () {
	return this.db.none(Queries.restoreVotesSnapshot);
};

module.exports = RoundsRepo;
