'use strict';

module.exports = {
	updatePeerList: {
		peers: {
			id: 'peer.updatePeerList.peers',
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
			id: 'peer.updatePeerList.peer',
			type: 'object',
			properties: {
				ip: {
					type: 'string'
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
		}
	},
	getPeers: {
		id: 'peer.getPeers',
		type: 'object',
		properties: {
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
			},
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
			port: {
				type: 'integer',
				minimum: 1,
				maximum: 65535
			}
		}
	},
	getPeer: {
		id: 'peer.getPeer',
		type: 'object',
		properties: {
			ip: {
				type: 'string',
				minLength: 1
			},
			port: {
				type: 'integer',
				minimum: 0,
				maximum: 65535
			}
		},
		required: ['ip', 'port']
	}
};
