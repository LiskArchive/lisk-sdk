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
const swaggerHelper = require('../helpers/swagger');
const ApiError = require('../api_error');
const apiCodes = require('../api_codes');
const transactionTypes = require('../helpers/transaction_types');

// Private Fields
let storage;
let channel;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @requires helpers/apiError
 * @requires helpers/swagger.generateParamsErrorObject
 * @requires helpers/swagger.invalidParams
 * @param {Object} scope - App instance
 * @todo Add description of TransactionsController
 */
function TransactionsController(scope) {
	storage = scope.components.storage;
	channel = scope.channel;
}

function transactionFormatter(transaction) {
	const result = _.omit(transaction, ['requesterPublicKey']);
	result.senderId = result.senderId || '';
	result.recipientId = result.recipientId || '';
	result.recipientPublicKey = result.recipientPublicKey || '';
	result.signSignature = result.signSignature || undefined;
	result.signatures = result.signatures || [];
	if (transaction.type === transactionTypes.DELEGATE) {
		result.asset.delegate.publicKey = result.senderPublicKey;
		result.asset.delegate.address = result.senderId;
	}

	return result;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
TransactionsController.getTransactions = async function(context, next) {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const params = context.request.swagger.params;

	let filters = {
		id: params.id.value,
		blockId: params.blockId.value,
		recipientId: params.recipientId.value,
		recipientPublicKey: params.recipientPublicKey.value,
		senderId: params.senderId.value,
		senderPublicKey: params.senderPublicKey.value,
		type: params.type.value,
		blockHeight: params.height.value,
		timestamp_gte: params.fromTimestamp.value,
		timestamp_lte: params.toTimestamp.value,
		amount_gte: params.minAmount.value,
		amount_lte: params.maxAmount.value,
		data_like: params.data.value,
	};

	let options = {
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
		extended: true,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));
	options = _.pickBy(options, v => !(v === undefined || v === null));

	if (params.senderIdOrRecipientId.value) {
		filters = [
			{ ...filters, senderId: params.senderIdOrRecipientId.value },
			{ ...filters, recipientId: params.senderIdOrRecipientId.value },
		];
	}

	try {
		const [data, count] = await Promise.all([
			storage.entities.Transaction.get(filters, options),
			storage.entities.Transaction.count(filters),
		]);

		return next(null, {
			data: data.map(transactionFormatter),
			meta: {
				offset: options.offset,
				limit: options.limit,
				count,
			},
		});
	} catch (error) {
		return next(error);
	}
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
TransactionsController.postTransaction = function(context, next) {
	const transaction = context.request.swagger.params.transaction.value;

	return channel.invoke('chain:postTransaction', [
		transaction,
		(err, data) => {
			let error = null;

			if (data.success) {
				return next(null, {
					data: { message: 'Transaction(s) accepted' },
					meta: { status: true },
				});
			}

			if (err) {
				error = new ApiError(err, apiCodes.PROCESSING_ERROR);
			} else {
				error = new ApiError(data.message, apiCodes.PROCESSING_ERROR);
			}

			context.statusCode = error.code;
			delete error.code;
			return next(error);
		},
	]);
};

module.exports = TransactionsController;
