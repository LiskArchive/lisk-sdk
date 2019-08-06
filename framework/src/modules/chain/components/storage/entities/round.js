/*
 * Copyright © 2019 Lisk Foundation
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

const path = require('path');
const assert = require('assert');
const { defaults, omit, pick } = require('lodash');
const {
	entities: { BaseEntity },
	utils: {
		filterTypes: { NUMBER, TEXT },
	},
} = require('../../../../../components/storage');

const defaultCreateValues = {};

const readOnlyFields = [];

const sqlFiles = {
	select: 'rounds/get.sql',
	create: 'rounds/create.sql',
	update: 'rounds/update.sql',
	updateOne: 'rounds/update_one.sql',
	isPersisted: 'rounds/is_persisted.sql',
	delete: 'rounds/delete.sql',
	getTotalVotedAmount: 'rounds/get_total_voted_amount.sql',
	summedRound: 'rounds/summed_round.sql',
	deleteRoundRewards: 'rounds/delete_round_rewards.sql',
	createRoundRewards: 'rounds/create_round_rewards.sql',
	clearRoundSnapshot: 'rounds/clear_round_snapshot.sql',
	performRoundSnapshot: 'rounds/perform_round_snapshot.sql',
	restoreRoundSnapshot: 'rounds/restore_round_snapshot.sql',
	clearVotesSnapshot: 'rounds/clear_votes_snapshot.sql',
	performVotesSnapshot: 'rounds/perform_votes_snapshot.sql',
	restoreVotesSnapshot: 'rounds/restore_votes_snapshot.sql',
	checkSnapshotAvailability: 'rounds/check_snapshot_availability.sql',
	countRoundSnapshot: 'rounds/count_round_snapshot.sql',
	getDelegatesSnapshot: 'rounds/get_delegates_snapshot.sql',
};

/**
 * Round
 * @typedef {Object} Round
 * @property {string} address
 * @property {number} amount
 * @property {string} delegate
 * @property {number} round
 */

/**
 * Round Filters
 * @typedef {Object} filters.Round
 * @property {string} [address]
 * @property {string} [address_eql]
 * @property {string} [address_ne]
 * @property {string} [address_in]
 * @property {string} [address_like]
 * @property {number} [amount]
 * @property {number} [amount_eql]
 * @property {number} [amount_ne]
 * @property {number} [amount_gt]
 * @property {number} [amount_gte]
 * @property {number} [amount_lt]
 * @property {number} [amount_lte]
 * @property {number} [amount_in]
 * @property {string} [delegate]
 * @property {string} [delegate_eql]
 * @property {string} [delegate_ne]
 * @property {string} [delegate_in]
 * @property {string} [delegate_like]
 * @property {number} [round]
 * @property {number} [round_eql]
 * @property {number} [round_ne]
 * @property {number} [round_gt]
 * @property {number} [round_gte]
 * @property {number} [round_lt]
 * @property {number} [round_lte]
 * @property {number} [round_in]
 */

