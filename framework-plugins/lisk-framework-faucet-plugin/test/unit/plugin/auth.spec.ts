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
		await faucetPlugin.init({
			config: {
				...validPluginOptions,
				encryptedPassphrase:
					'iterations=1000000&cipherText=a31a3324ce12664a396329&iv=b476ef9d377397f4f9b0c1ae&salt=d81787ca5103be883a01d211746b1c3f&tag=e352880bb05a03bafc98af48b924fbf9&version=1',
			},
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger,
		});
	});

	it('should disable faucet when enable=false', async () => {
		const params = {
			enable: false,
			password: '123',
		};
		const response = await faucetPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully disabled the faucet.');
	});

	it('should enable the faucet when enable=true', async () => {
		const params = {
			enable: true,
			password: '123',
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
