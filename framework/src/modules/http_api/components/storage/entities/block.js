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
const {
	entities: { Block: BlockEntity },
} = require('../../../../../components/storage');

const sqlFiles = {
	delegateBlocksRewards: 'blocks/delegate_blocks_rewards.sql',
};

class ApiBlock extends BlockEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.Block} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		const cutomSQLs = this.loadSQLFiles('blocks', sqlFiles, this.sqlDirectory);
		this.SQLs = {
			...this.SQLs,
			...cutomSQLs,
		};
	}

	/**
	 * Get blocks rewards of delegate for time period.
	 * TODO: move this method to Delegate entity once implemented
	 *
	 * @param {Object} filters = {} - Filters to filter data
	 * @param {string} filters.generatorPublicKey - Delegate Public Key to calculate reward
	 * @param {Number} [filters.fromTimestamp] - WHERE timestamp >= fromTimestamp
	 * @param {Number} [filters.toTimestamp] - WHERE timestamp <= toTimestamp
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<DatabaseRow, Error>}
	 */
	delegateBlocksRewards(filters, tx) {
		assert(
			filters && filters.generatorPublicKey,
			'filters must be an object and contain generatorPublicKey',
		);

		const parseFilters = {
			generatorPublicKey: filters.generatorPublicKey,
			fromTimestamp: filters.fromTimestamp,
			toTimestamp: filters.toTimestamp,
		};

		return this.adapter.executeFile(
			this.SQLs.delegateBlocksRewards,
			parseFilters,
			{},
			tx,
		);
	}
}

module.exports = ApiBlock;
