'use strict';

module.exports = {
	headers: {
		id: 'transport.headers',
		type: 'object',
		properties: {
			port: {
				type: 'integer',
				minimum: 1,
				maximum: 65535
			},
			os: {
				type: 'string',
				maxLength: 64
			},
			nethash: {
				type: 'string',
				maxLength: 64
			},
			version: {
				type: 'string',
				maxLength: 11
			}
		},
		required: ['port', 'nethash', 'version']
	},
	commonBlock: {
		query: {
			id: 'transport.commonBlock.query',
			type: 'object',
			properties: {
				ids: {
					type: 'string',
					format: 'splitarray'
				}
			},
			required: ['ids']
		},
		result: {
			id: 'transport.commonBlock.result',
			type: 'object',
			properties: {
				port: {
					type: 'integer',
					minimum: 1,
					maximum: 65535
				}
			},
			required: ['port']
		}
	},
	blocks: {
		query: {
			id: 'transport.blocks.query',
			type: 'object',
			properties: {
				lastBlockId: {
					type: 'string'
				}
			}
		},
		result:	{
			id: 'transport.blocks.result',
			type: 'object',
			properties: {
				port: {
					type: 'integer',
					minimum: 1,
					maximum: 65535
				},
				nethash: {
					type: 'string',
					maxLength: 64
				}
			},
			required: ['port','nethash']
		}
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
	},
	transactions: {
		id: 'transport.transactions',
		type: 'object',
		properties: {
			port: {
				type: 'integer',
				minimum: 1,
				maximum: 65535
			},
			nethash: {
				type: 'string',
				maxLength: 64
			}
		},
		required: ['port','nethash']
	},
	getFromPeer: {
		id: 'transport.getFromPeer',
		type: 'object',
		properties: {
			os: {
				type: 'string',
				maxLength: 64
			},
			port: {
				type: 'integer',
				minimum: 1,
				maximum: 65535
			},
			nethash: {
				type: 'string',
				maxLength: 64
			},
			version: {
				type: 'string',
				maxLength: 11
			}
		},
		required: ['port', 'nethash', 'version']
	}
};
