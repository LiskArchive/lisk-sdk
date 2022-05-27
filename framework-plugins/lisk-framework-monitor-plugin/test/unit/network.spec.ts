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
import { when } from 'jest-when';
import { PeerInfo } from '../../src/types';
import { MonitorPlugin } from '../../src';
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

describe('networkStats', () => {
	let monitorPlugin: MonitorPlugin;
	const {
		mocks: { channelMock },
	} = testing;

	const connectedPeers: Partial<PeerInfo>[] = [
		{ options: { height: 51 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 49 } },
		{ options: { height: 0 } },
		{ options: { height: 23 } },
		{ options: { height: 23 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 55 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
	]; // Majority is of 7 peers with height 52

	const disconnectedPeers: Partial<PeerInfo>[] = [
		{
			ipAddress: '127.0.0.1',
			port: 5004,
			options: { height: 2 },
		},
		{
			ipAddress: '127.0.0.1',
			port: 5005,
			options: { height: 34 },
		},
		{
			ipAddress: '127.0.0.1',
			port: 5006,
			options: { height: 51 },
		},
	];

	const defaultNetworkStats = {
		startTime: Date.now(),
		incoming: {
			count: 0,
			connects: 0,
			disconnects: 0,
		},
		outgoing: {
			count: 0,
			connects: 0,
			disconnects: 0,
		},
		banning: {
			bannedPeers: {},
			count: 0,
		},
		totalErrors: 0,
		totalPeersDiscovered: 0,
		totalRemovedPeers: 0,
		totalMessagesReceived: {},
		totalRequestsReceived: {},
		majorityHeight: { height: 52, count: 7 },
		totalPeers: {
			connected: connectedPeers.length,
			disconnected: disconnectedPeers.length,
		},
	};

	beforeEach(async () => {
		monitorPlugin = new MonitorPlugin();
		await monitorPlugin.init({
			config: validPluginOptions,
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});

		when(jest.spyOn(monitorPlugin['apiClient'], 'invoke'))
			.calledWith('app_getNetworkStats')
			.mockResolvedValue(defaultNetworkStats as never)
			.calledWith('app_getConnectedPeers')
			.mockResolvedValue(connectedPeers as never)
			.calledWith('app_getDisconnectedPeers')
			.mockResolvedValue(disconnectedPeers as never);
	});

	it('should add new transactions to state', async () => {
		// Act
		const networkStats = await monitorPlugin.endpoint.getNetworkStats({} as any);
		// Assert
		expect(networkStats).toEqual(defaultNetworkStats);
	});

	it('should throw error when any channel action fails', async () => {
		// Arrange
		const error = new Error('Something went wrong');
		(monitorPlugin['apiClient'].invoke as any).mockRejectedValue(error);

		// Assert
		await expect(monitorPlugin.endpoint.getNetworkStats({} as any)).rejects.toThrow(error.message);
	});
});
