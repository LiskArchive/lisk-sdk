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

import { ApplicationConfigForPlugin, GenesisConfig, testing } from 'lisk-sdk';
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
		'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=11ac52fe63e95e996a845dbe01de2913fe16d7722008a998fbfb5722be1cb358d67810c7a71b22be167715018458d5705a8242ca18fcb9faa00b3b0dce57c2b7aa4c835b41529a0203598f10f5b8e911&mac=9f7f88d5f4e488dcc27d3d4a1176086e04a0f6ddf2f5bd90890e5002156dd096&salt=8e65503565a1f2352c13cf42c22e6f7c&iv=303a8a37e47fa8517c50fc00&tag=1f9c18ea7cb1dc64c5cabb7fa3ba73f5&iterations=1&parallelism=4&memorySize=2024',
	dataPath: '/my/app',
};

describe('auth action', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;

	beforeEach(async () => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
		await reportMisbehaviorPlugin.init({
			config: {
				...validPluginOptions,
			},
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
