'use strict';

module.exports = {
	getDelegates: {
		id: 'accounts.getDelegates',
		type: 'object',
		properties: {
			address: {
				type: 'string',
				format: 'address',
				minLength: 1,
				maxLength: 22
			}
		},
		required: ['address']
	},
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
				format: 'username'
			},
			orderBy: {
				type: 'string'
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 1000
			},
			offset: {
				type: 'integer',
				minimum: 0
			}
		}
	}
};
