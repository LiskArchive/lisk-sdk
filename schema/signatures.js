'use strict';

module.exports = {
	addSignature: {
		id: 'signatures.addSignature',
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1
			},
			secondSecret: {
				type: 'string',
				minLength: 1
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
