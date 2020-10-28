/*
 * Copyright © 2020 Lisk Foundation
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

export const defaultConfig = {
	type: 'object',
	properties: {
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			description: 'The http server port for report misbehavior plugin.',
		},
		cleanupFrequency: {
			type: 'integer',
			description: 'Frequency of cleaning up the outdated data in second.',
		},
		encryptedPassphrase: {
			type: 'string',
			format: 'encryptedPassphrase',
		},
		defaultPassword: {
			type: 'string',
		},
		whiteList: {
			type: 'array',
			items: {
				type: 'string',
			},
			description:
				'Explicitly allowing some identified entities access to repost misbehavior plugin endpoints.',
		},

		cors: {
			type: 'object',
			properties: {
				origin: {
					anyOf: [{ type: 'string' }, { type: 'boolean' }],
				},
				methods: {
					type: 'array',
				},
			},
			required: ['origin'],
		},
		dataPath: {
			type: 'string',
			format: 'path',
			example: '~/.lisk/report-misbehavior',
			description:
				'The data path for storing misbehavior related information captured from application.',
		},
		limits: {
			type: 'object',
			properties: {
				max: {
					type: 'integer',
				},
				delayMs: {
					type: 'integer',
				},
				delayAfter: {
					type: 'integer',
				},
				windowMs: {
					type: 'integer',
				},
				headersTimeout: {
					type: 'integer',
					minimum: 1,
					maximum: 40000,
				},
				serverSetTimeout: {
					type: 'integer',
					minimum: 1,
					maximum: 120000,
				},
			},
			required: ['max', 'delayMs', 'delayAfter', 'windowMs', 'headersTimeout', 'serverSetTimeout'],
		},
		fee: {
			type: 'integer',
			description: 'The fee required to report misbehavior transaction.',
		},
	},
	required: ['port', 'whiteList', 'dataPath', 'cors', 'limits'],
	default: {
		cleanupFrequency: 3600,
		encryptedPassphrase: '',
		defaultPassword: '',
		port: 4002,
		whiteList: ['127.0.0.1'],
		cors: {
			origin: '*',
			methods: ['GET', 'POST', 'PUT'],
		},
		limits: {
			max: 0,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 60000,
			headersTimeout: 5000,
			serverSetTimeout: 20000,
		},
		fee: 100000000,
	},
};
