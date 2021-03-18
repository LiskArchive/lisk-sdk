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
	$id: '#/plugins/lisk-faucet/config',
	type: 'object',
	properties: {
		encryptedPassphrase: {
			type: 'string',
			format: 'encryptedPassphrase',
			description: 'Encrypted passphrase of the genesis account',
		},
		applicationUrl: {
			type: 'string',
			format: 'uri',
			description: 'URL to connect',
		},
		fee: {
			type: 'string',
			description: 'The transaction fee used to faucet an account',
		},
		amount: {
			type: 'string',
			description: 'Number of tokens to fund an account per request',
		},
		tokenPrefix: {
			type: 'string',
			description: 'The token prefix associated with your application',
		},
		logoURL: {
			type: 'string',
			format: 'uri',
			description: 'The URL of the logo used on the UI',
		},
		captchaSecretkey: {
			type: 'string',
			description: 'The re-captcha secret key',
		},
		captchaSitekey: {
			type: 'string',
			description: 'The re-captcha site key',
		},
	},
	required: ['encryptedPassphrase'],
	default: {
		applicationUrl: 'ws://localhost:8080/ws',
		fee: (10 ** 8 * 0.1).toString(), // 0.1 LSK,
		amount: (10 ** 8 * 100).toString(), // 100 LSK,
		tokenPrefix: 'lsk',
		logoURL: undefined,
		captchaSitekey: undefined,
		captchaSecretkey: undefined,
	},
};
