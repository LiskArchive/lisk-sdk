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
 * Rounds database interaction module
 * @memberof module:rounds
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {RoundsRepository}
 */
class RoundsRepository {

	constructor (db, pgp) {
		this.db = db;
		this.pgp = pgp;
	}

	/**
 	* Get round information from mem tables
 	* @return {Promise}
 	*/
	getMemRounds  () {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getMemRounds);
	}

	/**
 	* Remove a particular round from database
 	* @param {string} round - Id of the round
 	* @return {Promise}
 	*/
	flush (round) {
		return this.db.none(sql.flush, [round]);
	}

	// TODO: Move usage of RoundsRepo#truncateBlocks to db/blocks
	/**
 	* Delete all blocks above a particular height
 	* @param {int} height
 	* @return {Promise}
 	*/
	truncateBlocks (height) {
		// TODO: This method must be in BlocksRepository, not here!
		return this.db.none(sql.truncateBlocks, [height]);
	}

	/**
 	* Update the missedblocks attribute for an account
 	* @param {boolean} backwards - Backward flag
 	* @param {string} outsiders - Comma separated string of ids
 	* @return {*}
 	*/
	updateMissedBlocks (backwards, outsiders) {
		return this.db.none(Queries.updateMissedBlocks(backwards), [outsiders]);
	}

	// TODO: Move usage of RoundsRepo#getVotes to db/votes
	/**
 	* Get votes for a round
 	* @param {string} round - Id of the round
 	* @return {Promise}
 	*/
	getVotes (round) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getVotes, [round]);
	}

	// TODO: Move usage of RoundsRepo#updateVotes to db/votes
	/**
 	* Update the votes of for a particular account
	 * @param {string} address - Address of the account
 	* @param {int} amount - Votes to update
 	*/
	updateVotes (address, amount) {
		return this.db.none(sql.updateVotes, [amount, address]);
	}

	// TODO: Move usage of RoundsRepo#updateBlockId to db/accounts
	/**
 	* Update id of a particular block for an account
 	* @param {string} newId
 	* @param {string} oldId
 	* @return {Promise}
 	*/
	updateBlockId (newId, oldId) {
		return this.db.none(sql.updateBlockId, [newId, oldId]);
	}

	/**
 	* Summarize the results for a round
 	* @param {string} round - Id of the round
 	* @param {int} activeDelegates - Number of active delegates
 	* @return {Promise}
 	*/
	summedRound (round, activeDelegates) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.summedRound, [activeDelegates, round]);
	}

	/**
 	* Drop the table for round snapshot
 	* @return {Promise}
 	*/
	clearRoundSnapshot () {
		return this.db.none(sql.clearRoundSnapshot);
	}

	/**
 	* Create table for the round snapshot
 	* @return {Promise}
 	*/
	performRoundSnapshot () {
		return this.db.none(sql.performRoundSnapshot);
	}

	/**
 	* Delete table for votes snapshot
 	* @return {Promise}
 	*/
	clearVotesSnapshot () {
		return this.db.none(sql.clearVotesSnapshot);
	}

	/**
 	* Take a snapshot of the votes by creating table and populating records from votes
 	* @return {Promise}
 	*/
	performVotesSnapshot () {
		return this.db.none(sql.performVotesSnapshot);
	}

	/**
 	* Update accounts from the round snapshot
 	* @return {Promise}
 	*/
	restoreRoundSnapshot () {
		return this.db.none(sql.restoreRoundSnapshot);
	}

	/**
 	* Update votes for account from a snapshot
 	* @return {Promise}
 	*/
	restoreVotesSnapshot () {
		return this.db.none(sql.restoreVotesSnapshot);
	}
}

const Queries = {
	updateMissedBlocks: function (backwards) {
		return [
			'UPDATE mem_accounts SET "missedblocks" = "missedblocks"',
			(backwards ? '- 1' : '+ 1'),
			'WHERE "address" IN ($1:csv);'
		].join(' ');
	}
};

module.exports = RoundsRepository;
