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

import { ApplicationConfigForPlugin, BaseChannel, GenesisConfig, testing } from 'lisk-sdk';
import { FaucetPlugin } from '../../../src/plugin';
import { configSchema } from '../../../src/plugin/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	rootPath: '~/.lisk',
	label: 'my-app',
	system: {
		keepEventsForHeights: -1,
	},
	logger: {
		consoleLogLevel: 'debug',
		fileLogLevel: 'none',
		logFileName: 'plugin-FaucetPlugin.log',
	},
	rpc: {
		modes: ['ipc'],
		ws: {
			port: 8080,
			host: '127.0.0.1',
			path: '/ws',
		},
		http: {
			port: 8000,
			host: '127.0.0.1',
		},
	},
	genesis: {} as GenesisConfig,
	generation: {
		force: false,
		waitThreshold: 2,
		generators: [],
		modules: {},
	},
	network: {
		seedPeers: [],
		port: 5000,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	version: '',
	networkVersion: '',
};

const validPluginOptions = {
	...configSchema.default,
	captchaSitekey: '123',
	captchaSecretkey: '123',
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
	dataPath: '/my/app',
};

const channelMock = {
	invoke: jest.fn(),
	once: jest.fn().mockImplementation((_eventName, cb) => cb()),
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
				encryptedPassphrase:
					'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=bd65587de1b7b42e289693e8ac14561c7c77370ff158133c6eb512849353446b339f04c8f45b6b8cc72e5e8485dab4031d9f5e2d7cb9d424076401ea58dad6d4a348fc1f013ceb5d8bb314&mac=6e017e6b2a341db10b91440462fc2626fe6e4b711ea09f8df3ac1df42a6de572&salt=e9f564ce7f8392acb2691fb4953e17c0&iv=57124bb910dbf9e24e37d401&tag=b769dcbd4ad0d3f44041afe5322aad82&iterations=1&parallelism=4&memorySize=2024',
			},
			channel: (channelMock as unknown) as BaseChannel,
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
			password: '1234',
		};

		await expect(faucetPlugin.endpoint.authorize({ params } as any)).rejects.toThrow(
			'Password given is not valid.',
		);
	});
});
