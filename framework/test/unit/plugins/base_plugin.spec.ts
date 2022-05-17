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

import { transactionSchema } from '@liskhq/lisk-chain';
import { when } from 'jest-when';
import { BaseChannel, BasePlugin, GenerationConfig, GenesisConfig } from '../../../src';
import * as loggerModule from '../../../src/logger';
import { getPluginExportPath } from '../../../src/plugins/base_plugin';
import { fakeLogger } from '../../utils/node';

const appConfigForPlugin = {
	rootPath: '/my/path',
	label: 'my-app',
	logger: { consoleLogLevel: 'debug', fileLogLevel: '123', logFileName: 'plugin1.log' },
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
		ipc: {
			path: '',
		},
	},
	forging: {
		force: false,
		waitThreshold: 2,
		delegates: [],
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
	// plugins: {},
};

class MyPlugin extends BasePlugin {
	public name = 'my_plugin';

	public configSchema = {
		$id: 'my_plugin/schema',
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

const channelMock = {
	invoke: jest.fn(),
	once: jest.fn().mockImplementation((_eventName, cb) => cb()),
};

const loggerMock = {
	debug: jest.fn(),
	info: jest.fn(),
};

const schemas = {
	transaction: transactionSchema,
	commands: [
		{
			moduleID: 2,
			assetID: 0,
			schema: {},
		},
	],
	blockHeader: {},
};

describe('base_plugin', () => {
	describe('BasePlugin', () => {
		let plugin: MyPlugin;

		beforeEach(() => {
			plugin = new MyPlugin();

			jest.spyOn(loggerModule, 'createLogger').mockReturnValue(loggerMock as never);
			when(channelMock.invoke).calledWith('app_getSchema').mockResolvedValue(schemas);
		});

		describe('init', () => {
			it('should assign "apiClient" property', async () => {
				// Act
				await plugin.init({
					appConfig: {
						...appConfigForPlugin,
						version: '',
						networkVersion: '',
						genesis: ({} as unknown) as GenesisConfig,
						generation: ({} as unknown) as GenerationConfig,
					},
					channel: (channelMock as unknown) as BaseChannel,
					logger: fakeLogger,
					config: {
						obj: 'valid obj prop',
					},
				});

				// Assert
				expect(plugin['apiClient'].constructor.name).toEqual('APIClient');
			});

			it('should reject config given does not satisfy configSchema defined', async () => {
				await expect(
					plugin.init({
						appConfig: {
							...appConfigForPlugin,
							version: '',
							networkVersion: '',
							genesis: ({} as unknown) as GenesisConfig,
							generation: ({} as unknown) as GenerationConfig,
						},
						channel: (channelMock as unknown) as BaseChannel,
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

			expect(getPluginExportPath(new MyPlugin2())).toEqual('my_plugin');
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
				public name = 'my-unknown-package';

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
