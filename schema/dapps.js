'use strict';

var constants = require('../helpers/constants.js');

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
			category: {
				type: 'string',
				minLength: 1
			},
			name: {
				type: 'string',
				minLength: 1,
				maxLength: 32
			},
			type: {
				type: 'integer',
				minimum: 0
			},
			orderBy: {
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
