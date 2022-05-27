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
	chain,
	cryptography,
	testing,
	ApplicationConfigForPlugin,
} from 'lisk-sdk';
import { MonitorPlugin } from '../../src/monitor_plugin';
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
const validPluginOptions = configSchema.default;
const logger = testing.mocks.loggerMock;

describe('_handleFork', () => {
	let monitorPluginInstance: MonitorPlugin;
	let encodedBlock: string;
	const {
		mocks: { channelMock },
	} = testing;
	const mockHeader = new chain.BlockHeader({
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
		monitorPluginInstance = new MonitorPlugin();
		await monitorPluginInstance.init({
			config: validPluginOptions,
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger,
		});
		jest.spyOn(monitorPluginInstance['apiClient'], 'schemas', 'get').mockReturnValue({
			block: chain.blockSchema,
			blockHeader: chain.blockHeaderSchema,
		} as never);
		encodedBlock = new chain.Block(mockHeader, [], new chain.BlockAssets())
			.getBytes()
			.toString('hex');
	});

	it('should add new fork events to state', () => {
		const monitorInstance = monitorPluginInstance as any;
		monitorInstance._handleFork(encodedBlock);

		expect(monitorInstance._state.forks.forkEventCount).toEqual(1);
	});

	it('should add new block headers for each fork event', () => {
		const monitorInstance = monitorPluginInstance as any;
		monitorInstance._handleFork(encodedBlock);

		expect(
			monitorInstance._state.forks.blockHeaders[mockHeader.id.toString('hex')].blockHeader,
		).toEqual(mockHeader);
	});
});
