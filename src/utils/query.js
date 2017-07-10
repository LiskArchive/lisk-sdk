'use strict';
const lisk = require('./liskInstance');

class Query {

	isBlockQuery (input) {
		return lisk.sendRequest('blocks/get', { id: input });
	}

	isAccountQuery (input) {
		return lisk.sendRequest('accounts', { address: input });
	}

	isTransactionQuery (input) {
		return lisk.sendRequest('transactions/get', { id: input });
	}

	isDelegateQuery (input) {
		return lisk.sendRequest('delegates/get', { username: input });
	}

}

module.exports = new Query();
