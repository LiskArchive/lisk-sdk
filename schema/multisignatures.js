'use strict';

module.exports = {
	getAccounts: {
		id: 'multisignatures.getAccounts',
		type: 'object',
		properties: {
			publicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['publicKey']
	},
	pending: {
		id: 'multisignatures.pending',
		type: 'object',
		properties: {
			publicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['publicKey']
	},
	sign: {
		id: 'multisignatures.sign',
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			secondSecret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			transactionId: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
		required: ['transactionId', 'secret']
	},
	addMultisignature: {
		id: 'multisignatures.addMultisignature',
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
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
			min: {
				type: 'integer',
				minimum: 1,
				maximum: 16
			},
			lifetime: {
				type: 'integer',
				minimum: 1,
				maximum: 72
			},
			keysgroup: {
				type: 'array',
				minLength: 1,
				maxLength: 10
			}
		},
		required: ['min', 'lifetime', 'keysgroup', 'secret']
	}
};
