'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	getTransactions: {
		id: 'transactions.getTransactions',
		type: 'object',
		properties: {
			blockId: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			type: {
				type: 'integer',
				minimum: 0,
				maximum: 10
			},
			senderId: {
				type: 'string',
				format: 'address',
				minLength: 1,
				maxLength: 22
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
				type: 'string',
				format: 'address',
				minLength: 1,
				maxLength: 22
			},
			recipientId: {
				type: 'string',
				format: 'address',
				minLength: 1,
				maxLength: 22
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
			},
			senderPublicKeys: {
				type: 'array',
				minLength: 1,
				'items': {
					type: 'string',
					format: 'publicKey'
				}
			},
			recipientPublicKeys: {
				type: 'array',
				minLength: 1,
				'items': {
					type: 'string',
					format: 'publicKey'
				}
			},
			senderIds: {
				type: 'array',
				minLength: 1,
				'items': {
					type: 'string',
					format: 'address',
					minLength: 1,
					maxLength: 22
				}
			},
			recipientIds: {
				type: 'array',
				minLength: 1,
				'items': {
					type: 'string',
					format: 'address',
					minLength: 1,
					maxLength: 22
				}
			},
			fromHeight: {
				type: 'integer',
				minimum: 1
			},
			toHeight: {
				type: 'integer',
				minimum: 1
			},
			fromTimestamp: {
				type: 'integer',
				minimum: 0
			},
			toTimestamp: {
				type: 'integer',
				minimum: 1
			},
			fromUnixTime: {
				type: 'integer',
				minimum: (constants.epochTime.getTime() / 1000)
			},
			toUnixTime: {
				type: 'integer',
				minimum: (constants.epochTime.getTime() / 1000 + 1)
			},
			minAmount: {
				type: 'integer',
				minimum: 0
			},
			maxAmount: {
				type: 'integer',
				minimum: 1
			},
			minConfirmations: {
				type: 'integer',
				minimum: 0
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
	},
	getTransaction: {
		id: 'transactions.getTransaction',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
		required: ['id']
	},
	getPooledTransaction: {
		id: 'transactions.getPooledTransaction',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
		required: ['id']
	},
	getPooledTransactions: {
		id: 'transactions.getPooledTransactions',
		type: 'object',
		properties: {
			senderPublicKey: {
				type: 'string',
				format: 'publicKey'
			},
			address: {
				type: 'string',
				format: 'address',
				minLength: 1,
				maxLength: 22
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
				format: 'address',
				minLength: 1,
				maxLength: 22
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
