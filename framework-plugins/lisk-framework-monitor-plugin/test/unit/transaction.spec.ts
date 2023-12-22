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
import { testing, Types } from 'lisk-sdk';
import { MonitorPlugin } from '../../src/monitor_plugin';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: Types.ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const validPluginOptions = configSchema.default;

describe('_handlePostTransactionAnnounce', () => {
	let monitorPluginInstance: MonitorPlugin;

	beforeEach(async () => {
		monitorPluginInstance = new MonitorPlugin();
		monitorPluginInstance['_apiClient'] = {
			invoke: jest.fn(),
		};
		await monitorPluginInstance.init({
			config: validPluginOptions,
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
	beforeEach(async () => {
		monitorPluginInstance = new MonitorPlugin();
		monitorPluginInstance['_apiClient'] = {
			invoke: jest.fn(),
		};
		await monitorPluginInstance.init({
			config: validPluginOptions,
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
