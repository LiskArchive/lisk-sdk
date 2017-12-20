'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	commonBlock: {
		id: 'transport.commonBlock',
		type: 'object',
		properties: {
			ids: {
				type: 'string',
				format: 'csv'
			}
		},
		required: ['ids']
	},
	blocks: {
		id: 'transport.blocks',
		type: 'object',
		properties: {
			lastBlockId: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
	},
	transactions: {
		id: 'transport.transactions',
		type: 'object',
		properties: {
			transactions: {
				type: 'array',
				minItems: 1,
				maxItems: 25
			}
		},
		required: ['transactions']
	},
	internalAccess: {
		id: 'transport.internalAccess',
		type: 'object',
		properties: {
			peer: {
				type: 'object'
			},
			authKey: {
				type: 'string'
			},
			updateType: {
				type: 'integer',
				minimum: 0,
				maximum: 1
			}
		},
		required: ['authKey', 'peer', 'updateType']
	}
};
