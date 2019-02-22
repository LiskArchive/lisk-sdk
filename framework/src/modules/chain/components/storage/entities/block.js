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

const path = require('path');
const assert = require('assert');
const _ = require('lodash');
const {
	NonSupportedOperationError,
} = require('../../../../../components/storage/errors');
const {
	Block: BlockEntity,
} = require('../../../../../components/storage/entities/');

const defaultCreateValues = {};
const createFields = [
	'id',
	'height',
	'blockSignature',
	'generatorPublicKey',
	'payloadHash',
	'payloadLength',
	'numberOfTransactions',
	'previousBlockId',
	'timestamp',
	'totalAmount',
	'totalFee',
	'reward',
	'version',
];

const sqlFiles = {
	create: 'blocks/create.sql',
	delete: 'blocks/delete.sql',
};

class ChainBlock extends BlockEntity {
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
	 * Create object record
	 *
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	create(data, _options, tx) {
		assert(data, 'Must provide data to create block');
		assert(
			typeof data === 'object' || Array.isArray(data),
			'Data must be an object or array of objects'
		);

		let blocks = _.cloneDeep(data);

		if (!Array.isArray(blocks)) {
			blocks = [blocks];
		}

		blocks = blocks.map(v => _.defaults(v, defaultCreateValues));

		const createSet = this.getValuesSet(blocks, createFields);

		const fields = createFields
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{
				createSet,
				fields,
			},
			{
				expectedResultCount: 0,
			},
			tx
		);
	}

	/**
	 * Update operation is not supported for Blocks
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	update() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Update operation is not supported for Blocks
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	updateOne() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Delete records with following conditions
	 *
	 * @param {filters.Block} filters
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
				{
					parsedFilters,
				},
				{
					expectedResultCount: 0,
				},
				tx
			)
			.then(result => result);
	}
}

module.exports = ChainBlock;
