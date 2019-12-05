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

const _ = require('lodash');
const { stringToByte } = require('../utils/input_serializers');
const { NonSupportedOperationError } = require('../errors');
const filterType = require('../utils/filter_types');
const BaseEntity = require('./base_entity');
const Transaction = require('./transaction');

const sqlFiles = {
	select: 'blocks/get.sql',
	count: 'blocks/count.sql',
	isPersisted: 'blocks/is_persisted.sql',
};

class Block extends BaseEntity {
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.transactionEntity = new Transaction(adapter);

		this.addField('rowId', 'number');
		this.addField('id', 'string', { filter: filterType.TEXT });
		this.addField('height', 'number', { filter: filterType.NUMBER });
		this.addField('maxHeightPreviouslyForged', 'number', {
			filter: filterType.NUMBER,
		});
		this.addField('maxHeightPrevoted', 'number', {
			filter: filterType.NUMBER,
		});
		this.addField(
			'blockSignature',
			'string',
			{ filter: filterType.TEXT },
			stringToByte,
		);
		this.addField(
			'generatorPublicKey',
			'string',
			{
				filter: filterType.TEXT,
			},
			stringToByte,
		);
		this.addField(
			'payloadHash',
			'string',
			{ filter: filterType.TEXT },
			stringToByte,
		);
		this.addField('payloadLength', 'number', { filter: filterType.NUMBER });
		this.addField('numberOfTransactions', 'number', {
			filter: filterType.NUMBER,
		});
		this.addField('previousBlockId', 'string', {
			filter: filterType.TEXT,
		});
		this.addField('timestamp', 'number', { filter: filterType.NUMBER });
		this.addField('totalAmount', 'string', { filter: filterType.NUMBER });
		this.addField('totalFee', 'string', { filter: filterType.NUMBER });
		this.addField('reward', 'string', { filter: filterType.NUMBER });
		this.addField('version', 'number', { filter: filterType.NUMBER });
		this.addField('confirmations', 'number', { filter: filterType.NUMBER });

		const defaultSort = { sort: 'height:desc' };
		this.extendDefaultOptions(defaultSort);

		this.SQLs = this.loadSQLFiles('block', sqlFiles);
	}

	// eslint-disable-next-line class-methods-use-this
	create() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	update() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	updateOne() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	delete() {
		throw new NonSupportedOperationError();
	}

	get(filters = {}, options = {}, tx) {
		return this._getResults(filters, options, tx);
	}

	getOne(filters, options = {}, tx) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	count(filters = {}, _options, tx) {
		this.validateFilters(filters);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const expectedResultCount = 1;

		return this.adapter
			.executeFile(
				this.SQLs.count,
				{ parsedFilters },
				{ expectedResultCount },
				tx,
			)
			.then(result => +result.count);
	}

	isPersisted(filters, _options, tx) {
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

	async _getResults(filters, options, tx, expectedResultCount = undefined) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'sort', 'extended']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'sort', 'extended']),
		);
		const parsedSort = this.parseSort(parsedOptions.sort);

		const params = {
			limit: parsedOptions.limit,
			offset: parsedOptions.offset,
			parsedSort,
			parsedFilters,
		};

		let result = await this.adapter.executeFile(
			this.SQLs.select,
			params,
			{ expectedResultCount },
			tx,
		);

		result = Array.isArray(result) ? result : [result];

		if (parsedOptions.extended && result.length > 0) {
			const blockIds = result.map(({ id }) => id);
			const trxFilters = { blockId_in: blockIds };
			const trxOptions = { limit: null, extended: true };
			const transactions = await this.transactionEntity.get(
				trxFilters,
				trxOptions,
				tx,
			);
			result.forEach(block => {
				block.transactions = transactions.filter(
					({ blockId }) => blockId === block.id,
				);
			});
		}

		return expectedResultCount === 1 ? result[0] : result;
	}
}

module.exports = Block;
