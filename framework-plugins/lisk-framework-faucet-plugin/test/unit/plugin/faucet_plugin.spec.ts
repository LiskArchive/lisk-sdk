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

const appConfigForPlugin: ApplicationConfigForPlugin = {
	rootPath: '~/.lisk',
	label: 'my-app',
	system: {
		keepEventsForHeights: -1,
	},
	logger: { consoleLogLevel: 'info', fileLogLevel: 'none', logFileName: 'plugin-FaucetPlugin.log' },
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
const logger = testing.mocks.loggerMock;

const validOptions = {
	captchaSitekey: '123',
	captchaSecretkey: '123',
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
};

const channelMock = {
	invoke: jest.fn(),
	once: jest.fn().mockImplementation((_eventName, cb) => cb()),
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
			await plugin.init({
				config: validOptions,
				channel: (channelMock as unknown) as BaseChannel,
				appConfig: appConfigForPlugin,
				logger,
			});

			expect(plugin.config).toMatchSnapshot();
		});

		it('should throw error if valid options are not passed', async () => {
			const plugin = new FaucetPlugin();
			await expect(
				plugin.init({
					config: { captchaSitekey: '123', captchaSecretkey: '123' },
					channel: (channelMock as unknown) as BaseChannel,
					appConfig: appConfigForPlugin,
					logger,
				}),
			).rejects.toThrow(
				"Lisk validator found 1 error[s]:\nMissing property, must have required property 'encryptedPassphrase'",
			);
		});

		it('should load custom tokenPrefix', async () => {
			const plugin = new FaucetPlugin();
			await plugin.init({
				config: { ...validOptions, tokenPrefix: 'myToken' },
				channel: (channelMock as unknown) as BaseChannel,
				appConfig: appConfigForPlugin,
				logger,
			});

			expect(plugin.config.tokenPrefix).toEqual('myToken');
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
			await plugin.init({
				config: options,
				channel: (channelMock as unknown) as BaseChannel,
				appConfig: appConfigForPlugin,
				logger,
			});

			expect(plugin.config).toMatchObject(expect.objectContaining(options));
		});
	});
});
