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

'use strict';

module.exports = {
	CommonBlock: {
		id: 'CommonBlock',
		type: 'object',
		required: ['id', 'height', 'previousBlockId'],
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20,
				example: '6258354802676165798',
			},
			height: {
				type: 'integer',
				example: 123,
				minimum: 1,
			},
			previousBlockId: {
				type: 'string',
				format: 'id',
				example: '15918760246746894806',
			},
		},
	},
	WSBlocksList: {
		id: 'WSBlocksList',
		type: 'array',
		items: {
			type: 'object',
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
					format: 'id',
				},
				uniqueItems: true,
				minItems: 1,
			},
		},
	},
	WSTransactionsResponse: {
		id: 'WSTransactionsResponse',
		type: 'object',
		required: ['transactions'],
		properties: {
			transactions: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100,
				items: {
					type: 'object',
				},
			},
		},
	},
};
