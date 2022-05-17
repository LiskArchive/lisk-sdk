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
import { testing, BaseChannel, GenesisConfig, ApplicationConfigForPlugin } from 'lisk-sdk';
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

describe('subscribe to event', () => {
	let monitorPlugin: MonitorPlugin;
	let subscribeMock: jest.Mock;
	const {
		mocks: { channelMock },
	} = testing;

	beforeEach(async () => {
		subscribeMock = jest.fn();
		channelMock.subscribe = subscribeMock;
		monitorPlugin = new MonitorPlugin();
		await monitorPlugin.init({
			config: validPluginOptions,
			channel: (channelMock as unknown) as BaseChannel,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
		(monitorPlugin as any)._channel = channelMock;
	});

	it('should register listener to networkEvent', () => {
		// Act
		monitorPlugin['_subscribeToEvents']();
		// Assert
		expect(subscribeMock).toHaveBeenCalledTimes(2);
		expect(subscribeMock).toHaveBeenCalledWith('app_networkEvent', expect.any(Function));
	});

	it('should not handle block when data is invalid', () => {
		// Arrange
		jest.spyOn(monitorPlugin as any, '_handlePostBlock');
		// Act
		monitorPlugin['_subscribeToEvents']();
		subscribeMock.mock.calls[0][1]({ event: 'postBlock', data: null });
		// Assert
		expect(monitorPlugin['_handlePostBlock']).not.toHaveBeenCalled();
	});

	it('should not handle transaction when data is invalid', () => {
		// Arrange
		jest.spyOn(monitorPlugin as any, '_handlePostTransactionAnnounce');
		// Act
		monitorPlugin['_subscribeToEvents']();
		subscribeMock.mock.calls[0][1]({
			event: 'postTransactionsAnnouncement',
			data: { transactionIds: [1, 2, 3] },
		});
		// Assert
		expect(monitorPlugin['_handlePostTransactionAnnounce']).not.toHaveBeenCalled();
	});
});
