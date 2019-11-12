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

/**
 * Parse raw block data from database into expected API response type for blocks
 *
 * @param {Object} raw Raw block data from database
 * @return {block} Block formatted according to API specification
 */
const _parseBlock = raw => {
	if (!raw.id) {
		return null;
	}

	const block = {
		id: raw.id,
		version: parseInt(raw.version, 10),
		timestamp: parseInt(raw.timestamp, 10),
		height: parseInt(raw.height, 10),
		previousBlockId: raw.previousBlockId || '',
		numberOfTransactions: parseInt(raw.numberOfTransactions, 10),
		totalAmount: raw.totalAmount,
		totalFee: raw.totalFee,
		reward: raw.reward,
		payloadLength: parseInt(raw.payloadLength, 10),
		payloadHash: raw.payloadHash,
		generatorPublicKey: raw.generatorPublicKey,
		generatorAddress: getAddressFromPublicKey(raw.generatorPublicKey),
		blockSignature: raw.blockSignature,
		confirmations: parseInt(raw.confirmations, 10),
		totalForged: new BigNum(raw.totalFee).plus(raw.reward).toString(),
		maxHeightPrevoted: raw.maxHeightPrevoted,
		maxHeightPreviouslyForged: raw.maxHeightPreviouslyForged,
	};

	if (raw.transactions) {
		block.transactions = raw.transactions;
	}

	return block;
};

const _parseFilters = params => {
	const filters = {
		id: params.id,
		generatorPublicKey: params.generatorPublicKey,
		numberOfTransactions: params.numberOfTransactions,
		previousBlockId: params.previousBlockId,
		height: params.height,
		timestamp_gte: params.fromTimestamp,
		timestamp_lte: params.toTimestamp,
		totalAmount: params.totalAmount,
		totalFee: params.totalFee,
		reward: params.reward,
	};

	return _.omitBy(filters, value => value === undefined || value === null);
};

const _parseOptions = params => ({
	limit: params.limit ? Math.abs(params.limit) : 100,
	offset: params.offset ? Math.abs(params.offset) : 0,
	sort: params.sort || 'height:desc',
});

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
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
BlocksController.getBlocks = (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;
	const parsedParams = {
		id: params.blockId.value,
		height: params.height.value,
		generatorPublicKey: params.generatorPublicKey.value,
		fromTimestamp: params.fromTimestamp.value,
		toTimestamp: params.toTimestamp.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
	};

	const filters = _parseFilters(parsedParams);
	const options = _parseOptions(parsedParams);

	return library.storage.entities.Block.get(filters, options)
		.then(blocks =>
			next(null, {
				data: blocks.map(_parseBlock),
				meta: {
					offset: options.offset,
					limit: options.limit,
				},
			}),
		)
		.catch(error => {
			library.logger.error(error.stack);
			return next(
				new ApiError('Blocks#list error', apiCodes.INTERNAL_SERVER_ERROR),
			);
		});
};

module.exports = BlocksController;
