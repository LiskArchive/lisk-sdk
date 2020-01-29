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
const swaggerHelper = require('../helpers/swagger');
const ApiError = require('../api_error');
const apiCodes = require('../api_codes');

const TRANSACTION_TYPES_DELEGATE = [2, 10];

let storage;
let channel;

function TransactionsController(scope) {
	({
		components: { storage },
		channel,
	} = scope);
}

function transactionFormatter(transaction) {
	const result = transaction;
	result.senderId = result.senderId || '';
	result.signSignature = result.signSignature || undefined;
	result.signatures = result.signatures || [];
	if (TRANSACTION_TYPES_DELEGATE.includes(transaction.type)) {
		result.asset.publicKey = result.senderPublicKey;
		result.asset.address = result.senderId;
	}

	return result;
}

TransactionsController.getTransactions = async (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

	let filters = {
		id: params.id.value,
		blockId: params.blockId.value,
		recipientId: params.recipientId.value,
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

TransactionsController.postTransaction = async (context, next) => {
	const transaction = context.request.swagger.params.transaction.value;
	let error;

	try {
		const data = await channel.invoke('app:postTransaction', { transaction });
		if (!data.errors) {
			return next(null, {
				data: { message: 'Transaction(s) accepted' },
				meta: { status: true },
			});
		}

		error = new ApiError(data.message, apiCodes.PROCESSING_ERROR, data.errors);
	} catch (err) {
		error = new ApiError(
			'Internal server error',
			apiCodes.INTERNAL_SERVER_ERROR,
			[err],
		);
	}

	context.statusCode = error.code;
	return next(error);
};

module.exports = TransactionsController;
