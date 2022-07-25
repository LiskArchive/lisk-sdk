/*
 * Copyright © 2022 Lisk Foundation
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

import { testing, apiClient } from 'lisk-sdk';
import * as plugins from '../../src/chain_connector_plugin';
import { CCM_BASED_CCU_FREQUENCY, LIVENESS_BASED_CCU_FREQUENCY } from '../../src/constants';

describe('ChainConnectorPlugin', () => {
	let chainConnectorPlugin: plugins.ChainConnectorPlugin;

	beforeEach(() => {
		chainConnectorPlugin = new plugins.ChainConnectorPlugin();
	});

	describe('init', () => {
		it('should assign ccuFrequency properties to default values', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain' },
				appConfig: testing.fixtures.defaultConfig as never,
			});
			expect(chainConnectorPlugin['_ccuFrequency'].ccm).toEqual(CCM_BASED_CCU_FREQUENCY);
			expect(chainConnectorPlugin['_ccuFrequency'].liveness).toEqual(LIVENESS_BASED_CCU_FREQUENCY);
		});

		it('should assign ccuFrequency properties to passed config values', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					ccmBasedFrequency: 100,
					livenessBasedFrequency: 300000,
				},
				appConfig: testing.fixtures.defaultConfig as never,
			});
			expect(chainConnectorPlugin['_ccuFrequency'].ccm).toEqual(100);
			expect(chainConnectorPlugin['_ccuFrequency'].liveness).toEqual(300000);
		});
	});

	describe('load', () => {
		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
			};
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
			};

			await chainConnectorPlugin.unload();
		});
		it('should initialize api clients without sidechain', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain' },
				appConfig: testing.fixtures.defaultConfig as never,
			});
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({} as never);
			await chainConnectorPlugin.load();
			expect(chainConnectorPlugin['_mainchainAPIClient']).not.toBeUndefined();
		});

		it('should initialize api clients with sidechain', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain', sidechainIPCPath: '~/.lisk/sidechain' },
				appConfig: testing.fixtures.defaultConfig as never,
			});
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({} as never);
			await chainConnectorPlugin.load();
			expect(chainConnectorPlugin['_mainchainAPIClient']).not.toBeUndefined();
			expect(chainConnectorPlugin['_sidechainAPIClient']).not.toBeUndefined();
		});
	});
	describe('alias', () => {
		it.todo('should have valid alias');
	});
	describe('unload', () => {
		it.todo('should unload plugin');
	});
});
