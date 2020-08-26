/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

export const schemas = {
	getBlocksFromIdRequest: {
		id: 'getBlocksFromIdRequest',
		type: 'object',
		required: ['blockId'],
		properties: {
			blockId: {
				type: 'string',
				format: 'base64',
			},
		},
	},
	getTransactionsRequest: {
		id: 'getTransactionsRequest',
		type: 'object',
		properties: {
			transactionIds: {
				type: 'array',
				items: {
					type: 'string',
					format: 'base64',
				},
			},
		},
	},
	postBlockEvent: {
		id: 'postBlockEvent',
		type: 'object',
		required: ['block'],
		properties: {
			block: {
				type: 'string',
				format: 'base64',
			},
		},
	},
	postTransactionsAnnouncementEvent: {
		id: 'postTransactionsAnnouncementEvent',
		type: 'object',
		required: ['transactionIds'],
		properties: {
			transactionIds: {
				type: 'array',
				items: {
					type: 'string',
					format: 'base64',
				},
				minItems: 1,
				maxItems: 100,
			},
		},
	},
	getHighestCommonBlockRequest: {
		id: 'getHighestCommonBlockRequest',
		type: 'object',
		required: ['ids'],
		properties: {
			ids: {
				type: 'array',
				items: {
					type: 'string',
					format: 'base64',
				},
				uniqueItems: true,
				minItems: 1,
			},
		},
	},
};
