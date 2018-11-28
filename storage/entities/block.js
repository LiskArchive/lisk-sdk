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
const { stringToByte } = require('../utils/inputSerialzers');
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
		this.addField('previousBlock', 'string', { filter: ft.TEXT });
		this.addField('timestamp', 'number', { filter: ft.NUMBER });
		this.addField('totalAmount', 'string', { filter: ft.NUMBER });
		this.addField('totalFee', 'string', { filter: ft.NUMBER });
		this.addField('reward', 'string', { filter: ft.NUMBER });
		this.addField('transactions', 'array', {});
		this.addField('version', 'number', { filter: ft.NUMBER });

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('blocks/get_simple.sql'),
			selectFull: this.adapter.loadSQLFile('blocks/get_full.sql'),
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
		const parsedFilters = this.parseFilters(filters);
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
				[this.FIELD_SET_FULL]: this.SQLs.selectFull,
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
	 * @return {*}
	 */
	getOne(filters, options = {}, tx) {
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'fieldSet']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'fieldSet'])
		);
		const parsedFilters = this.parseFilters(filters);

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
				[Block.prototype.FIELD_SET_FULL]: this.SQLs.selectFull,
			}[parsedOptions.fieldSet],
			params,
			{ expectedResult: 1 },
			tx
		);
	}

	getFieldSets() {
		return [this.FIELD_SET_SIMPLE, this.FIELD_SET_FULL];
	}
}

Block.prototype.FIELD_SET_SIMPLE = 'FIELD_SET_SIMPLE';
Block.prototype.FIELD_SET_FULL = 'FIELD_SET_FULL';
Block.prototype.defaultOptions = {
	limit: 10,
	offset: 0,
	fieldSet: Block.prototype.FIELD_SET_SIMPLE,
};

module.exports = Block;
