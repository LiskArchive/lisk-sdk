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
import { BaseChannel, BasePlugin } from '../../../src';
import * as loggerModule from '../../../src/logger';
import { TransferAsset } from '../../../src/modules/token/transfer_asset';
import { getPluginExportPath, PluginInfo } from '../../../src/plugins/base_plugin';

const appConfigForPlugin = {
	rootPath: '/my/path',
	label: 'my-app',
	logger: { consoleLogLevel: 'debug', fileLogLevel: '123' },
};

class MyPlugin extends BasePlugin {
	public constructor(options: object = { appConfig: appConfigForPlugin }) {
		super(options as never);
	}

	public static get alias() {
		return 'my_plugin';
	}

	public static get info(): PluginInfo {
		return {
			author: 'John Do',
			version: '1.0',
			name: 'my_plugin',
		};
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

		describe('constructor', () => {
			it('should assign "codec" namespace', () => {
				expect(plugin.codec).toEqual(
					expect.objectContaining({
						decodeTransaction: expect.any(Function),
					}),
				);
			});
		});

		describe('init', () => {
			it('should create logger instance', async () => {
				// Act
				await plugin.init((channelMock as unknown) as BaseChannel);

				// Assert
				expect(loggerModule.createLogger).toHaveBeenCalledTimes(1);
				expect(loggerModule.createLogger).toHaveBeenCalledWith({
					...appConfigForPlugin.logger,
					logFilePath: `${appConfigForPlugin.rootPath}/${appConfigForPlugin.label}/logs/plugin-${MyPlugin.alias}.log`,
					module: `plugin:${MyPlugin.alias}`,
				});
				expect(plugin['_logger']).toBe(loggerMock);
			});

			it('should fetch schemas and assign to instance', async () => {
				// Act
				await plugin.init((channelMock as unknown) as BaseChannel);

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

		it('should return undefined if info.name is not an npm package and info.exportPath is not defined', () => {
			expect(getPluginExportPath(MyPlugin)).toBeUndefined();
		});

		it('should return info.name if its a valid npm package', () => {
			jest.mock(
				MyPlugin.info.name,
				() => {
					return {
						MyPlugin,
					};
				},
				{ virtual: true },
			);

			expect(getPluginExportPath(MyPlugin)).toEqual(MyPlugin.info.name);
		});

		it('should return undefined if exported class is not the same from npm package', () => {
			class MyPlugin2 extends MyPlugin {}
			jest.mock(
				MyPlugin.info.name,
				() => {
					return {
						MyPlugin: MyPlugin2,
					};
				},
				{ virtual: true },
			);

			expect(getPluginExportPath(MyPlugin)).toBeUndefined();
		});

		it('should return info.exportPath if info.name is not a package but export path is valid', () => {
			class MyPlugin2 extends MyPlugin {
				public static get info(): PluginInfo {
					return {
						...MyPlugin.info,
						name: 'my-unknown-package',
						exportPath: 'plugin-with-valid-export',
					};
				}
			}

			jest.mock(
				'plugin-with-valid-export',
				() => {
					return {
						MyPlugin2,
					};
				},
				{ virtual: true },
			);

			expect(getPluginExportPath(MyPlugin2)).toEqual('plugin-with-valid-export');
		});

		it('should return undefined if exported class is not the same from export path', () => {
			class MyPlugin2 extends MyPlugin {
				public static get info(): PluginInfo {
					return {
						...MyPlugin.info,
						name: 'my-unknown-package',
						exportPath: 'custom-export-path-2',
					};
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
