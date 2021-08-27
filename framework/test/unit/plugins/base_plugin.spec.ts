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
import { BaseChannel, BasePlugin, GenesisConfig } from '../../../src';
import * as loggerModule from '../../../src/logger';
import { TransferAsset } from '../../../src/modules/token/transfer_asset';
import { getPluginExportPath } from '../../../src/plugins/base_plugin';

const appConfigForPlugin = {
	rootPath: '/my/path',
	label: 'my-app',
	logger: { consoleLogLevel: 'debug', fileLogLevel: '123', logFileName: 'plugin1.log' },
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
			path: ''
		}
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
	public get nodeModulePath(): string {
		return '';
	}

	public get name() {
		return 'my_plugin';
	}

	public get events() {
		return [];
	}

	public get actions() {
		return {};
	}

	public async load(_channel: BaseChannel) {
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
	accountSchema: {},
	transactionSchema,
	transactionsAssetSchemas: [
		{
			moduleID: 2,
			assetID: 0,
			schema: new TransferAsset(BigInt(5000000)).schema,
		},
	],
	blockHeader: {},
	blockHeadersAssets: {},
};

describe('base_plugin', () => {
	describe('BasePlugin', () => {
		let plugin: MyPlugin;

		beforeEach(() => {
			plugin = new MyPlugin();

			jest.spyOn(loggerModule, 'createLogger').mockReturnValue(loggerMock as never);
			when(channelMock.invoke).calledWith('app:getSchema').mockResolvedValue(schemas);
		});

		describe('init', () => {
			it('should assign "codec" namespace', async () => {
				// Act
				await plugin.init({
					appConfig: {
						...appConfigForPlugin,
						version: '',
						networkVersion: '',
						genesisConfig: ({} as unknown) as GenesisConfig,
					},
					channel: (channelMock as unknown) as BaseChannel,
					config: {},
				});

				// Assert
				expect(plugin.codec).toEqual(
					expect.objectContaining({
						decodeTransaction: expect.any(Function),
					}),
				);
			});

			it('should create logger instance', async () => {
				// Act
				await plugin.init({
					appConfig: {
						...appConfigForPlugin,
						version: '',
						networkVersion: '',
						genesisConfig: ({} as unknown) as GenesisConfig,
					},
					channel: (channelMock as unknown) as BaseChannel,
					config: {},
				});

				// Assert
				expect(loggerModule.createLogger).toHaveBeenCalledTimes(1);
				expect(loggerModule.createLogger).toHaveBeenCalledWith({
					consoleLogLevel: appConfigForPlugin.logger.consoleLogLevel,
					fileLogLevel: appConfigForPlugin.logger.fileLogLevel,
					logFilePath: `${appConfigForPlugin.rootPath}/${appConfigForPlugin.label}/logs/plugin-${plugin.name}.log`,
					module: `plugin:${plugin.name}`,
				});
				expect(plugin['_logger']).toBe(loggerMock);
			});

			it('should fetch schemas and assign to instance', async () => {
				// Act
				await plugin.init({
					appConfig: {
						...appConfigForPlugin,
						version: '',
						networkVersion: '',
						genesisConfig: ({} as unknown) as GenesisConfig,
					},
					channel: (channelMock as unknown) as BaseChannel,
					config: {},
				});

				// Assert
				expect(channelMock.once).toHaveBeenCalledTimes(1);
				expect(channelMock.once).toHaveBeenCalledWith('app:ready', expect.any(Function));
				expect(channelMock.invoke).toHaveBeenCalledTimes(1);
				expect(channelMock.invoke).toHaveBeenCalledWith('app:getSchema');
				expect(plugin.schemas).toBe(schemas);
			});
		});
	});

	describe('getPluginExportPath', () => {
		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should return undefined if name is not an npm package and nodeModulePath is not defined', () => {
			expect(getPluginExportPath(MyPlugin)).toBeUndefined();
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

			expect(getPluginExportPath(MyPlugin2)).toEqual('my_plugin');
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

			expect(getPluginExportPath(MyPlugin)).toBeUndefined();
		});

		it('should return undefined if exported class is not the same from export path', () => {
			class MyPlugin2 extends MyPlugin {
				public get name(): string {
					return 'my-unknown-package';
				}
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

			expect(getPluginExportPath(MyPlugin2)).toBeUndefined();
		});
	});
});
