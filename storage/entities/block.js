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
const { blocks: { toEntity } } = require('../mappers');
const ft = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

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
		this.addField('transactions', 'array', {});
		this.addField('version', 'number', { filter: ft.NUMBER });

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('blocks/get_simple.sql'),
			create: this.adapter.loadSQLFile('blocks/create.sql'),
			isPersisted: this.adapter.loadSQLFile('blocks/is_persisted.sql'),
		};
	}

	/**
	 * Get list of accounts
	 *
	 * @param {filters.Account|filters.Account[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {fieldSets.Account} [options.fieldSet='FIELD_SET_SIMPLE'] - Fieldset to choose
	 * @param {Object} tx - Database transaction object
	 * @return {*}
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

		return this.adapter
			.executeFile(
				{
					[this.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
				}[parsedOptions.fieldSet],
				params,
				{},
				tx
			)
			.then(dataValues => dataValues.map(toEntity));
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
	 * @return {*}
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

		return this.adapter
			.executeFile(
				{
					[Block.prototype.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
				}[parsedOptions.fieldSet],
				params,
				{ expectedResult: 1 },
				tx
			)
			.then(dataValues => toEntity(dataValues));
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
	 * @param {filters.Account} filters
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
