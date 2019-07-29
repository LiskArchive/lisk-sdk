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

const formatters = require('../formatters');

module.exports = {
	title: 'Command line arguments',
	anyOf: [
		{
			type: 'string',
			pattern: '^([-]{2}[a-z][a-z0-9-]*)(,[-][a-z]{1,1})?$',
		},
		{
			type: 'object',
			properties: {
				name: {
					type: 'string',
					pattern: '^([-]{2}[a-z][a-z0-9-]*)(,[-][a-z]{1,1})?$',
				},
				formatter: {
					type: 'string',
					enum: Object.keys(formatters),
				},
			},
			required: ['name'],
			additionalProperties: false,
		},
	],
};
