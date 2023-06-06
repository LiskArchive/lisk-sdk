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

export const configSchema = {
	$id: '#/plugins/lisk-report-misbehavior/config',
	type: 'object',
	properties: {
		clearBlockHeadersInterval: {
			type: 'integer',
			description: 'Frequency of cleaning up the outdated data in second.',
		},
		encryptedPrivateKey: {
			type: 'string',
			description: 'Encrypted private key of the account sending transaction',
		},
		defaultPassword: {
			type: 'string',
		},
		fee: {
			type: 'integer',
			description: 'The fee required to report misbehavior transaction.',
		},
	},
	required: [],
	default: {
		clearBlockHeadersInterval: 60000,
		encryptedPrivateKey: '',
		defaultPassword: '',
		fee: 100000000,
	},
};

export const actionParamsSchema = {
	$id: '/lisk/reportMisbehavior/auth',
	type: 'object',
	required: ['password', 'enable'],
	properties: {
		password: {
			type: 'string',
		},
		enable: {
			type: 'boolean',
		},
	},
};
