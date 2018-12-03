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
const {
	NonSupportedFilterTypeError,
	NonSupportedOperationError,
} = require('../errors');
const ft = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

/**
 * Basic Block
 * @typedef {Object} BasicBlock
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

/**
 * @typedef {string} fieldSets.Block
 * @enum
 * @value 'FIELD_SET_SIMPLE'
 */

class Block extends BaseEntity {
	constructor() {
		super();

		this.addField('id', 'string', { filter: ft.TEXT });
		this.addField('height', 'number', { filter: ft.NUMBER });
		this.addField(
			'blockSignature',
			'string',
			{ filter: ft.TEXT },
			stringToByte
		);
		this.addField(
			'generatorPublicKey',
			'string',
			{
				format: 'publicKey',
				filter: ft.TEXT,
			},
			stringToByte
		);
		this.addField('payloadHash', 'string', { filter: ft.TEXT }, stringToByte);
		this.addField('payloadLength', 'number', { filter: ft.NUMBER });
		this.addField('numberOfTransactions', 'number', { filter: ft.NUMBER });
		this.addField('previousBlockId', 'string', {
			filter: ft.TEXT,
			fieldName: 'previousBlock',
		});
		this.addField('timestamp', 'number', { filter: ft.NUMBER });
		this.addField('totalAmount', 'string', { filter: ft.NUMBER });
		this.addField('totalFee', 'string', { filter: ft.NUMBER });
		this.addField('reward', 'string', { filter: ft.NUMBER });
		this.addField('version', 'number', { filter: ft.NUMBER });

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('blocks/get_simple.sql'),
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
	 * @param {fieldSets.Block} [options.fieldSet='FIELD_SET_SIMPLE'] - Fieldset to choose
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicBlock[], Error>}
	 */
	get(filters = {}, options = {}, tx) {
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'fieldSet']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'fieldSet'])
		);

		const params = Object.assign(
			{},
			{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			{ parsedFilters }
		);

		return this.adapter.executeFile(
			{
				[this.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
			}[parsedOptions.fieldSet],
			params,
			{},
			tx
		);
	}

	/**
	 * Get one block
	 *
	 * @param {filters.Block|filters.Block[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {fieldSets.Block} [options.fieldSet='FIELD_SET_SIMPLE'] - Fieldset to choose
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicBlock, Error>}
	 */
	getOne(filters, options = {}, tx) {
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'fieldSet']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'fieldSet'])
		);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		const params = Object.assign(
			{},
			{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			{
				parsedFilters,
			}
		);

		return this.adapter.executeFile(
			{
				[Block.prototype.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
			}[parsedOptions.fieldSet],
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
	create(data, _options, tx) {
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
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Block} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	isPersisted(filters, _options, tx) {
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		if (parsedFilters === '') {
			throw new NonSupportedFilterTypeError(
				'Please provide some filters to check.',
				filters
			);
		}

		return this.adapter
			.executeFile(this.SQLs.isPersisted, { parsedFilters }, {}, tx)
			.then(result => result[0].exists);
	}

	getFieldSets() {
		return [this.FIELD_SET_SIMPLE];
	}

	/**
	 * Merge multiple filters together
	 * @param {Array.<Object>|Object} filters
	 * @return {*}
	 */
	mergeFilters(filters) {
		const mergedFilters = filters;

		if (Array.isArray(mergedFilters)) {
			const lastIndex = mergedFilters.length - 1;
			mergedFilters[lastIndex] = Object.assign(
				{},
				mergedFilters[lastIndex],
				this.defaultFilters
			);
			return mergedFilters;
		}
		return Object.assign({}, mergedFilters, this.defaultFilters);
	}
}

Block.prototype.FIELD_SET_SIMPLE = 'FIELD_SET_SIMPLE';
Block.prototype.defaultOptions = {
	limit: 10,
	offset: 0,
	fieldSet: Block.prototype.FIELD_SET_SIMPLE,
};

module.exports = Block;
