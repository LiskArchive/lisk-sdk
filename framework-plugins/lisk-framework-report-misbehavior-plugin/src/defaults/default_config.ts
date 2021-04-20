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
		// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6201
		dataPath: {
			type: 'string',
			format: 'path',
			examples: ['~/.lisk/report-misbehavior'],
			description:
				'The data path for storing misbehavior related information captured from application.',
		},
		fee: {
			type: 'integer',
			description: 'The fee required to report misbehavior transaction.',
		},
	},
	required: [],
	default: {
		cleanupFrequency: 3600,
		encryptedPassphrase: '',
		defaultPassword: '',
		fee: 100000000,
	},
};
