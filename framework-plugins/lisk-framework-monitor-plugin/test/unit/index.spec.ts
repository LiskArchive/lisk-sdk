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
import { MonitorPlugin } from '../../src/monitor_plugin';

describe('_handlePostTransactionAnnounce', () => {
	let MonitorPluginInstance: MonitorPlugin;
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
		moduleAlias: '',
		options: {},
	} as any;

	beforeEach(async () => {
		MonitorPluginInstance = new (MonitorPlugin as any)();
		await MonitorPluginInstance.load(channelMock);
	});

	it('should add new transactions to state', () => {
		// Arrange
		const transactionIds = [...Array(4).keys()].map(() => randomBytes(64).toString('hex'));
		const MonitorInstance = MonitorPluginInstance as any;
		// Act
		MonitorInstance._handlePostTransactionAnnounce({ transactionIds });
		// Assert
		expect(Object.keys(MonitorInstance._state.transactions)).toEqual(transactionIds);
	});

	it('should increment count for existing transaction id', () => {
		// Arrange
		const transactionIds = [...Array(4).keys()].map(() => randomBytes(64).toString('hex'));
		const MonitorInstance = MonitorPluginInstance as any;
		// Act
		MonitorInstance._handlePostTransactionAnnounce({ transactionIds });
		MonitorInstance._handlePostTransactionAnnounce({ transactionIds: [transactionIds[0]] });
		// Assert
		expect(MonitorInstance._state.transactions[transactionIds[0]].count).toBe(2);
	});
});

describe('_cleanUpTransactionStats', () => {
	let MonitorPluginInstance: MonitorPlugin;
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
		moduleAlias: '',
		options: {},
	} as any;

	beforeEach(async () => {
		MonitorPluginInstance = new (MonitorPlugin as any)();
		await MonitorPluginInstance.load(channelMock);
	});

	it('should remove transaction stats that are more than 10 minutes old', () => {
		// Arrange
		const transactionIds = [...Array(4).keys()].map(() => randomBytes(64).toString('hex'));
		const MonitorInstance = MonitorPluginInstance as any;
		const now = Date.now();
		Date.now = jest.fn(() => now);
		// Act
		MonitorInstance._handlePostTransactionAnnounce({ transactionIds });
		// Assert
		expect(Object.keys(MonitorInstance._state.transactions)).toEqual(transactionIds);

		Date.now = jest.fn(() => now + 600001);

		const newTransactions = [randomBytes(64).toString('hex'), randomBytes(64).toString('hex')];

		MonitorInstance._handlePostTransactionAnnounce({ transactionIds: newTransactions });

		expect(Object.keys(MonitorInstance._state.transactions)).toEqual(newTransactions);
	});
});
