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

const getTransaction = require('./http').getTransaction;

module.exports = {
	confirmTransactionsOnAllNodes(transactions, configurations) {
		return Promise.all(
			_.flatMap(configurations, configuration => {
				return transactions.map(transaction => {
					return getTransaction(transaction.id, configuration.httpPort);
				});
			})
		).then(results => {
			results.forEach(transaction => {
				expect(transaction)
					.to.have.property('id')
					.that.is.an('string');
			});
		});
	},
};
