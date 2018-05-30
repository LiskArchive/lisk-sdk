'use strict';

const getTransaction = require('../../utils/http').getTransaction;
const { confirmTransaction } = require('../../../common/utils/wait_for');

const confirmTransactionsOnAllNodes = function(transactions, params) {
	return confirmTransaction().then(() => {
		return Promise.all(
			_.flatMap(params.configurations, configuration => {
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
	});
};

module.exports = {
	confirmTransactionsOnAllNodes,
};
