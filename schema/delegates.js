'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	forgingStatus: {
		id: 'delegates.forgingStatus',
		type: 'object',
		properties: {
			publicKey: {
				type: 'string',
				format: 'publicKey'
			}
		}
	},
	toggleForging: {
		id: 'delegates.toggleForging',
		type: 'object',
		properties: {
			key: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['key', 'publicKey']
	},
	getDelegates: {
		id: 'delegates.getDelegates',
		type: 'object',
		properties: {

			address: {
				type: 'string',
				format: 'address',
				minLength: 21,
				maxLength: 21
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
			search: {
				type: 'string',
				format: 'username',
				minLength: 1,
				maxLength: 20
			},
			rank: {
				type: 'number',
				minimum: 1
			},
			orderBy: {
				type: 'string'
			},
			limit: {
				type: 'number',
				minimum: 1,
				maximum: constants.activeDelegates
			},
			offset: {
				type: 'number',
				minimum: 0
			}
		}
	}
};
