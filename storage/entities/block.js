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

const _ = require('lodash');
const { stringToByte } = require('../utils/inputSerializers');
const { NonSupportedOperationError } = require('../errors');
const filterType = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

/**
 * Block
 * @typedef {Object} Block
 * @property {string} id
 * @property {string} payloadHash
 * @property {string} generatorPublicKey
 * @property {string} blockSignature
 * @property {number} height
 * @property {string} totalFee
 * @property {string} reward
 * @property {number} payloadLength
 * @property {string} previousBlockId
 * @property {number} numberOfTransactions
 * @property {string} totalAmount
 * @property {number} timestamp
 * @property {string} version
 */

/**
 * Block Filters
 * @typedef {Object} filters.Block
 * @property {string} [id]
 * @property {string} [id_eql]
 * @property {string} [id_ne]
 * @property {string} [id_in]
 * @property {string} [id_like]
 * @property {string} [height]
 * @property {string} [height_eql]
 * @property {string} [height_ne]
 * @property {string} [height_gt]
 * @property {string} [height_gte]
 * @property {string} [height_lt]
 * @property {string} [height_lte]
 * @property {string} [height_in]
 * @property {string} [blockSignature]
 * @property {string} [blockSignature_eql]
 * @property {string} [blockSignature_ne]
 * @property {string} [blockSignature_in]
 * @property {string} [blockSignature_like]
 * @property {string} [generatorPublicKey]
 * @property {string} [generatorPublicKey_eql]
 * @property {string} [generatorPublicKey_ne]
 * @property {string} [generatorPublicKey_in]
 * @property {string} [generatorPublicKey_like]
 * @property {string} [payloadHash]
 * @property {string} [payloadHash_eql]
 * @property {string} [payloadHash_ne]
 * @property {string} [payloadHash_in]
 * @property {string} [payloadHash_like]
 * @property {string} [payloadLength]
 * @property {string} [payloadLength_eql]
 * @property {string} [payloadLength_ne]
 * @property {string} [payloadLength_gt]
 * @property {string} [payloadLength_gte]
 * @property {string} [payloadLength_lt]
 * @property {string} [payloadLength_lte]
 * @property {string} [payloadLength_in]
 * @property {string} [numberOfTransactions]
 * @property {string} [numberOfTransactions_eql]
 * @property {string} [numberOfTransactions_ne]
 * @property {string} [numberOfTransactions_gt]
 * @property {string} [numberOfTransactions_gte]
 * @property {string} [numberOfTransactions_lt]
 * @property {string} [numberOfTransactions_lte]
 * @property {string} [numberOfTransactions_in]
 * @property {string} [previousBlockId]
 * @property {string} [previousBlockId_eql]
 * @property {string} [previousBlockId_ne]
 * @property {string} [previousBlockId_in]
 * @property {string} [previousBlockId_like]
 * @property {string} [timestamp]
 * @property {string} [timestamp_eql]
 * @property {string} [timestamp_ne]
 * @property {string} [timestamp_gt]
 * @property {string} [timestamp_gte]
 * @property {string} [timestamp_lt]
 * @property {string} [timestamp_lte]
 * @property {string} [timestamp_in]
 * @property {string} [totalAmount]
 * @property {string} [totalAmount_eql]
 * @property {string} [totalAmount_ne]
 * @property {string} [totalAmount_gt]
 * @property {string} [totalAmount_gte]
 * @property {string} [totalAmount_lt]
 * @property {string} [totalAmount_lte]
 * @property {string} [totalAmount_in]
 * @property {string} [totalFee]
 * @property {string} [totalFee_eql]
 * @property {string} [totalFee_ne]
 * @property {string} [totalFee_gt]
 * @property {string} [totalFee_gte]
 * @property {string} [totalFee_lt]
 * @property {string} [totalFee_lte]
 * @property {string} [totalFee_in]
 * @property {string} [reward]
 * @property {string} [reward_eql]
 * @property {string} [reward_ne]
 * @property {string} [reward_gt]
 * @property {string} [reward_gte]
 * @property {string} [reward_lt]
 * @property {string} [reward_lte]
 * @property {string} [reward_in]
 * @property {string} [version]
 * @property {string} [version_eql]
 * @property {string} [version_ne]
 * @property {string} [version_gt]
 * @property {string} [version_gte]
 * @property {string} [version_lt]
 * @property {string} [version_lte]
 * @property {string} [version_in]
 */

class Block extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.Block} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: filterType.TEXT });
		this.addField('height', 'number', { filter: filterType.NUMBER });
		this.addField(
			'blockSignature',
			'string',
			{ filter: filterType.TEXT },
			stringToByte
		);
		this.addField(
			'generatorPublicKey',
			'string',
			{
				format: 'publicKey',
				filter: filterType.TEXT,
			},
			stringToByte
		);
		this.addField(
			'payloadHash',
			'string',
			{ filter: filterType.TEXT },
			stringToByte
		);
		this.addField('payloadLength', 'number', { filter: filterType.NUMBER });
		this.addField('numberOfTransactions', 'number', {
			filter: filterType.NUMBER,
		});
		this.addField('previousBlockId', 'string', {
			filter: filterType.TEXT,
			fieldName: 'previousBlock',
		});
		this.addField('timestamp', 'number', { filter: filterType.NUMBER });
		this.addField('totalAmount', 'string', { filter: filterType.NUMBER });
		this.addField('totalFee', 'string', { filter: filterType.NUMBER });
		this.addField('reward', 'string', { filter: filterType.NUMBER });
		this.addField('version', 'number', { filter: filterType.NUMBER });

		this.SQLs = {
			select: this.adapter.loadSQLFile('blocks/get.sql'),
			create: this.adapter.loadSQLFile('blocks/create.sql'),
			isPersisted: this.adapter.loadSQLFile('blocks/is_persisted.sql'),
		};
	}

	/**
	 * Get list of blocks
	 *
	 * @param {filters.Block|filters.Block[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicBlock[], NonSupportedFilterTypeError|NonSupportedOptionError>}
	 */
	async get(filters = {}, options = {}, tx) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset']),
			_.pick(this.defaultOptions, ['limit', 'offset'])
		);

		const params = {
			...{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			...{ parsedFilters },
		};

		return this.adapter.executeFile(this.SQLs.select, params, {}, tx);
	}

	/**
	 * Get one block
	 *
	 * @param {filters.Block|filters.Block[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicBlock, NonSupportedFilterTypeError|NonSupportedOptionError>}
	 */
	async getOne(filters, options = {}, tx) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset']),
			_.pick(this.defaultOptions, ['limit', 'offset'])
		);

		const params = {
			...{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			...{ parsedFilters },
		};

		return this.adapter.executeFile(
			this.SQLs.select,
			params,
			{ expectedResult: 1 },
			tx
		);
	}

	/**
	 * Create object record
	 *
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	async create(data, _options, tx) {
		const objectData = data;
		const createSet = this.getValuesSet(objectData);
		const attributes = Object.keys(data)
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{ attributes, createSet },
			{},
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
	async update() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Update operation is not supported for Blocks
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	async updateOne() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Block} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	async isPersisted(filters, options, tx) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset']),
			_.pick(this.defaultOptions, ['limit', 'offset'])
		);

		const params = {
			...{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			...{ parsedFilters },
		};

		return this.adapter
			.executeFile(this.SQLs.isPersisted, { params }, {}, tx)
			.then(result => !!result[0]);
	}
}

module.exports = Block;