class Round extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrieve the data from
	 * @param {filters.Round} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('address', 'string', { filter: TEXT });
		this.addField('amount', 'number', { filter: NUMBER });
		this.addField('delegatePublicKey', 'string', {
			filter: TEXT,
			fieldName: 'delegate',
		});
		this.addField('round', 'number', { filter: NUMBER });

		const defaultSort = { sort: '' };
		this.extendDefaultOptions(defaultSort);

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('round', sqlFiles, this.sqlDirectory);
	}

	/**
	 * Get one round
	 *
	 * @param {filters.Round|filters.Round[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<Round, Error>}
	 */
	getOne(filters, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of rounds
	 *
	 * @param {filters.Round|filters.Round[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<Round[], Error>}
	 */
	get(filters = {}, options = {}, tx = null) {
		return this._getResults(filters, options, tx);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = defaults(
			{},
			pick(options, ['limit', 'offset', 'sort']),
			pick(this.defaultOptions, ['limit', 'offset', 'sort']),
		);
		const parsedSort = this.parseSort(parsedOptions.sort);

		const params = {
			limit: parsedOptions.limit,
			offset: parsedOptions.offset,
			parsedSort,
			parsedFilters,
		};

		return this.adapter.executeFile(
			this.SQLs.select,
			params,
			{ expectedResultCount },
			tx,
		);
	}

	/**
	 * Create round object
	 *
	 * @param {Object} data
	 * @param {Object} [_options]
	 * @param {Object} [tx] - Transaction object
	 * @return {null}
	 */
	// eslint-disable-next-line no-unused-vars
	create(data, _options = {}, tx = null) {
		assert(data, 'Must provide data to create account');
		assert(
			typeof data === 'object' || Array.isArray(data),
			'Data must be an object or array of objects',
		);

		let values;

		if (Array.isArray(data)) {
			values = data.map(item => ({ ...item }));
		} else if (typeof data === 'object') {
			values = [{ ...data }];
		}

		values = values.map(v => defaults(v, defaultCreateValues));
		const attributes = Object.keys(this.fields).filter(
			fieldname => fieldname !== 'id',
		);
		const createSet = this.getValuesSet(values, attributes);
		const fields = attributes
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, fields },
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Update the records based on given condition
	 *
	 * @param {filters.Round} [filters]
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} [tx] - Transaction object
	 * @return {null}
	 */
	update(filters, data, _options, tx = null) {
		this.validateFilters(filters);
		const objectData = omit(data, readOnlyFields);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = {
			...objectData,
			parsedFilters,
			updateSet,
		};

		return this.adapter.executeFile(
			this.SQLs.update,
			params,
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Update one record based on the condition given
	 *
	 * @param {filters.Round} filters
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} [tx] - Transaction object
	 * @return {null}
	 */
	updateOne(filters, data, _options, tx = null) {
		this.validateFilters(filters);
		const objectData = omit(data, readOnlyFields);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = {
			...objectData,
			parsedFilters,
			updateSet,
		};

		return this.adapter.executeFile(
			this.SQLs.updateOne,
			params,
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Round} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	isPersisted(filters, _options, tx = null) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.isPersisted,
				{ parsedFilters },
				{ expectedResultCount: 1 },
				tx,
			)
			.then(result => result.exists);
	}

	/**
	 * Delete records with following conditions
	 *
	 * @param {filters.Round} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	delete(filters, _options, tx = null) {
		this.validateFilters(filters);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.delete,
				{ parsedFilters },
				{ expectedResultCount: 0 },
				tx,
			)
			.then(result => result);
	}

	// Custom methods imported from db/repos/round.js

	/**
	 * Get unique round numbers from mem tables.
	 *
	 * @param {Object} [tx] - Database transaction object
	 *
	 * @returns {Promise}
	 */
	async getUniqueRounds(tx) {
		const sql = 'SELECT round FROM mem_round GROUP BY round';
		return this.adapter.execute(sql, {}, {}, tx);
	}

	/**
	 * Get total voted amount for all delegates
	 *
	 * @param {filters.Round} filters
	 * @param {Object} [_options]
	 * @param {Object} [tx]
	 * @returns {Promise.<Array.<Object>, Error>}
	 */
	getTotalVotedAmount(filters, _options, tx = null) {
		this.validateFilters(filters);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		const params = {
			parsedFilters,
		};

		return this.adapter.executeFile(
			this.SQLs.getTotalVotedAmount,
			params,
			{},
			tx,
		);
	}

	/**
	 * Summarize the results for a round.
	 *
	 * @param {string} round - Id of the round
	 * @param {number} activeDelegates - Number of active delegates
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	summedRound(round, activeDelegates, tx = null) {
		return this.adapter.executeFile(
			this.SQLs.summedRound,
			{ round, activeDelegates },
			{},
			tx,
		);
	}

	/**
	 * Create information about round rewards into rounds_rewards.
	 *
	 * @param {Number} timestamp - Timestamp of last block of round
	 * @param {String} fees - Fees amount for particular block
	 * @param {String} reward - Rewards amount for particular block
	 * @param {Number} round - Round number
	 * @param {Buffer} publicKey - Public key of a delegate that forged a block
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise}
	 */
	createRoundRewards({ timestamp, fees, reward, round, publicKey }, tx) {
		return this.adapter.executeFile(
			this.SQLs.createRoundRewards,
			{
				timestamp,
				fees,
				reward,
				round,
				publicKey,
			},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Delete information about entire round rewards from rounds_rewards.
	 *
	 * @param {Number} round - Round number
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise}
	 */
	deleteRoundRewards(round, tx) {
		return this.adapter.executeFile(
			this.SQLs.deleteRoundRewards,
			{ round },
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Drop the table for round snapshot.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	clearRoundSnapshot(tx) {
		return this.adapter.executeFile(
			this.SQLs.clearRoundSnapshot,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Create table for the round snapshot.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	performRoundSnapshot(tx) {
		return this.adapter.executeFile(
			this.SQLs.performRoundSnapshot,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Checks round snapshot availability for particular round.
	 *
	 * @param {string|number} round - Round number
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	checkSnapshotAvailability(round, tx) {
		return this.adapter
			.executeFile(this.SQLs.checkSnapshotAvailability, { round }, {}, tx)
			.then(result => (result && result.length ? result[0].available : null));
	}

	/**
	 * Get number of records from mem_round_snapshot table.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	countRoundSnapshot(tx) {
		return this.adapter
			.executeFile(
				this.SQLs.countRoundSnapshot,
				{},
				{ expectedResultCount: 1 },
				tx,
			)
			.then(result => +result.count);
	}

	/**
	 * Get data from the round snapshot.
	 *
	 * @param {number} limit - Number of records to fetch
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	getDelegatesSnapshot(limit, tx) {
		return this.adapter.executeFile(
			this.SQLs.getDelegatesSnapshot,
			{ limit },
			{},
			tx,
		);
	}

	/**
	 * Delete table for votes snapshot.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	clearVotesSnapshot(tx) {
		return this.adapter.executeFile(
			this.SQLs.clearVotesSnapshot,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Take a snapshot of the votes by creating table and populating records from votes.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {void}
	 */
	performVotesSnapshot(tx) {
		return this.adapter.executeFile(
			this.SQLs.performVotesSnapshot,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Update accounts from the round snapshot.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	restoreRoundSnapshot(tx) {
		return this.adapter.executeFile(
			this.SQLs.restoreRoundSnapshot,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Update votes for account from a snapshot.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	restoreVotesSnapshot(tx) {
		return this.adapter.executeFile(
			this.SQLs.restoreVotesSnapshot,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}
}

module.exports = Round;
