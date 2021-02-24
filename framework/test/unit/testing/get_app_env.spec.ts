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
import { APIClient } from '@liskhq/lisk-api-client';
import { rmdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { getApplicationEnv } from '../../../src/testing';
import { Application, PartialApplicationConfig, TokenModule, DPoSModule } from '../../../src';
import { clearApplicationEnv } from '../../../src/testing/get_app_env';

const defaultConfig = {
	label: 'beta-sdk-app',
	version: '0.0.0',
	networkVersion: '1.0',
	rootPath: '~/.lisk',
	logger: {
		fileLogLevel: 'info',
		consoleLogLevel: 'info',
		logFileName: 'lisk.log',
	},
	rpc: {
		enable: false,
		mode: 'ipc',
		port: 8080,
	},
	genesisConfig: {
		blockTime: 10,
		communityIdentifier: 'sdk',
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		maxPayloadLength: 15 * 1024, // Kilo Bytes
		bftThreshold: 68,
		minFeePerByte: 1000,
		baseFees: [
			{
				moduleID: 5,
				assetID: 0,
				baseFee: '1000000000',
			},
		],
		rewards: {
			milestones: [
				'500000000', // Initial Reward
				'400000000', // Milestone 1
				'300000000', // Milestone 2
				'200000000', // Milestone 3
				'100000000', // Milestone 4
			],
			offset: 2160, // Start rewards at 39th block of 22nd round
			distance: 3000000, // Distance between each milestone
		},
		minRemainingBalance: '5000000',
		activeDelegates: 101,
		standbyDelegates: 2,
		delegateListRoundOffset: 2,
	},
	forging: {
		force: false,
		waitThreshold: 2,
		delegates: [], // Copy the delegates info from genesis.json file
	},
	network: {
		seedPeers: [
			{
				ip: '127.0.0.1',
				port: 5000,
			},
		],
		port: 5000,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	plugins: {},
};

const appLabel = 'beta-sdk-app';
const dataPath = join(homedir(), '.lisk', appLabel);

describe('Application Environment', () => {
	interface ApplicationEnv {
		apiClient: Promise<APIClient>;
		application: Application;
	}
	let appEnv: ApplicationEnv;
	let exitMock: jest.SpyInstance;

	beforeEach(() => {
		exitMock = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
		if (existsSync(dataPath)) {
			rmdirSync(dataPath, { recursive: true });
		}
	});

	afterEach(async () => {
		await clearApplicationEnv(appEnv);
		exitMock.mockRestore();
	});

	describe('Get Application Environment', () => {
		it('should return valid environment for empty modules', async () => {
			appEnv = await getApplicationEnv({ modules: [] });

			expect(appEnv.application).toBeDefined();
			expect(appEnv.apiClient).toBeDefined();
		});

		it('should return valid environment with custom module', async () => {
			appEnv = await getApplicationEnv({ modules: [TokenModule, DPoSModule] });

			expect(appEnv.application).toBeDefined();
			expect(appEnv.apiClient).toBeDefined();
		});

		it('should return valid environment with custom config', async () => {
			appEnv = await getApplicationEnv({
				modules: [],
				plugins: [],
				config: defaultConfig as PartialApplicationConfig,
			});

			expect(appEnv.application).toBeDefined();
			expect(appEnv.apiClient).toBeDefined();
		});
	});
});
