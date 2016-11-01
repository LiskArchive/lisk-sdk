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
				minLength: 1,
				maxLength: 64
			},
			version: {
				type: 'string',
				format: 'version',
				minLength: 5,
				maxLength: 12
			},
			nethash: {
				type: 'string',
				maxLength: 64
			}
		},
		required: ['ip', 'port', 'nethash', 'version']
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
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
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
						type: 'string',
						format: 'id',
						minLength: 1,
						maxLength: 20
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
