'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	loadBlocksFromPeer: {
		id: 'blocks.loadBlocksFromPeer',
		type: 'array'
	},
	getCommonBlock: {
		id: 'blocks.getCommonBlock',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			previousBlock: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			height: {
				type: 'integer',
				minimum: 1
			}
		},
		required: ['id', 'previousBlock', 'height']
	}
};
