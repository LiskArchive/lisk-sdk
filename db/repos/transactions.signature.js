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

var columnSet;

/**
 * Signatures transactions database interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires lodash
 * @requires helpers/transaction_types
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a SignatureTransactionsRepo
 */
function SignatureTransactionsRepo(db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'signatures';

	this.dbFields = ['transactionId', 'publicKey'];

	if (!columnSet) {
		columnSet = {};
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {
			table: this.dbTable,
		});
	}

	this.cs = columnSet;
}

/**
 * Save signature transactions.
 *
 * @param {Array} transactions
 * @returns {Promise}
 * @todo Add description for the params and the return value
 */
SignatureTransactionsRepo.prototype.save = function(transactions) {
	const query = () => {
		if (!_.isArray(transactions)) {
			transactions = [transactions];
		}

		transactions = transactions.map(transaction => ({
			transactionId: transaction.id,
			publicKey: Buffer.from(transaction.asset.signature.publicKey, 'hex'),
		}));

		return this.pgp.helpers.insert(transactions, this.cs.insert);
	};

	return this.db.none(query);
};

module.exports = SignatureTransactionsRepo;
