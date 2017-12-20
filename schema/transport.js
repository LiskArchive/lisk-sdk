'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
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
