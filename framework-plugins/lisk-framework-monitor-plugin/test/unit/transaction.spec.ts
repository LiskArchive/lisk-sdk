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

import { randomBytes } from 'crypto';
import { testing, BaseChannel, GenesisConfig, ApplicationConfigForPlugin } from 'lisk-sdk';
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

describe('_handlePostTransactionAnnounce', () => {
	let monitorPluginInstance: MonitorPlugin;
	const {
		mocks: { channelMock },
	} = testing;

	beforeEach(async () => {
		monitorPluginInstance = new MonitorPlugin();
		await monitorPluginInstance.init({
			config: validPluginOptions,
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
	});

	it('should add new transactions to state', () => {
		// Arrange
		const transactionIds = [...Array(4).keys()].map(() => randomBytes(64).toString('hex'));
		const monitorInstance = monitorPluginInstance as any;
		// Act
		monitorInstance._handlePostTransactionAnnounce({ transactionIds });
		// Assert
		expect(Object.keys(monitorInstance._state.transactions)).toEqual(transactionIds);
	});

	it('should increment count for existing transaction id', () => {
		// Arrange
		const transactionIds = [...Array(4).keys()].map(() => randomBytes(64).toString('hex'));
		const MonitorInstance = monitorPluginInstance as any;
		// Act
		MonitorInstance._handlePostTransactionAnnounce({ transactionIds });
		MonitorInstance._handlePostTransactionAnnounce({ transactionIds: [transactionIds[0]] });
		// Assert
		expect(MonitorInstance._state.transactions[transactionIds[0]].count).toBe(2);
	});
});

describe('_cleanUpTransactionStats', () => {
	let monitorPluginInstance: MonitorPlugin;
	const {
		mocks: { channelMock },
	} = testing;

	beforeEach(async () => {
		monitorPluginInstance = new MonitorPlugin();
		await monitorPluginInstance.init({
			config: validPluginOptions,
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
	});

	it('should remove transaction stats that are more than 10 minutes old', () => {
		// Arrange
		const transactionIds = [...Array(4).keys()].map(() => randomBytes(64).toString('hex'));
		const monitorInstance = monitorPluginInstance as any;
		const now = Date.now();
		Date.now = jest.fn(() => now);
		// Act
		monitorInstance._handlePostTransactionAnnounce({ transactionIds });
		// Assert
		expect(Object.keys(monitorInstance._state.transactions)).toEqual(transactionIds);

		Date.now = jest.fn(() => now + 600001);

		const newTransactions = [randomBytes(64).toString('hex'), randomBytes(64).toString('hex')];

		monitorInstance._handlePostTransactionAnnounce({ transactionIds: newTransactions });

		expect(Object.keys(monitorInstance._state.transactions)).toEqual(newTransactions);
	});
});
