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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');

/**
 * Executes each step from left to right and pipes the transactions that succeed to the next
 * step. Finally collects all responses and formats them accordingly.
 * @param steps
 * @returns {function(*=): {transactionsResponses: *[]}}
 */
const composeTransactionSteps = (...steps) => async transactions => {
	let failedResponses = [];
	const { transactionsResponses: successfulResponses } = await steps.reduce(
		async (previousValue, fn, index) => {
			if (index === 0) {
				// previousValue === transactions argument in the first iteration
				// First iteration includes raw transaction objects instead of formatted responses.
				return fn(previousValue);
			}

			const previousValueResponse = await previousValue;

			// Keep track of transactions that failed in the current step
			failedResponses = [
				...failedResponses,
				...previousValueResponse.transactionsResponses.filter(
					response => response.status === TransactionStatus.FAIL,
				),
			];

			// Return only transactions that succeeded to the next step
			return fn(
				transactions.filter(transaction =>
					previousValueResponse.transactionsResponses
						.filter(response => response.status === TransactionStatus.OK)
						.map(transactionResponse => transactionResponse.id)
						.includes(transaction.id),
				),
			);
		},
		transactions,
	);

	return {
		transactionsResponses: [...failedResponses, ...successfulResponses],
	};
};

module.exports = {
	composeTransactionSteps,
};
