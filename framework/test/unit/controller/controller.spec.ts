/*
 * Copyright © 2019 Lisk Foundation
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

import * as childProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs-extra';
import { Database, InMemoryDatabase, StateDB } from '@liskhq/lisk-db';
import { BasePlugin } from '../../../src/plugins/base_plugin';
import * as controllerModule from '../../../src/controller/controller';
import { Controller } from '../../../src/controller/controller';
import { Bus } from '../../../src/controller/bus';
import { InMemoryChannel } from '../../../src/controller/channels';
import * as basePluginModule from '../../../src/plugins/base_plugin';
import { ApplicationConfigForPlugin, EndpointHandlers, testing } from '../../../src';

jest.mock('zeromq');

const createMockPlugin = ({
	name,
	initStub,
	loadStub,
	unloadStub,
}: {
	name: string;
	initStub?: any;
	loadStub?: any;
	unloadStub?: any;
}): BasePlugin => {
	return {
		name,
		load: loadStub ?? jest.fn(),
		init: initStub ?? jest.fn(),
		unload: unloadStub ?? jest.fn(),
		configSchema: {},
		events: [],
		endpoint: {},
	} as unknown as BasePlugin;
};

describe('Controller Class', () => {
	// Arrange
	const loggerMock = {
		debug: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		trace: jest.fn(),
		fatal: jest.fn(),
		warn: jest.fn(),
		level: jest.fn(),
	};

	const config = {
		dataPath: '/user/.lisk/#LABEL',
	};
	const childProcessMock = {
		send: jest.fn(),
		on: jest.fn(),
		kill: jest.fn(),
		connected: true,
	};
	const systemDirs = {
		dataPath: `${config.dataPath}`,
		data: `${config.dataPath}/data`,
		config: `${config.dataPath}/config`,
		tmp: `${config.dataPath}/tmp`,
		logs: `${config.dataPath}/logs`,
		sockets: `${config.dataPath}/tmp/sockets`,
		pids: `${config.dataPath}/tmp/pids`,
		plugins: `${config.dataPath}/plugins`,
	};
	const configController = {
		dataPath: '/user/.lisk/#LABEL',
		dirs: systemDirs,
	};
	const chainID = Buffer.from('10000000', 'hex');

	const appConfig = {
		...testing.fixtures.defaultConfig,
		system: {
			...testing.fixtures.defaultConfig.system,
			dataPath: '/user/.lisk/#LABEL',
		},
	} as ApplicationConfigForPlugin;
	const pluginConfigs = {};

	const params = {
		appConfig,
		pluginConfigs,
		chainID,
	};

	const initParams = {
		stateDB: new InMemoryDatabase() as unknown as StateDB,
		moduleDB: new InMemoryDatabase() as unknown as Database,
		logger: loggerMock,
		events: ['app_start', 'app_blockNew'],
		endpoints: {
			getBlockByID: jest.fn(),
		} as EndpointHandlers,
		chainID: Buffer.alloc(0),
	};

	let controller: controllerModule.Controller;
	let inMemoryPlugin: BasePlugin;
	let childProcessPlugin: BasePlugin;

	beforeEach(() => {
		// Act
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		jest.spyOn(basePluginModule, 'getPluginExportPath').mockReturnValue('plugin2');
		controller = new Controller(params);
		inMemoryPlugin = createMockPlugin({
			name: 'plugin1',
		});
		childProcessPlugin = createMockPlugin({
			name: 'plugin2',
		});

		controller.registerEndpoint('pos', {});
		controller.registerEndpoint('auth', {});
		controller.registerPlugin(inMemoryPlugin, { loadAsChildProcess: false });
		controller.registerPlugin(childProcessPlugin, { loadAsChildProcess: true });
		jest
			.spyOn(childProcess, 'fork')
			.mockReturnValue(childProcessMock as unknown as childProcess.ChildProcess);
		jest.spyOn(os, 'homedir').mockReturnValue('/user');
		controller.init(initParams);
	});

	describe('#constructor', () => {
		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Assert
			expect(controller['_config']).toEqual(configController);
			expect(controller['_inMemoryPlugins']).toEqual({});
			expect(controller['_childProcesses']).toEqual({});
			expect(controller['_bus']).toBeInstanceOf(Bus);
			expect(controller['_logger']).toBeDefined();
			expect(controller['_internalIPCServer']).toBeDefined();
		});
	});

	describe('#start', () => {
		beforeEach(async () => {
			jest.spyOn(controller['_bus'], 'registerChannel');
			jest.spyOn(controller['_bus'], 'publish').mockResolvedValue(undefined as never);
			// eslint-disable-next-line @typescript-eslint/require-await
			jest.spyOn(controller['_bus'], 'start').mockImplementation(async logger => {
				controller['_bus']['_logger'] = logger;
			});
			jest.spyOn(controller['_channel'] as InMemoryChannel, 'registerToBus');

			// To avoid waiting for events
			jest.spyOn(Promise, 'race').mockResolvedValue(true);
			await controller.start();
		});

		it('should register main channel to bus', () => {
			// Assert
			expect(controller['_channel']?.registerToBus).toHaveBeenCalledWith(controller['_bus']);
		});

		it('should start bus', () => {
			// Assert
			expect(controller['_bus'].start).toHaveBeenCalledWith(loggerMock);
		});

		it('should register channels for each endpoiont namespace', () => {
			// Assert
			// 2 modules, 2 plugins
			expect(controller['_bus'].registerChannel).toHaveBeenCalledTimes(4);
		});

		describe('in-memory plugin', () => {
			it('should call `plugin.init` method', () => {
				// Assert
				expect(inMemoryPlugin.init).toHaveBeenCalledTimes(1);
			});

			it('should call `plugin.load` method', () => {
				// Assert
				expect(inMemoryPlugin.load).toHaveBeenCalledTimes(1);
			});

			it('should add plugin to `controller._inMemoryPlugins` object', () => {
				// Assert
				expect(controller['_inMemoryPlugins']).toEqual(
					expect.objectContaining({
						plugin1: {
							channel: expect.any(InMemoryChannel),
							plugin: inMemoryPlugin,
						},
					}),
				);
			});
		});

		describe('child-process plugin', () => {
			it('should run plugin in child process when specified', () => {
				// Assert
				expect(childProcess.fork).toHaveBeenCalledTimes(1);
				expect(childProcess.fork).toHaveBeenCalledWith(
					expect.stringContaining('child_process_loader'),
					['plugin2', expect.any(String)],
					{ execArgv: undefined },
				);
			});

			it('should send "load" action to child process', () => {
				// Assert
				expect(childProcessMock.send).toHaveBeenCalledTimes(1);
				expect(childProcessMock.send).toHaveBeenCalledWith({
					action: 'load',
					appConfig,
					config: {
						loadAsChildProcess: true,
					},
				});
			});
		});
	});

	describe('#stop', () => {
		beforeEach(async () => {
			jest.spyOn(controller['_bus'], 'publish').mockResolvedValue(undefined as never);
			jest.spyOn(Promise, 'race').mockResolvedValue(true);
			jest.spyOn(InMemoryChannel.prototype, 'publish');
			await controller.start();
			childProcessMock.connected = true;
			await controller.stop();
		});

		describe('unload in-memory plugins', () => {
			it('should unload in-memory plugins in sequence', () => {
				// Assert
				expect(inMemoryPlugin.unload).toHaveBeenCalled();
			});

			it('should unload all plugins if plugins argument was not provided', () => {
				// Assert
				expect(controller['_inMemoryPlugins']).toEqual({});
			});
		});

		describe('unload child-process plugins', () => {
			it('should kill child process if its not connected', async () => {
				// Arrange
				childProcessMock.connected = false;

				// Act && Assert
				await expect(controller['_unloadPlugins']()).rejects.toThrow('Unload Plugins failed');
				expect(childProcessMock.kill).toHaveBeenCalledTimes(1);
				expect(childProcessMock.kill).toHaveBeenCalledWith('SIGTERM');
			});

			it('should send "unload" action to child process', () => {
				// Assert
				expect(childProcessMock.send).toHaveBeenCalledWith({
					action: 'unload',
				});
			});
		});
	});
});
