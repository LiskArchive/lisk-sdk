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
	const header1 = chain.BlockHeader.fromBytes(
		Buffer.from(
			'080010fe86b28b06180022002a003220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8554220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855480050005a20f8da7f49e92286b0129fd75a9208eed942ef1d79df93c42c9b87e8b6bb9fc84f6206080012001a006a00',
			'hex',
		),
	);
	const header2 = chain.BlockHeader.fromBytes(
		Buffer.from(
			'080010bb87b28b06180022002a003220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8554220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855480050005a20d800954794e0882c2419fe4736c2a191e6515859a7a894043ba5c911da6b72e76206080012001a006a00',
			'hex',
		),
	);

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
