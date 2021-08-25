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
import { when } from 'jest-when';
import { BasePlugin } from '../../../src';

jest.mock('../../../src/controller/bus');
jest.mock('../../../src/controller/channels/in_memory_channel');

/* eslint-disable import/first  */

import * as controllerModule from '../../../src/controller/controller';
import { Controller } from '../../../src/controller/controller';
import { Bus } from '../../../src/controller/bus';
import { InMemoryChannel } from '../../../src/controller/channels';
import * as basePluginModule from '../../../src/plugins/base_plugin';

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
}): typeof BasePlugin => {
	function Plugin(this: any) {
		this.name = name;
		this.load = loadStub ?? jest.fn();
		this.init = initStub ?? jest.fn();
		this.unload = unloadStub ?? jest.fn();
		this.configSchema = {};
		this.events = [];
		this.actions = {};
	}

	return (Plugin as unknown) as typeof BasePlugin;
};
describe('Controller Class', () => {
	// Arrange
	const appLabel = '#LABEL';
	const loggerMock = {
		debug: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		trace: jest.fn(),
		fatal: jest.fn(),
		warn: jest.fn(),
		level: jest.fn(),
	};
	const channelMock: any = {
		registerToBus: jest.fn(),
		once: jest.fn(),
		publish: jest.fn(),
	};
	const rpcConfig = {
		modes: ['ipc'],
		ws: { port: 8080, path: '/ws', host: '127.0.0.1' },
		ipc: {
			path: '/my/ipc/path',
		},
	};
	const config = {
		rootPath: '/user/.lisk',
		rpc: rpcConfig,
	};
	const childProcessMock = {
		send: jest.fn(),
		on: jest.fn(),
		kill: jest.fn(),
		connected: true,
	};
	const systemDirs = {
		dataPath: `${config.rootPath}/${appLabel}`,
		data: `${config.rootPath}/${appLabel}/data`,
		tmp: `${config.rootPath}/${appLabel}/tmp`,
		logs: `${config.rootPath}/${appLabel}/logs`,
		sockets: `${config.rootPath}/${appLabel}/tmp/sockets`,
		pids: `${config.rootPath}/${appLabel}/tmp/pids`,
		plugins: `${config.rootPath}/${appLabel}/plugins`,
	};
	const configController = {
		dataPath: '/user/.lisk/#LABEL',
		dirs: systemDirs,
		rpc: rpcConfig,
	};

	const params = {
		appLabel,
		config,
		logger: loggerMock,
		channel: channelMock,
	};

	let controller: controllerModule.Controller;

	beforeEach(() => {
		// Act
		controller = new Controller(params);
		jest
			.spyOn(childProcess, 'fork')
			.mockReturnValue((childProcessMock as unknown) as childProcess.ChildProcess);
		jest.spyOn(os, 'homedir').mockReturnValue('/user');
	});

	afterEach(async () => {
		// Act
		await controller.cleanup();
	});

	describe('#constructor', () => {
		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Assert
			expect(controller.logger).toEqual(loggerMock);
			expect(controller.appLabel).toEqual(appLabel);
			expect(controller.config).toEqual(configController);
			expect(controller.channel).toBe(channelMock);
			expect(controller.bus).toBeUndefined();
			expect(controller['_inMemoryPlugins']).toEqual({});
			expect(controller['_childProcesses']).toEqual({});
		});
	});

	describe('#load', () => {
		beforeEach(async () => {
			await controller.load();
		});

		describe('_setupBus', () => {
			it('should set created `Bus` instance to `controller.bus` property.', () => {
				// Assert
				expect(Bus).toHaveBeenCalledWith(loggerMock, { rpc: rpcConfig });
				expect(controller.bus).toBeInstanceOf(Bus);
			});

			it('should call `controller.bus.setup()` method.', () => {
				// Assert
				expect(controller.bus.setup).toHaveBeenCalled();
			});

			it('should call `controller.channel.registerToBus()` method.', () => {
				// Assert
				expect(controller.bus.setup).toHaveBeenCalled();
			});
		});
	});

	describe('#loadPlugins', () => {
		let plugins: any;
		let pluginOptions: any;
		let Plugin1: any;
		let Plugin2: any;

		beforeEach(async () => {
			Plugin1 = createMockPlugin({ name: 'plugin1' });
			Plugin2 = createMockPlugin({ name: 'plugin2' });

			plugins = {
				plugin1: Plugin1,
				plugin2: Plugin2,
			};

			pluginOptions = {
				plugin1: { option: '#OPTIONS1' },
				plugin2: { option2: '#OPTIONS2' },
			};

			await controller.load();
		});

		it('should throw error if bus is not initialized', async () => {
			// Arrange
			controller = new Controller(params);

			// Act && Assert
			await expect(controller.loadPlugins(plugins, pluginOptions, {} as never)).rejects.toThrow(
				'Controller bus is not initialized. Plugins can not be loaded.',
			);
		});

		it.todo('should load plugins in sequence');

		describe('in-memory plugin', () => {
			it('should load plugin in-memory if "loadAsChildProcess" is set to false', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(loggerMock.info).toHaveBeenCalledWith('plugin1', 'Loading in-memory plugin');
				expect(loggerMock.info).toHaveBeenCalledWith('plugin2', 'Loading in-memory plugin');
			});

			it('should create instance of in-memory channel', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(InMemoryChannel).toHaveBeenCalledTimes(2);
			});

			it('should register channel to bus', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(InMemoryChannel.prototype.registerToBus).toHaveBeenCalledTimes(2);
				expect(InMemoryChannel.prototype.registerToBus).toHaveBeenCalledWith(controller.bus);
			});

			it('should publish `registeredToBus:started` event before loading plugin', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin1:registeredToBus');
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin2:registeredToBus');
			});

			it('should publish `loading:started` event before loading plugin', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin1:loading:started');
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin2:loading:started');
			});

			it('should call `plugin.init` method', async () => {
				// Arrange
				const initMock = jest.fn();
				plugins.plugin1 = createMockPlugin({ name: 'plugin1', initStub: initMock });
				plugins.plugin2 = createMockPlugin({ name: 'plugin2', initStub: initMock });

				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(initMock).toHaveBeenCalledTimes(2);
			});

			it('should call `plugin.load` method', async () => {
				// Arrange
				const loadMock = jest.fn();
				plugins.plugin1 = createMockPlugin({ name: 'plugin1', loadStub: loadMock });
				plugins.plugin2 = createMockPlugin({ name: 'plugin2', loadStub: loadMock });

				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(loadMock).toHaveBeenCalledTimes(2);
				expect(loadMock).toHaveBeenCalledWith(expect.any(InMemoryChannel));
			});

			it('should publish `loading:finished` after loading plugin', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin1:loading:finished');
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin2:loading:finished');
			});

			it('should add plugin to `controller._inMemoryPlugins` object', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(controller['_inMemoryPlugins']).toEqual(
					expect.objectContaining({
						plugin1: {
							channel: expect.any(InMemoryChannel),
							plugin: expect.any(Plugin1),
						},
						plugin2: {
							channel: expect.any(InMemoryChannel),
							plugin: expect.any(Plugin2),
						},
					}),
				);
			});
		});

		describe('child-process plugin', () => {
			beforeEach(async () => {
				const updatedParams = { ...params };

				pluginOptions.plugin1.loadAsChildProcess = true;
				pluginOptions.plugin2.loadAsChildProcess = true;

				jest.spyOn(basePluginModule, 'getPluginExportPath');

				when(basePluginModule.getPluginExportPath as any)
					.calledWith(plugins.plugin1)
					.mockReturnValue('plugin1');

				when(basePluginModule.getPluginExportPath as any)
					.calledWith(plugins.plugin2)
					.mockReturnValue('plugin2');

				controller = new Controller(updatedParams);
				controller.config.rpc = { modes: ['ipc'] } as never;
				await controller.load();

				// To avoid waiting for events
				jest.spyOn(Promise, 'race').mockResolvedValue(true);
			});

			it('should load plugin in child process if "loadAsChildProcess" and IPC is enabled', async () => {
				// Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(loggerMock.info).toHaveBeenCalledWith('plugin1', 'Loading child-process plugin');
				expect(loggerMock.info).toHaveBeenCalledWith('plugin2', 'Loading child-process plugin');
			});

			it('should load child process with childProcess.fork', async () => {
				// Arrange & Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(childProcess.fork).toHaveBeenCalledTimes(2);
				expect(childProcess.fork).toHaveBeenCalledWith(
					expect.stringContaining('child_process_loader'),
					['plugin1', 'Plugin'],
					{ execArgv: undefined },
				);
				expect(childProcess.fork).toHaveBeenCalledWith(
					expect.stringContaining('child_process_loader'),
					['plugin2', 'Plugin'],
					{ execArgv: undefined },
				);
			});

			it('should send "load" action to child process', async () => {
				// Arrange & Act
				await controller.loadPlugins(plugins, pluginOptions, {} as never);

				// Assert
				expect(childProcessMock.send).toHaveBeenCalledTimes(2);
				expect(childProcessMock.send).toHaveBeenCalledWith({
					action: 'load',
					appConfig: {},
					config: pluginOptions.plugin1,
				});
				expect(childProcessMock.send).toHaveBeenCalledWith({
					action: 'load',
					appConfig: {},
					config: pluginOptions.plugin2,
				});
			});
		});
	});

	describe('#unloadPlugins', () => {
		let loadStubs: any;
		let unloadStubs: any;
		let pluginOptions: any;
		let plugins: any;
		let updatedParams: any;

		beforeEach(async () => {
			updatedParams = { ...params };
			controller = new Controller(updatedParams);

			loadStubs = {
				plugin1: jest.fn(),
				plugin2: jest.fn(),
			};

			unloadStubs = {
				plugin1: jest.fn(),
				plugin2: jest.fn(),
			};

			plugins = {
				plugin1: createMockPlugin({
					name: 'plugin1',
					loadStub: loadStubs.plugin1,
					unloadStub: unloadStubs.plugin1,
				}),
				plugin2: createMockPlugin({
					name: 'plugin2',
					loadStub: loadStubs.plugin2,
					unloadStub: unloadStubs.plugin2,
				}),
			};
			pluginOptions = {
				plugin1: {
					loadAsChildProcess: false,
				},
				plugin2: {
					loadAsChildProcess: false,
				},
			};

			await controller.load();
			await controller.loadPlugins(plugins, pluginOptions, {} as never);
		});

		it('should unload plugins in sequence', async () => {
			// Act
			await controller.unloadPlugins();

			// Assert
			expect(unloadStubs.plugin1).toHaveBeenCalled();
			expect(unloadStubs.plugin2).toHaveBeenCalled();
			expect(unloadStubs.plugin2).toHaveBeenCalledAfter(unloadStubs.plugin1);
		});

		it('should unload all plugins if plugins argument was not provided', async () => {
			// Act
			await controller.unloadPlugins();

			// Assert
			expect(controller['_inMemoryPlugins']).toEqual({});
		});

		it('should unload given plugins if plugins argument was provided', async () => {
			// Act
			await controller.unloadPlugins(['plugin2']);

			// Assert
			expect(Object.keys(controller['_inMemoryPlugins'])).toEqual(['plugin1']);
		});

		describe('unload in-memory plugins', () => {
			beforeEach(async () => {
				pluginOptions.plugin1.loadAsChildProcess = false;
				pluginOptions.plugin2.loadAsChildProcess = false;

				controller = new Controller(updatedParams);

				await controller.load();
				await controller.loadPlugins(plugins, pluginOptions, {} as never);
			});

			it('should publish unloading:started event', async () => {
				// Act
				await controller.unloadPlugins();

				// Assert
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin1:unloading:started');
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith('plugin2:unloading:started');
			});

			it('should publish unloading:finished event', async () => {
				// Act
				await controller.unloadPlugins();

				// Assert
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith(
					'plugin1:unloading:finished',
				);
				expect(InMemoryChannel.prototype.publish).toHaveBeenCalledWith(
					'plugin2:unloading:finished',
				);
			});
		});

		describe('unload child-process plugins', () => {
			beforeEach(async () => {
				pluginOptions.plugin1.loadAsChildProcess = true;
				pluginOptions.plugin2.loadAsChildProcess = true;
				childProcessMock.connected = true;

				jest.spyOn(Promise, 'race').mockResolvedValue(true);

				controller = new Controller(updatedParams);
				controller.config.rpc = {
					modes: ['ipc'],
				} as never;

				await controller.load();
				await controller.loadPlugins(plugins, pluginOptions, {} as never);
			});

			it('should kill child process if its not connected', async () => {
				// Arrange
				childProcessMock.connected = false;

				// Act && Assert
				await expect(controller.unloadPlugins()).rejects.toThrow('Unload Plugins failed');
				expect(childProcessMock.kill).toHaveBeenCalledTimes(2);
				expect(childProcessMock.kill).toHaveBeenCalledWith('SIGTERM');
			});

			it('should send "unload" action to child process', async () => {
				// Arrange & Act
				await controller.unloadPlugins();

				// Assert
				expect(childProcessMock.send).toHaveBeenCalledWith({
					action: 'unload',
				});
				expect(childProcessMock.send).toHaveBeenCalledWith({
					action: 'unload',
				});
			});

			it.todo('should publish unloading:started event');

			it.todo('should publish unloading:finished event');
		});
	});
});
