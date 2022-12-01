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

import { ApplicationConfigForPlugin, testing } from 'lisk-sdk';
import { FaucetPlugin } from '../../../src/plugin';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};
const logger = testing.mocks.loggerMock;

const validOptions = {
	captchaSitekey: '123',
	captchaSecretkey: '123',
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
};

describe('FaucetPlugin', () => {
	describe('configSchema', () => {
		it('should return valid config schema with default options', () => {
			const plugin = new FaucetPlugin();

			expect(plugin.configSchema).toMatchSnapshot();
		});
	});

	describe('init', () => {
		it('should load default config', async () => {
			const plugin = new FaucetPlugin();
			plugin['_apiClient'] = {
				schema: {},
				invoke: jest.fn(),
			};
			await plugin.init({
				config: validOptions,
				appConfig: appConfigForPlugin,
				logger,
			});

			expect(plugin.config).toMatchSnapshot();
		});

		it('should throw error if valid options are not passed', async () => {
			const plugin = new FaucetPlugin();
			plugin['_apiClient'] = {
				schema: {},
				invoke: jest.fn(),
			};
			await expect(
				plugin.init({
					config: { captchaSitekey: '123', captchaSecretkey: '123' },
					appConfig: appConfigForPlugin,
					logger,
				}),
			).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nMissing property, must have required property 'encryptedPassphrase'",
			);
		});

		it('should load custom tokenPrefix', async () => {
			const plugin = new FaucetPlugin();
			plugin['_apiClient'] = {
				schema: {},
				invoke: jest.fn(),
			};
			await plugin.init({
				config: { ...validOptions, tokenPrefix: 'myToken' },
				appConfig: appConfigForPlugin,
				logger,
			});

			expect(plugin.config.tokenPrefix).toBe('myToken');
		});

		it('should load custom config values', async () => {
			const options = {
				...validOptions,
				tokenPrefix: 'myToken2',
				fee: '100000000',
				token: '1111111111111',
				captcha: { config: { value: 'value' } },
			} as never;
			const plugin = new FaucetPlugin();
			plugin['_apiClient'] = {
				schema: {},
				invoke: jest.fn(),
			};
			await plugin.init({
				config: options,
				appConfig: appConfigForPlugin,
				logger,
			});

			expect(plugin.config).toMatchObject(expect.objectContaining(options));
		});
	});
});
