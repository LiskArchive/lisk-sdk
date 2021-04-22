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

import { FaucetPlugin } from '../../../src/plugin';

const validOptions = {
	captchaSitekey: '123',
	captchaSecretkey: '123',
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
};

describe('FaucetPlugin', () => {
	describe('defaults', () => {
		it('should return valid config schema with default options', () => {
			const plugin = new FaucetPlugin(validOptions as never);

			expect(plugin.defaults).toMatchSnapshot();
		});
	});

	describe('constructor', () => {
		it('should load default config', () => {
			const plugin = new FaucetPlugin(validOptions as never);

			expect(plugin.options).toMatchSnapshot();
		});

		it('should throw error if valid options are not passed', () => {
			expect(
				() => new FaucetPlugin({ captchaSitekey: '123', captchaSecretkey: '123' } as never),
			).toThrow(
				"Lisk validator found 1 error[s]:\nMissing property, must have required property 'encryptedPassphrase'",
			);
		});

		it('should load custom tokenPrefix', () => {
			const plugin = new FaucetPlugin({ ...validOptions, tokenPrefix: 'myToken' } as never);

			expect(plugin.options.tokenPrefix).toEqual('myToken');
		});

		it('should load custom config values', () => {
			const options = {
				...validOptions,
				tokenPrefix: 'myToken2',
				fee: '100000000',
				token: '1111111111111',
				captcha: { config: { value: 'value' } },
			} as never;
			const plugin = new FaucetPlugin(options);

			expect(plugin.options).toMatchObject(expect.objectContaining(options));
		});
	});
});
