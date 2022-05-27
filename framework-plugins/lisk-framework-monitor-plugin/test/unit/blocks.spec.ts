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
import {
	BaseChannel,
	GenesisConfig,
	testing,
	ApplicationConfigForPlugin,
	chain,
	cryptography,
} from 'lisk-sdk';
import { when } from 'jest-when';
import { MonitorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	rootPath: '~/.lisk',
	label: 'my-app',
	system: {
		keepEventsForHeights: -1,
	},
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
	genesis: {} as GenesisConfig,
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
const validPluginOptions = configSchema.default;

describe('_handlePostBlock', () => {
	let monitorPlugin: MonitorPlugin;
	let encodedBlock: string;
	const {
		mocks: { channelMock },
	} = testing;
	const header = new chain.BlockHeader({
		generatorAddress: Buffer.alloc(0),
		height: 800000,
		version: 0,
		previousBlockID: Buffer.alloc(0),
		timestamp: Math.floor(Date.now() / 1000 - 24 * 60 * 60),
		stateRoot: cryptography.hash(Buffer.alloc(0)),
		eventRoot: cryptography.hash(Buffer.alloc(0)),
		maxHeightGenerated: 0,
		maxHeightPrevoted: 0,
		assetsRoot: cryptography.hash(Buffer.alloc(0)),
		validatorsHash: cryptography.getRandomBytes(32),
		aggregateCommit: {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		transactionRoot: cryptography.hash(Buffer.alloc(0)),
		signature: Buffer.alloc(0),
	});

	beforeEach(async () => {
		monitorPlugin = new MonitorPlugin();
		await monitorPlugin.init({
			config: validPluginOptions,
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger,
		});
		jest.spyOn(monitorPlugin['apiClient'], 'schemas', 'get').mockReturnValue({
			block: chain.blockSchema,
			blockHeader: chain.blockHeaderSchema,
		} as never);
		encodedBlock = new chain.Block(header, [], new chain.BlockAssets()).getBytes().toString('hex');

		when(jest.spyOn(monitorPlugin['apiClient'], 'invoke'))
			.calledWith('app_getConnectedPeers')
			.mockResolvedValue([] as never);
	});

	it('should update the plugin state with new block info', async () => {
		// Arrange
		const expectedState = {
			averageReceivedBlocks: 1,
			blocks: {
				[header.id.toString('hex')]: {
					count: 1,
					height: 800000,
				},
			},
			connectedPeers: 0,
		};

		// Act
		(monitorPlugin as any)._handlePostBlock({ block: encodedBlock });

		// Assert
		expect(await monitorPlugin.endpoint.getBlockStats({} as any)).toEqual(expectedState);
	});

	it('should remove blocks in state older than 300 blocks', () => {
		// Arrange
		(monitorPlugin as any)._state.blocks = { oldBlockId: { count: 1, height: 0 } };

		// Act
		(monitorPlugin as any)._handlePostBlock({ block: encodedBlock });

		// Assert
		expect((monitorPlugin as any)._state.blocks['oldBlockId']).toBeUndefined();
	});
});
