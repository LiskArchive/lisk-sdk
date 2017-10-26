'use strict';

module.exports = {
	getVoters: {
		id: 'delegates.getVoters',
		type: 'object',
		properties: {
			address: {
				type: 'string',
				format: 'address',
				minLength: 2,
				maxLength: 22
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			username: {
				type: 'string',
				format: 'username',
				minLength: 1,
				maxLength: 20
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100
			},
			offset: {
				type: 'integer',
				minimum: 0
			},
			sort: {
				type: 'string'
			}
		},
		anyOf: [
			{required: ['address']},
			{required: ['publicKey']},
			{required: ['username']}
		]
	}
};
