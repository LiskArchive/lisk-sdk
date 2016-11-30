'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	getTransactions: {
		id: 'transactions.getTransactions',
		type: 'object',
		properties: {
			blockId: {
				type: 'string'
			},
			limit: {
				type: 'integer',
				minimum: 0,
				maximum: 100
			},
			type: {
				type: 'integer',
				minimum: 0,
				maximum: 10
			},
			orderBy: {
				type: 'string'
			},
			offset: {
				type: 'integer',
				minimum: 0
			},
			senderPublicKey: {
				type: 'string',
				format: 'publicKey'
			},
			ownerPublicKey: {
				type: 'string',
				format: 'publicKey'
			},
			ownerAddress: {
				type: 'string'
			},
			senderId: {
				type: 'string'
			},
			recipientId: {
				type: 'string'
			},
			amount: {
				type: 'integer',
				minimum: 0,
				maximum: constants.fixedPoint
			},
			fee: {
				type: 'integer',
				minimum: 0,
				maximum: constants.fixedPoint
			}
		}
	},
	getTransaction: {
		id: 'transactions.getTransaction',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	},
	getUnconfirmedTransaction: {
		id: 'transactions.getUnconfirmedTransaction',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	},
	getUnconfirmedTransactions: {
		id: 'transactions.getUnconfirmedTransactions',
		type: 'object',
		properties: {
			senderPublicKey: {
				type: 'string',
				format: 'publicKey'
			},
			address: {
				type: 'string'
			}
		}
	},
	addTransactions: {
		id: 'transactions.addTransactions',
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			amount: {
				type: 'integer',
				minimum: 1,
				maximum: constants.totalAmount
			},
			recipientId: {
				type: 'string',
				minLength: 1
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			secondSecret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			multisigAccountPublicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['secret', 'amount', 'recipientId']
	}
};
