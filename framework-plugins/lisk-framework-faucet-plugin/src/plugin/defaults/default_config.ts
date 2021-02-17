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

export const defaultConfig = {
	type: 'object',
	properties: {
		encryptedPassphrase: {
			type: 'string',
			format: 'encryptedPassphrase',
		},
		defaultPassword: {
			type: 'string',
		},
		applicationURL: {
			type: 'integer',
			example: 'ws://localhost:8080',
			description: 'The api client URL to connect with blockchain application instance.',
		},
		fee: {
			type: 'integer',
			description: 'The fee required to process the token distribution.',
		},
		tokensToDistribute: {
			type: 'integer',
			description: 'The number of tokens to distribute for the users.',
		},
		tokenPrefix: {
			type: 'string',
			description: 'The blockchain application custom token prefix.',
		},
		logoURL: {
			type: 'string',
			description: 'The custom logo URL for the faucet application.',
		},
		captcha: {
			type: 'object',
			properties: {
				publicKey: {
					type: 'string',
				},
				privateKey: {
					type: 'string',
				},
			},
		},
	},
	required: ['encryptedPassphrase', 'defaultPassword'],
	default: {
		applicationURL: 'ws://localhost:8080',
		fee: 100000000,
		tokensToDistribute: 100,
		tokenPrefix: 'lsk',
		logoURL: '',
		captcha: {},
	},
};
