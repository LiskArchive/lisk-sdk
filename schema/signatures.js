'use strict';

module.exports = {
	addSignature: {
		id: 'signatures.addSignature',
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
			multisigAccountPublicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['secret', 'secondSecret']
	}
};
