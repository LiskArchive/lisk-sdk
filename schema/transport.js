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
	}
};
