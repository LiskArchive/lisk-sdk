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

const apiCodes = require('../../helpers/api_codes.js');
const ApiError = require('../../helpers/api_error.js');
const sortBy = require('../../helpers/sort_by.js').sortBy;

let library;
let self;
const __private = {};
// eslint-disable-next-line no-unused-vars, no-var
var modules;
/**
 * Main API logic. Allows get information. Initializes library.
 *
 * @class
 * @memberof modules.blocks
 * @see Parent: {@link modules.blocks}
 * @requires helpers/api_codes
 * @requires helpers/api_error
 * @requires helpers/sort_by.sortBy
 * @param {Object} logger
 * @param {Database} db
 * @param {Block} block
 * @param {ZSchema} schema
 * @todo Add description for the params
 */
class API {
	constructor(logger, db, block, schema) {
		library = {
			logger,
			db,
			schema,
			logic: {
				block,
			},
		};
		self = this;
		library.logger.trace('Blocks->API: Submodule initialized.');
		return self;
	}
}

/**
 * Get filtered list of blocks (without transactions).
 *
 * @private
 * @func list
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
__private.list = function(filter, cb) {
	const params = {};
	const where = [];

	if (filter.id) {
		where.push('"b_id" = ${id}');
		params.id = filter.id;
	}

	if (filter.generatorPublicKey) {
		where.push('"b_generatorPublicKey"::bytea = ${generatorPublicKey}');
		params.generatorPublicKey = filter.generatorPublicKey;
	}

	// FIXME: Useless condition
	if (filter.numberOfTransactions) {
		where.push('"b_numberOfTransactions" = ${numberOfTransactions}');
		params.numberOfTransactions = filter.numberOfTransactions;
	}

	if (filter.previousBlock) {
		where.push('"b_previousBlock" = ${previousBlock}');
		params.previousBlock = filter.previousBlock;
	}

	if (filter.height === 0 || filter.height > 0) {
		where.push('"b_height" = ${height}');
		params.height = filter.height;
	}

	if (filter.fromTimestamp >= 0) {
		where.push('"b_timestamp" >= ${fromTimestamp}');
		params.fromTimestamp = filter.fromTimestamp;
	}

	if (filter.toTimestamp >= 1) {
		where.push('"b_timestamp" <= ${toTimestamp}');
		params.toTimestamp = filter.toTimestamp;
	}

	// FIXME: Useless condition
	if (filter.totalAmount >= 0) {
		where.push('"b_totalAmount" = ${totalAmount}');
		params.totalAmount = filter.totalAmount;
	}

	// FIXME: Useless condition
	if (filter.totalFee >= 0) {
		where.push('"b_totalFee" = ${totalFee}');
		params.totalFee = filter.totalFee;
	}

	// FIXME: Useless condition
	if (filter.reward >= 0) {
		where.push('"b_reward" = ${reward}');
		params.reward = filter.reward;
	}

	if (!filter.limit) {
		params.limit = 100;
	} else {
		params.limit = Math.abs(filter.limit);
	}

	if (!filter.offset) {
		params.offset = 0;
	} else {
		params.offset = Math.abs(filter.offset);
	}

	if (params.limit > 100) {
		return setImmediate(cb, 'Invalid limit. Maximum is 100');
	}

	const sort = sortBy(filter.sort || 'height:desc', {
		sortFields: library.db.blocks.sortFields,
		fieldPrefix: 'b_',
	});

	if (sort.error) {
		return setImmediate(cb, sort.error);
	}

	library.db.blocks
		.list(
			Object.assign(
				{},
				{
					where,
					sortField: sort.sortField,
					sortMethod: sort.sortMethod,
				},
				params
			)
		)
		.then(rows => {
			const blocks = [];
			const rowCount = rows.length;
			// Normalize blocks
			for (let i = 0; i < rowCount; i++) {
				// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
				const block = library.logic.block.dbRead(rows[i]);
				blocks.push(block);
			}
			return setImmediate(cb, null, blocks);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#list error');
		});
};

/**
 * Description of the function.
 *
 * @returns {Immediate}
 * @todo Add @param tags
 * @todo Add description for the function and return value
 */
API.prototype.getBlocks = function(filters, cb) {
	if (!__private.loaded) {
		return setImmediate(cb, 'Blockchain is loading');
	}

	__private.list(filters, (err, data) => {
		if (err) {
			return setImmediate(
				cb,
				new ApiError(err[0].message, apiCodes.INTERNAL_SERVER_ERROR)
			);
		}

		return setImmediate(cb, null, data);
	});
};

/**
 * Handle modules initialization:
 * - blocks
 * - system
 *
 * @param {Object} scope - Exposed modules
 */
API.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->API: Shared modules bind.');
	modules = {
		blocks: scope.blocks,
		system: scope.system,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = API;
