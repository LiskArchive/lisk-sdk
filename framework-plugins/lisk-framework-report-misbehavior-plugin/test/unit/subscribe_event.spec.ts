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

import { ApplicationConfigForPlugin, testing } from 'lisk-sdk';
import { ReportMisbehaviorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const validPluginOptions = {
	...configSchema.default,
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
	dataPath: '/my/app',
};

describe('subscribe to event', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;
	beforeEach(async () => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
		reportMisbehaviorPlugin['_apiClient'] = {
			schema: {},
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};
		await reportMisbehaviorPlugin.init({
			config: validPluginOptions,
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
		reportMisbehaviorPlugin['logger'] = {
			error: jest.fn(),
		} as any;
	});

	it('should register listener to network:event', () => {
		// Act
		reportMisbehaviorPlugin['_subscribeToChannel']();
		// Assert
		expect(reportMisbehaviorPlugin.apiClient.subscribe).toHaveBeenCalledTimes(1);
		expect(reportMisbehaviorPlugin.apiClient.subscribe).toHaveBeenCalledWith(
			'network_newBlock',
			expect.any(Function),
		);
	});
});
