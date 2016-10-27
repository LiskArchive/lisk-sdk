'use strict';

module.exports = {
	headers: {
		id: 'transport.headers',
		type: 'object',
		properties: {
			ip: {
				type: 'string',
				format: 'ip'
			},
			port: {
				type: 'integer',
				minimum: 1,
				maximum: 65535
			},
			os: {
				type: 'string',
				format: 'os',
				maxLength: 64
			},
			version: {
				type: 'string',
				format: 'version'
			},
			nethash: {
				type: 'string',
				maxLength: 64
			},
			broadhash: {
				type: 'string',
				format: 'hex'
			},
			height: {
				type: 'integer',
				minimum: 1
			}
		},
		required: ['ip', 'port', 'version', 'nethash']
	},
	commonBlock: {
		id: 'transport.commonBlock',
		type: 'object',
		properties: {
			ids: {
				type: 'string',
				format: 'csv'
			}
		},
		required: ['ids']
	},
	blocks: {
		id: 'transport.blocks',
		type: 'object',
		properties: {
			lastBlockId: {
				type: 'string'
			}
		},
	},
	signatures: {
		id: 'transport.signatures',
		type: 'object',
		properties: {
			signature: {
				type: 'object',
				properties: {
					transaction: {
						type: 'string'
					},
					signature: {
						type: 'string',
						format: 'signature'
					}
				},
				required: ['transaction', 'signature']
			}
		},
		required: ['signature']
	}
};
