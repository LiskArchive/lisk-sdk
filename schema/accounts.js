'use strict';

module.exports = {
	getBalance: {
		id: 'accounts.getBalance',
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
	getPublicKey: {
		id: 'accounts.getPublickey',
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
	getAccount: {
		id: 'accounts.getAccount',
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
			}
		}
	},
	top: {
		id: 'accounts.top',
		type: 'object',
		properties: {
			limit: {
				type: 'integer',
				minimum: 0,
				maximum: 100
			},
			offset: {
				type: 'integer',
				minimum: 0
			}
		}
	}
};
