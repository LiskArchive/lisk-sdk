'use strict';

module.exports = {
	loadSignatures: {
		id: 'loader.loadSignatures',
		type: 'object',
		properties: {
			signatures: {
				type: 'array',
				uniqueItems: true
			}
		},
		required: ['signatures']
	},
	loadUnconfirmedTransactions: {
		id: 'loader.loadUnconfirmedTransactions',
		type: 'object',
		properties: {
			transactions: {
				type: 'array',
				uniqueItems: true
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
					uniqueItems: true
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
					type: 'string'
				},
				version: {
					type: 'string'
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
					minimum: 0
				}
			},
			required: ['height']
		}
	}
};
