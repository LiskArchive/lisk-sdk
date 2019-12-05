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
const path = require('path');
const {
	entities: { Transaction: TransactionEntity },
} = require('../../../../../components/storage');

const sqlFiles = {
	create: 'transactions/create.sql',
};

const trsCreateFields = [
	'id',
	'blockId',
	'type',
	'timestamp',
	'senderPublicKey',
	'senderId',
	'recipientId',
	'amount',
	'fee',
	'signature',
	'signSignature',
	'signatures',
	'asset',
	'transferData',
];

class ChainTransaction extends TransactionEntity {
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('transaction', sqlFiles, this.sqlDirectory);
	}

	create(data, _options, tx) {
		const transactions = ChainTransaction._sanitizeCreateData(data);

		const createSet = this.getValuesSet(transactions, trsCreateFields);

		return this.adapter.executeFile(
			this.SQLs.create,
			{ values: createSet, attributes: trsCreateFields },
			{ expectedResultCount: 0 },
			tx,
		);
	}

	static _sanitizeCreateData(data) {
		const transactions = Array.isArray(data)
			? _.cloneDeep(data)
			: [_.cloneDeep(data)];

		const recipientTransactionTypes = [0, 3, 8];

		transactions.forEach(transaction => {
			transaction.signatures = transaction.signatures
				? transaction.signatures.join()
				: null;

			if (recipientTransactionTypes.includes(transaction.type)) {
				transaction.amount = transaction.asset.amount.toString();
				transaction.recipientId = transaction.asset.recipientId;
			} else {
				transaction.recipientId = null;
				transaction.amount = 0;
			}

			transaction.fee = transaction.fee.toString();
			transaction.transferData = null;

			// Transfer data is bytea and can not be included as json when null byte is present
			const dataTransactionType = [0, 8];
			if (
				dataTransactionType.includes(transaction.type) &&
				transaction.asset &&
				transaction.asset.data
			) {
				transaction.transferData = Buffer.from(transaction.asset.data, 'utf8');
				delete transaction.asset;
			}

			// stringify should be done after converting asset.data into transferData
			transaction.asset = transaction.asset
				? JSON.stringify(transaction.asset)
				: null;
		});

		return transactions;
	}
}

module.exports = ChainTransaction;
