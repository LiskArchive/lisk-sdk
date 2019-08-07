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

const { omitBy, isNull } = require('lodash');

class TransactionInterfaceAdapter {
	constructor(registeredTransactions = {}) {
		this.transactionClassMap = new Map();
		Object.keys(registeredTransactions).forEach(transactionType => {
			this.transactionClassMap.set(
				Number(transactionType),
				registeredTransactions[transactionType],
			);
		});
	}

	fromBlock(block) {
		const transactions = block.transactions || [];

		const response = transactions.map(transaction =>
			this.fromJson(transaction),
		);

		return response;
	}

	fromJson(rawTx) {
		const TransactionClass = this.transactionClassMap.get(rawTx.type);

		if (!TransactionClass) {
			throw new Error('Transaction type not found.');
		}

		return new TransactionClass(rawTx);
	}

	// TODO: remove after https://github.com/LiskHQ/lisk/issues/2424
	dbRead(raw) {
		if (
			raw.t_id === undefined ||
			raw.t_id === null ||
			raw.t_type === undefined ||
			raw.t_type === null
		) {
			return null;
		}
		const TransactionClass = this.transactionClassMap.get(raw.t_type);

		if (!TransactionClass) {
			return null;
		}

		const transactionJSON = new TransactionClass().fromSync(raw);

		return this.fromJson(omitBy(transactionJSON, isNull));
	}
}

module.exports = {
	TransactionInterfaceAdapter,
};
