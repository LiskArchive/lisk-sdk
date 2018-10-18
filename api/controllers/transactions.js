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

var _ = require('lodash');
var swaggerHelper = require('../../helpers/swagger');
var ApiError = require('../../helpers/api_error');

// Private Fields
var modules;

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
	modules = scope.modules;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
TransactionsController.getTransactions = function(context, next) {
	var invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	var params = context.request.swagger.params;

	var filters = {
		senderIdOrRecipientId: params.senderIdOrRecipientId.value,
		id: params.id.value,
		blockId: params.blockId.value,
		recipientId: params.recipientId.value,
		recipientPublicKey: params.recipientPublicKey.value,
		senderId: params.senderId.value,
		senderPublicKey: params.senderPublicKey.value,
		type: params.type.value,
		fromHeight: params.height.value,
		toHeight: params.height.value,
		fromTimestamp: params.fromTimestamp.value,
		toTimestamp: params.toTimestamp.value,
		minAmount: params.minAmount.value,
		maxAmount: params.maxAmount.value,
		data: params.data.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	modules.transactions.shared.getTransactions(_.clone(filters), (err, data) => {
		if (err) {
			return next(err);
		}

		var transactions = _.map(_.cloneDeep(data.transactions), transaction => {
			transaction.senderId = transaction.senderId || '';
			transaction.recipientId = transaction.recipientId || '';
			transaction.recipientPublicKey = transaction.recipientPublicKey || '';

			transaction.amount = transaction.amount.toString();
			transaction.fee = transaction.fee.toString();

			return transaction;
		});

		next(null, {
			data: transactions,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
				count: parseInt(data.count),
			},
		});
	});
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
TransactionsController.postTransaction = function(context, next) {
	var transaction = context.request.swagger.params.transaction.value;

	modules.transactions.shared.postTransaction(transaction, (err, data) => {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = err.code;
				delete err.code;
			}

			return next(err);
		}

		next(null, {
			data: { message: data },
			meta: { status: true },
		});
	});
};

module.exports = TransactionsController;
