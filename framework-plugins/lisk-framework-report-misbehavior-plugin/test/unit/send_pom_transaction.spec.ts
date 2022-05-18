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

import { BaseChannel, GenesisConfig, testing, chain, ApplicationConfigForPlugin } from 'lisk-sdk';
import { when } from 'jest-when';

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
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
	dataPath: '/my/app',
};

describe('Send PoM transaction', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;
	const defaultNetworkIdentifier =
		'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';
	const random32Bytes = Buffer.from(
		'3d1b5dd1ef4ff7b22359598ebdf58966a51adcc03e02ad356632743e65898990',
		'hex',
	);
	const random20Bytes = Buffer.from('40ff452fae2affe6eeef3c30e53e9eac35a1bc43', 'hex');
	const channelMock = {
		registerToBus: jest.fn(),
		once: jest.fn(),
		publish: jest.fn(),
		subscribe: jest.fn(),
		isValidEventName: jest.fn(),
		isValidActionName: jest.fn(),
		invoke: jest.fn(),
		eventsList: [],
		actionsList: [],
		actions: {},
		moduleName: '',
		options: {},
	} as any;
	const header1 = new chain.BlockHeader({
		height: 100,
		aggregateCommit: {
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
			height: 0,
		},
		generatorAddress: random20Bytes,
		maxHeightGenerated: 0,
		maxHeightPrevoted: 50,
		previousBlockID: random32Bytes,
		timestamp: 100,
		version: 2,
		assetsRoot: random32Bytes,
		eventRoot: random32Bytes,
		stateRoot: random32Bytes,
		transactionRoot: random32Bytes,
		validatorsHash: random32Bytes,
		signature: random32Bytes,
	});
	const header2 = new chain.BlockHeader({
		...header1.toObject(),
		height: 100,
		maxHeightPrevoted: 32,
	});

	beforeEach(async () => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
		await reportMisbehaviorPlugin.init({
			config: validPluginOptions,
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
		(reportMisbehaviorPlugin as any)._channel = channelMock;
		(reportMisbehaviorPlugin as any)._options = { fee: '100000000' };
		reportMisbehaviorPlugin['logger'] = {
			error: jest.fn(),
		} as any;
		jest.spyOn(reportMisbehaviorPlugin['apiClient'], 'schemas', 'get').mockReturnValue({
			block: chain.blockSchema,
			blockHeader: chain.blockHeaderSchema,
			transaction: chain.transactionSchema,
			commands: [
				{
					moduleID: 5,
					moduleName: 'dpos',
					commandID: 3,
					commandName: 'reportDelegateMisbehavior',
					schema: {
						$id: 'lisk/dpos/pom',
						type: 'object',
						required: ['header1', 'header2'],
						properties: {
							header1: {
								...chain.blockHeaderSchema,
								$id: 'block-header1',
								fieldNumber: 1,
							},
							header2: {
								...chain.blockHeaderSchema,
								$id: 'block-header2',
								fieldNumber: 2,
							},
						},
					},
				},
			],
		});
		(reportMisbehaviorPlugin as any)._state = {
			passphrase: testing.fixtures.defaultFaucetAccount.passphrase,
			publicKey: testing.fixtures.defaultFaucetAccount.publicKey,
		};

		when(jest.spyOn(reportMisbehaviorPlugin['apiClient'], 'invoke'))
			.calledWith('auth_getAuthAccount', expect.anything())
			.mockResolvedValue({ nonce: '0' } as never)
			.calledWith('app_getNodeInfo')
			.mockResolvedValue({ networkIdentifier: defaultNetworkIdentifier } as never);
	});

	it('should throw error when pom transaction params schema is not found', async () => {
		jest.spyOn(reportMisbehaviorPlugin['apiClient'], 'schemas', 'get').mockReturnValue({
			block: chain.blockSchema,
			blockHeader: chain.blockHeaderSchema,
			transaction: chain.transactionSchema,
			commands: [],
		});
		await expect(
			(reportMisbehaviorPlugin as any)._createPoMTransaction(header1, header2),
		).rejects.toThrow('PoM params schema is not registered in the application.');
	});

	it('should create pom transaction for given block headers', async () => {
		const pomTransaction = await (reportMisbehaviorPlugin as any)._createPoMTransaction(
			header1,
			header2,
		);
		expect(pomTransaction).toMatchSnapshot();
	});
});
