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
const apiCodes = require('../../helpers/api_codes.js');
const ApiError = require('../../helpers/api_error.js');

let library;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @param {Object} scope - App instance
 * @todo Add description of BlocksController
 */
function BlocksController(scope) {
	library = {
		db: scope.db,
		storage: scope.storage,
		logic: scope.logic,
		logger: scope.logger,
	};
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
BlocksController.getBlocks = function(context, next) {
	const params = context.request.swagger.params;

	let filters = {
		id: params.blockId.value,
		height: params.height.value,
		generatorPublicKey: params.generatorPublicKey.value,
		fromTimestamp: params.fromTimestamp.value,
		toTimestamp: params.toTimestamp.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	return _list(_.clone(filters), (err, data) => {
		if (err) {
			return next(err);
		}

		data = _.cloneDeep(data);

		data = _.map(data, block => {
			block.totalAmount = block.totalAmount.toString();
			block.totalFee = block.totalFee.toString();
			block.reward = block.reward.toString();
			block.totalForged = block.totalForged.toString();
			block.generatorAddress = block.generatorId;
			block.previousBlockId = block.previousBlock || '';

			delete block.previousBlock;
			delete block.generatorId;

			return block;
		});

		return next(null, {
			data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
			},
		});
	});
};

/**
 * Get filtered list of blocks (without transactions - BasicBlock).
 *
 * @private
 * @func _list
 * @param {Object} filter - Conditions to filter with
 * @param {string} filter.id - Block id
 * @param {string} filter.generatorPublicKey - Public key of delegate who generates the block
 * @param {number} filter.numberOfTransactions - Number of transactions
 * @param {string} filter.previousBlock - Previous block ID
 * @param {number} filter.height - Block height
 * @param {number} filter.totalAmount - Total amount of block's transactions
 * @param {number} filter.totalFee - Block total fees
 * @param {number} filter.reward - Block reward
 * @param {number} filter.limit - Limit of blocks to retrieve, default: 100, max: 100
 * @param {number} filter.offset - Offset from where to start
 * @param {string} filter.sort - Sort order, default: height:desc
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.data - List of normalized blocks
 */
function _list(filter, cb) {
	const options = {};

	const filters = {
		id: filter.id,
		generatorPublicKey: filter.generatorPublicKey,
		numberOfTransactions: filter.numberOfTransactions,
		previousBlockId: filter.previousBlock,
		height: filter.height,
		timestamp_gte: filter.fromTimestamp,
		timestamp_lte: filter.toTimestamp,
		totalAmount: filter.totalAmount,
		totalFee: filter.totalFee,
		reward: filter.reward,
	};

	Object.keys(filters).forEach(key => {
		if (!filters[key]) {
			delete filters[key];
		}
	});

	if (!filter.limit) {
		options.limit = 100;
	} else {
		options.limit = Math.abs(filter.limit);
	}

	if (!filter.offset) {
		options.offset = 0;
	} else {
		options.offset = Math.abs(filter.offset);
	}

	if (options.limit > 100) {
		return setImmediate(
			cb,
			new ApiError(
				'Invalid limit. Maximum is 100',
				apiCodes.INTERNAL_SERVER_ERROR
			)
		);
	}

	options.sort = filter.sort || 'height:desc';
	const [sortField, sortMethod = 'ASC'] = options.sort.split(':');

	if (
		!library.db.blocks.sortFields.includes(sortField) ||
		!['ASC', 'DESC'].includes(sortMethod.toUpperCase())
	) {
		return setImmediate(
			cb,
			new ApiError('Invalid sort field', apiCodes.INTERNAL_SERVER_ERROR)
		);
	}

	return library.storage.entities.Block.get(filters, options)
		.then(rows => {
			const blocks = [];
			const rowCount = rows.length;
			// Normalize blocks
			for (let i = 0; i < rowCount; i++) {
				// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
				const block = library.logic.block.storageRead(rows[i]);
				blocks.push(block);
			}
			return setImmediate(cb, null, blocks);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(
				cb,
				new ApiError('Blocks#list error', apiCodes.INTERNAL_SERVER_ERROR)
			);
		});
}

module.exports = BlocksController;
