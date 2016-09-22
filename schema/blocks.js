'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	loadBlocksFromPeer: {
		id: 'blocks.loadBlocksFromPeer',
		type: 'array'
	},
	getBlock: {
		id: 'blocks.getBlock',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	},
	getBlocks: {
		id: 'blocks.getBlocks',
		type: 'object',
		properties: {
			limit: {
				type: 'integer',
				minimum: 0,
				maximum: 100
			},
			orderBy: {
				type: 'string'
			},
			offset: {
				type: 'integer',
				minimum: 0
			},
			generatorPublicKey: {
				type: 'string',
				format: 'publicKey'
			},
			totalAmount: {
				type: 'integer',
				minimum: 0,
				maximum: constants.totalAmount
			},
			totalFee: {
				type: 'integer',
				minimum: 0,
				maximum: constants.totalAmount
			},
			reward: {
				type: 'integer',
				minimum: 0
			},
			previousBlock: {
				type: 'string'
			},
			height: {
				type: 'integer'
			}
		}
	}
};
