/* eslint-disable max-classes-per-file */
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

import * as apiClient from '@liskhq/lisk-api-client';
import { Plugins, Types, systemDirs, testing } from '../../../src';
import * as loggerModule from '../../../src/logger';
import { getPluginExportPath } from '../../../src/plugins/base_plugin';
import { fakeLogger } from '../../utils/mocks';

class MyPlugin extends Plugins.BasePlugin {
	public configSchema = {
		$id: '/myPlugin/schema',
		type: 'object',
		properties: {
			obj: {
				type: 'string',
			},
		},
		default: {},
	};

	public get nodeModulePath(): string {
		return '';
	}

	public async load() {
		return Promise.resolve();
	}

	public async unload() {
		return Promise.resolve();
	}
}

const loggerMock = {
	debug: jest.fn(),
	info: jest.fn(),
};

describe('base_plugin', () => {
	describe('BasePlugin', () => {
		let plugin: MyPlugin;

		beforeEach(() => {
			plugin = new MyPlugin();
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
				invoke: jest.fn(),
			} as never);

			jest.spyOn(loggerModule, 'createLogger').mockReturnValue(loggerMock as never);
		});

		describe('init', () => {
			it('should assign "apiClient" property', async () => {
				// Act
				await plugin.init({
					appConfig: {
						...testing.fixtures.defaultConfig,
						rpc: {
							...testing.fixtures.defaultConfig.rpc,
							modes: ['ipc'],
						},
					},
					logger: fakeLogger,
					config: {
						obj: 'valid obj prop',
					},
				});

				// Assert
				expect(apiClient.createIPCClient).toHaveBeenCalledWith(
					systemDirs(testing.fixtures.defaultConfig.system.dataPath).dataPath,
				);
			});

			it('should reject config given does not satisfy configSchema defined', async () => {
				await expect(
					plugin.init({
						appConfig: {
							...testing.fixtures.defaultConfig,
							genesis: {} as unknown as Types.GenesisConfig,
						},
						logger: fakeLogger,
						config: {
							obj: false,
						},
					}),
				).rejects.toThrow();
			});
		});
	});

	describe('getPluginExportPath', () => {
		const plugin = new MyPlugin();
		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should return undefined if name is not an npm package and nodeModulePath is not defined', () => {
			expect(getPluginExportPath(plugin)).toBeUndefined();
		});

		it('should return name if its a valid npm package', () => {
			class MyPlugin2 extends MyPlugin {
				public get nodeModulePath() {
					return 'my_plugin';
				}
			}

			jest.mock(
				'my_plugin',
				() => {
					return {
						MyPlugin2,
					};
				},
				{ virtual: true },
			);

			expect(getPluginExportPath(new MyPlugin2())).toBe('my_plugin');
		});

		it('should return undefined if exported class is not the same from npm package', () => {
			class MyPlugin2 extends MyPlugin {}
			jest.mock(
				'my_plugin',
				() => {
					return {
						MyPlugin: MyPlugin2,
					};
				},
				{ virtual: true },
			);

			expect(getPluginExportPath(new MyPlugin())).toBeUndefined();
		});

		it('should return undefined if exported class is not the same from export path', () => {
			class MyPlugin2 extends MyPlugin {
				public get nodeModulePath(): string {
					return 'custom-export-path-2';
				}
			}

			jest.mock(
				'custom-export-path-2',
				() => {
					return {
						MyPlugin2: MyPlugin,
					};
				},
				{ virtual: true },
			);

			expect(getPluginExportPath(new MyPlugin2())).toBeUndefined();
		});
	});
});
