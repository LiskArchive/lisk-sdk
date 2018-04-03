'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	put: {
		id: 'dapps.put',
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			secondSecret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			category: {
				type: 'integer',
				minimum: 0,
				maximum: 8
			},
			name: {
				type: 'string',
				minLength: 1,
				maxLength: 32
			},
			description: {
				type: 'string',
				minLength: 0,
				maxLength: 160
			},
			tags: {
				type: 'string',
				minLength: 0,
				maxLength: 160
			},
			type: {
				type: 'integer',
				minimum: 0
			},
			link: {
				type: 'string',
				minLength: 1,
				maxLength: 2000
			},
			icon: {
				type: 'string',
				minLength: 1,
				maxLength: 2000
			}
		},
		required: ['secret', 'type', 'name', 'category']
	},
	get: {
		id: 'dapps.get',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
		required: ['id']
	},
	list: {
		id: 'dapps.list',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			category: {
				type: 'string',
				minLength: 1
			},
			name: {
				type: 'string',
				minLength: 1,
				maxLength: 32
			},
			type: {
				type: 'integer',
				minimum: 0
			},
			link: {
				type: 'string',
				minLength: 1,
				maxLength: 2000
			},
			icon: {
				type: 'string',
				minLength: 1,
				maxLength: 2000
			},
			orderBy: {
				type: 'string',
				minLength: 1
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100
			},
			offset: {
				type: 'integer',
				minimum: 0
			}
		}
	},
	launch: {
		id: 'dapps.launch',
		type: 'object',
		properties: {
			params: {
				type: 'array',
				minItems: 1
			},
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			master: {
				type: 'string',
				minLength: 0
			}
		},
		required: ['id']
	},
	addTransactions: {
		id: 'dapps.addTransactions',
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			amount: {
				type: 'integer',
				minimum: 1,
				maximum: constants.totalAmount
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			secondSecret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			dappId: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
		required: ['secret', 'amount', 'dappId']
	},
	sendWithdrawal: {
		id: 'dapps.sendWithdrawal',
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			amount: {
				type: 'integer',
				minimum: 1,
				maximum: constants.totalAmount
			},
			recipientId: {
				type: 'string',
				format: 'address',
				minLength: 1,
				maxLength: 22
			},
			secondSecret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			dappId: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			transactionId: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			}
		},
		required: ['secret', 'recipientId', 'amount', 'dappId', 'transactionId']
	},
	search: {
		id: 'dapps.search',
		type: 'object',
		properties: {
			q: {
				type: 'string',
				minLength: 1
			},
			category: {
				type: 'integer',
				minimum: 0,
				maximum: 8
			},
			installed: {
				type: 'integer',
				minimum: 0,
				maximum: 1
			}
		},
		required: ['q']
	},
	install: {
		id: 'dapps.install',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			master: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	},
	uninstall: {
		id: 'dapps.uninstall',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			master: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	},
	stop: {
		id: 'dapps.stop',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			master: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	}
};
