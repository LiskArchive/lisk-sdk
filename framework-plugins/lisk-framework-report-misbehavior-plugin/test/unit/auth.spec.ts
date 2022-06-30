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

import { ApplicationConfigForPlugin, BaseChannel, GenesisConfig, testing } from 'lisk-sdk';
import { ReportMisbehaviorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	rootPath: '~/.lisk',
	label: 'my-app',
	logger: {
		consoleLogLevel: 'info',
		fileLogLevel: 'none',
		logFileName: 'plugin-MisbehaviourPlugin.log',
	},
	system: {
		keepEventsForHeights: -1,
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
	genesis: {} as GenesisConfig,
};

const validPluginOptions = {
	...configSchema.default,
	encryptedPassphrase:
		'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=da48673c7ba936b378eda567185e2eb234e64b9cd94c939d8fb486eebebbdfe7c173aa1fa10d690fd2f8e8eec9a4d8bad587d0ba48734a233626ee0a1f6e808c85aa879f2d0f7bc193da4b79921c6e8e&mac=fab6e036709b9950741677c8485f8eaa18c34e3b976221568f36b1a1b8b9e6ce&salt=cb004448538cb456114289fdf9e46104&iv=594001b8b4773ecae8137580&tag=394a9c4e96c7770436a3171452b0a348&iterations=1&parallelism=4&memorySize=2024',
	dataPath: '/my/app',
};

const channelMock = {
	invoke: jest.fn(),
	once: jest.fn().mockImplementation((_eventName, cb) => cb()),
};

describe('auth action', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;

	beforeEach(async () => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
		await reportMisbehaviorPlugin.init({
			config: {
				...validPluginOptions,
				encryptedPassphrase:
					'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=da48673c7ba936b378eda567185e2eb234e64b9cd94c939d8fb486eebebbdfe7c173aa1fa10d690fd2f8e8eec9a4d8bad587d0ba48734a233626ee0a1f6e808c85aa879f2d0f7bc193da4b79921c6e8e&mac=fab6e036709b9950741677c8485f8eaa18c34e3b976221568f36b1a1b8b9e6ce&salt=cb004448538cb456114289fdf9e46104&iv=594001b8b4773ecae8137580&tag=394a9c4e96c7770436a3171452b0a348&iterations=1&parallelism=4&memorySize=2024',
			},
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
	});

	it('should disable the reporting when enable=false', async () => {
		const params = {
			enable: false,
			password: 'testpassword',
		};
		const response = await reportMisbehaviorPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully disabled the reporting of misbehavior.');
	});

	it('should enable the reporting when enable=true', async () => {
		const params = {
			enable: true,
			password: 'testpassword',
		};
		const response = await reportMisbehaviorPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully enabled the reporting of misbehavior.');
	});

	it('should fail when encrypted passphrase does not match with password given', async () => {
		const params = {
			enable: true,
			password: '1234',
		};

		await expect(reportMisbehaviorPlugin.endpoint.authorize({ params } as any)).rejects.toThrow(
			'Password given is not valid.',
		);
	});
});
