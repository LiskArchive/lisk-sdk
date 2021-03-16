/*
 * Copyright © 2021 Lisk Foundation
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

export const config = {
	$id: '#/plugins/lisk-dashboard/config',
	type: 'object',
	properties: {
		applicationUrl: {
			type: 'string',
			format: 'uri',
			description: 'URL to connect',
		},
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
		},
		host: {
			type: 'string',
			format: 'ip',
		},
	},
	required: [],
	default: {
		applicationUrl: 'ws://localhost:8080',
		port: 4000,
		host: '127.0.0.1',
	},
};
