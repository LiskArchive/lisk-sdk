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
import { configSchema } from '../../../src/plugin/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const validPluginOptions = {
	...configSchema.default,
	captchaSitekey: '123',
	captchaSecretkey: '123',
	encryptedPrivateKey:
		'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=99053afb5eb03999f06201a0099912cec7826cdc8d9f41fc64d575670128a532f922961353253b4e73815890ed210f637a98e5084e4521a1495f0b793184c5385a965fe70837a8a638f0667c8f803d84872274c4ddc046591c03bed5d141b2193358da2b8db4548ff2dd137dbc796b6fb29acc53362c3a1ea8dd212270a9e2c1&mac=909eba6a8b1b42812f3de13fcdcbe124acd52a40b7ca7e3e9179a2cb8bffa452&salt=082b9d532290492caa842b804517def0&iv=a2947e6a05031e5b4d250604&tag=ca7dab52dccfa9cdb6a74906e84ed625&iterations=1&parallelism=4&memorySize=2024',
	dataPath: '/my/app',
};

const logger = testing.mocks.loggerMock;

describe('auth action', () => {
	let faucetPlugin: FaucetPlugin;

	beforeEach(async () => {
		faucetPlugin = new FaucetPlugin();
		faucetPlugin['_apiClient'] = {
			schema: {},
			invoke: jest.fn(),
		};
		await faucetPlugin.init({
			config: {
				...validPluginOptions,
			},
			appConfig: appConfigForPlugin,
			logger,
		});
	});

	it('should disable faucet when enable=false', async () => {
		const params = {
			enable: false,
			password: 'elephant tree paris dragon chair galaxy',
		};
		const response = await faucetPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully disabled the faucet.');
	});

	it('should enable the faucet when enable=true', async () => {
		const params = {
			enable: true,
			password: 'elephant tree paris dragon chair galaxy',
		};
		const response = await faucetPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully enabled the faucet.');
	});

	it('should fail when encrypted passphrase does not match with password given', async () => {
		const params = {
			enable: true,
			password: '123',
		};

		await expect(faucetPlugin.endpoint.authorize({ params } as any)).rejects.toThrow(
			'Password given is not valid.',
		);
	});
});
