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
				format: 'hex',
				minLength: 1,
				maxLength: 64,
				example:
					'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
			},
			height: {
				type: 'integer',
				example: 123,
				minimum: 1,
			},
			previousBlockId: {
				type: 'string',
				format: 'hex',
				example:
					'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
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
