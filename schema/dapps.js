'use strict';

module.exports = {
	list: {
		id: 'dapps.list',
		type: 'object',
		properties: {
			transactionId: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			name: {
				type: 'string',
				minLength: 1,
				maxLength: 32
			},
			sort: {
				type: 'string',
				minLength: 1
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100
			},
			offset: {
				type: 'integer',
				minimum: 0
			}
		}
	}
};
