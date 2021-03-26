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
import { testing } from 'lisk-framework';
import { MonitorPlugin } from '../../src';
import * as config from '../../src/defaults/default_config';

const validPluginOptions = config.defaultConfig.default;

describe('subscribe to event', () => {
	let monitorPlugin: MonitorPlugin;
	let subscribeMock: jest.Mock;
	const {
		mocks: { channelMock },
	} = testing;

	beforeEach(() => {
		subscribeMock = jest.fn();
		channelMock.subscribe = subscribeMock;
		monitorPlugin = new MonitorPlugin(validPluginOptions as never);
		(monitorPlugin as any)._channel = channelMock;
	});

	it('should register listener to network:event', () => {
		// Act
		monitorPlugin['_subscribeToEvents']();
		// Assert
		expect(subscribeMock).toHaveBeenCalledTimes(2);
		expect(subscribeMock).toHaveBeenCalledWith('app:network:event', expect.any(Function));
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
