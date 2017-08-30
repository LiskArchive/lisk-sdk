'use strict';

var constants = require('../helpers/constants.js');

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
				minimum: constants.multisigSchema.min.minimum,
				maximum: constants.multisigSchema.min.maximum
			},
			lifetime: {
				type: 'integer',
				minimum: constants.multisigSchema.lifetime.minimum,
				maximum: constants.multisigSchema.lifetime.maximum
			},
			keysgroup: {
				type: 'array',
				minItems: constants.multisigSchema.keysgroup.minItems,
				maxItems: constants.multisigSchema.keysgroup.maxItems
			}
		},
		required: ['min', 'lifetime', 'keysgroup', 'secret']
	}
};
