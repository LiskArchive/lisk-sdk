'use strict';

var constants = require('../helpers/constants.js');
var transactionTypes = require('../helpers/transactionTypes.js');

module.exports = {
	getPooledTransaction: {
		id: 'transactions.getPooledTransaction',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
		required: ['id']
	}
};
