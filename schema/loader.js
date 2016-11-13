'use strict';

module.exports = {
	loadSignatures: {
		id: 'loader.loadSignatures',
		type: 'object',
		properties: {
			signatures: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100
			}
		},
		required: ['signatures']
	},
	loadTransactions: {
		id: 'loader.loadTransactions',
		type: 'object',
		properties: {
			transactions: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100
			}
		},
		required: ['transactions']
	},
	getNetwork: {
		peers: {
			id: 'loader.getNetwork.peers',
			type: 'object',
			properties: {
				peers: {
					type: 'array',
					uniqueItems: true,
					maxItems: 100
				}
			},
			required: ['peers']
		},
		peer: {
			id: 'loader.getNetwork.peer',
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
				state: {
					type: 'integer',
					minimum: 0,
					maximum: 3
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
				broadhash: {
					type: 'string',
					format: 'hex'
				},
				height: {
					type: 'integer',
					minimum: 1
				}
			},
			required: ['ip', 'port', 'state']
		},
		height: {
			id: 'loader.getNetwork.height',
			type: 'object',
			properties: {
				height: {
					type: 'integer',
					minimum: 1
				}
			},
			required: ['height']
		}
	}
};
