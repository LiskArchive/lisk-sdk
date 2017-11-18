'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	getAccounts: {
		id: 'accounts.getAccounts',
		type: 'object',
		properties: {
			address: {
				type: 'string',
				format: 'address',
				minLength: 1,
				maxLength: 22
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			secondPublicKey: {
				type: 'string',
				format: 'publicKey'
			},
			username: {
				type: 'string',
				format: 'username',
				minLength: 1,
				maxLength: 20
			},
			sort: {
				type: 'string'
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: constants.activeDelegates
			},
			offset: {
				type: 'integer',
				minimum: 0
			}
		}
	}
};
