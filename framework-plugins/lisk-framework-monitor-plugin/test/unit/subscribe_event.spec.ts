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
import { testing, ApplicationConfigForPlugin } from 'lisk-sdk';
import { MonitorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const validPluginOptions = configSchema.default;

describe('subscribe to event', () => {
	let monitorPlugin: MonitorPlugin;
	const {
		mocks: { channelMock },
	} = testing;

	beforeEach(async () => {
		monitorPlugin = new MonitorPlugin();
		monitorPlugin['_apiClient'] = {
			schema: {},
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};
		await monitorPlugin.init({
			config: validPluginOptions,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
		(monitorPlugin as any)._channel = channelMock;
	});

	it('should register listener to networkEvent', () => {
		// Act
		monitorPlugin['_subscribeToEvents']();
		// Assert
		expect(monitorPlugin.apiClient.subscribe).toHaveBeenCalledTimes(3);
		expect(monitorPlugin.apiClient.subscribe).toHaveBeenCalledWith(
			'network_newBlock',
			expect.any(Function),
		);
		expect(monitorPlugin.apiClient.subscribe).toHaveBeenCalledWith(
			'network_newTransaction',
			expect.any(Function),
		);
		expect(monitorPlugin.apiClient.subscribe).toHaveBeenCalledWith(
			'chain_forked',
			expect.any(Function),
		);
	});
});
