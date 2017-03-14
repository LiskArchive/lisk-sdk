'use strict';

module.exports = {
	loadSignatures: {
		id: 'loader.loadSignatures',
		type: 'object',
		properties: {
			signatures: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100
			}
		},
		required: ['signatures']
	},
	loadTransactions: {
		id: 'loader.loadTransactions',
		type: 'object',
		properties: {
			transactions: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100
			}
		},
		required: ['transactions']
	}
};
