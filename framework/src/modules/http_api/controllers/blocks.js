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
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const BigNum = require('@liskhq/bignum');
const ApiError = require('../api_error');
const apiCodes = require('../api_codes');
const swaggerHelper = require('../helpers/swagger');

let library;
let sortFields;

/**
 * Parse raw block data from database into expected API response type for blocks
 *
 * @param {Object} raw Raw block data from database
 * @return {block} Block formatted according to API specification
 */
function parseBlockFromDatabase(raw) {
	if (!raw.id) {
		return null;
	}

	const block = {
		id: raw.id,
		version: parseInt(raw.version, 10),
		timestamp: parseInt(raw.timestamp, 10),
		height: parseInt(raw.height, 10),
		previousBlock: raw.previousBlockId,
		numberOfTransactions: parseInt(raw.numberOfTransactions, 10),
		totalAmount: new BigNum(raw.totalAmount).toFixed(),
		totalFee: new BigNum(raw.totalFee).toFixed(),
		reward: new BigNum(raw.reward).toFixed(),
		payloadLength: parseInt(raw.payloadLength, 10),
		payloadHash: raw.payloadHash,
		generatorPublicKey: raw.generatorPublicKey,
		generatorId: getAddressFromPublicKey(raw.generatorPublicKey),
		blockSignature: raw.blockSignature,
		confirmations: parseInt(raw.confirmations, 10),
		totalForged: new BigNum(raw.totalFee).plus(raw.reward).toFixed(),
	};

	if (raw.transactions) {
		block.transactions = raw.transactions;
	}

	return block;
}

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
function _list(params, cb) {
	const options = {};
	const parsedFilters = {
		id: params.id,
		generatorPublicKey: params.generatorPublicKey,
		numberOfTransactions: params.numberOfTransactions,
		previousBlockId: params.previousBlock,
		height: params.height,
		timestamp_gte: params.fromTimestamp,
		timestamp_lte: params.toTimestamp,
		totalAmount: params.totalAmount,
		totalFee: params.totalFee,
		reward: params.reward,
	};

	// Remove filters with undefined/null values
	const filters = _.omitBy(
		parsedFilters,
		value => value === undefined || value === null,
	);

	options.limit = params.limit ? Math.abs(params.limit) : 100;
	options.offset = params.offset ? Math.abs(params.offset) : 0;
	options.sort = params.sort || 'height:desc';

	if (options.limit > 100) {
		return setImmediate(
			cb,
			new ApiError(
				'Invalid limit. Maximum is 100',
				apiCodes.INTERNAL_SERVER_ERROR,
			),
		);
	}

	const [sortField, sortMethod = 'ASC'] = options.sort.split(':');
	if (
		!sortFields.includes(sortField) ||
		!['ASC', 'DESC'].includes(sortMethod.toUpperCase())
	) {
		return setImmediate(
			cb,
			new ApiError('Invalid sort field', apiCodes.INTERNAL_SERVER_ERROR),
		);
	}

	return (
		library.storage.entities.Block.get(filters, options)
			// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
			.then(async rows =>
				setImmediate(cb, null, rows.map(parseBlockFromDatabase)),
			)
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(
					cb,
					new ApiError('Blocks#list error', apiCodes.INTERNAL_SERVER_ERROR),
				);
			})
	);
}

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
		storage: scope.components.storage,
		logger: scope.components.logger,
		channel: scope.channel,
	};

	sortFields = [
		'id',
		'timestamp',
		'height',
		'previousBlock',
		'totalAmount',
		'totalFee',
		'reward',
		'numberOfTransactions',
		'generatorPublicKey',
	];
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
BlocksController.getBlocks = function(context, next) {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

	let parsedParams = {
		id: params.blockId.value,
		height: params.height.value,
		generatorPublicKey: params.generatorPublicKey.value,
		fromTimestamp: params.fromTimestamp.value,
		toTimestamp: params.toTimestamp.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
	};

	// Remove params with undefined/null values
	parsedParams = _.omitBy(
		parsedParams,
		value => value === undefined || value === null,
	);

	return _list(_.clone(parsedParams), (err, data) => {
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
				offset: parsedParams.offset,
				limit: parsedParams.limit,
			},
		});
	});
};

module.exports = BlocksController;
