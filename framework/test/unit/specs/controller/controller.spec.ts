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

jest.mock('../../../../src/controller/bus');
jest.mock('../../../../src/controller/channels/in_memory_channel');

/* eslint-disable import/first  */

import { Controller } from '../../../../src/controller/controller';
import { Bus } from '../../../../src/controller/bus';

const createMockPlugin = (alias?: string, loadStub?: any, unloadStub?: any) => {
	function Plugin(this: any) {
		this.load = loadStub ?? jest.fn();
		this.unload = unloadStub ?? jest.fn();
		this.defaults = {};
		this.events = [];
		this.actions = {};
	}

	Plugin.info = {
		name: alias ?? 'dummy',
		version: 'dummy',
		author: 'dummy',
	};
	Plugin.alias = alias ?? 'dummy';

	return Plugin;
};
describe('Controller Class', () => {
	// Arrange
	const appLabel = '#LABEL';
	const logger = {
		debug: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		trace: jest.fn(),
		fatal: jest.fn(),
		warn: jest.fn(),
		level: jest.fn(),
	};
	const channel: any = {
		registerToBus: jest.fn(),
	};
	const config = {
		rootPath: '~/.lisk',
		ipc: {
			enabled: false,
		},
	};
	const systemDirs = {
		root: `${config.rootPath}/${appLabel}`,
		data: `${config.rootPath}/${appLabel}/data`,
		tmp: `${config.rootPath}/${appLabel}/tmp`,
		logs: `${config.rootPath}/${appLabel}/logs`,
		sockets: `${config.rootPath}/${appLabel}/tmp/sockets`,
		pids: `${config.rootPath}/${appLabel}/tmp/pids`,
	};
	const configController = {
		rootPath: '~/.lisk/#LABEL',
		ipc: {
			enabled: false,
		},
		dirs: systemDirs,
		socketsPath: {
			root: `unix://${systemDirs.sockets}`,
			pub: `unix://${systemDirs.sockets}/lisk_pub.sock`,
			sub: `unix://${systemDirs.sockets}/lisk_sub.sock`,
			rpc: `unix://${systemDirs.sockets}/lisk_rpc.sock`,
		},
	};

	const params = {
		appLabel,
		config,
		logger,
		channel,
	};

	let controller: Controller;

	beforeEach(() => {
		// Act
		controller = new Controller(params);
	});

	afterEach(async () => {
		// Act
		await controller.cleanup();
	});

	describe('#constructor', () => {
		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Assert
			expect(controller.logger).toEqual(logger);
			expect(controller.appLabel).toEqual(appLabel);
			expect(controller.config).toEqual(configController);
			expect(controller.plugins).toEqual({});
			expect(controller.channel).toBe(channel);
			expect(controller.bus).toBeUndefined();
		});
	});

	describe('#load', () => {
		let plugins: any;
		let pluginOptions: any;

		beforeEach(async () => {
			plugins = {
				dummyPlugin1: createMockPlugin('dummyPlugin1'),
				dummyPlugin2: createMockPlugin('dummyPlugin2'),
				dummyPlugin3: createMockPlugin('dummyPlugin3'),
			};

			pluginOptions = {
				dummyPlugin1: '#OPTIONS1',
				dummyPlugin2: '#OPTIONS2',
				dummyPlugin3: '#OPTIONS3',
			};

			await controller.load(plugins, pluginOptions);
		});

		describe('_setupBus', () => {
			it('should set created `Bus` instance to `controller.bus` property.', () => {
				// Assert
				expect(Bus).toHaveBeenCalledWith(logger, configController);
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

			it.todo('should log events if level is greater than info.');
		});

		describe('_loadPlugins', () => {
			it.todo('should load plugins in sequence');
			it.todo('should call validatePluginSpec function.');

			describe('when creating channel', () => {
				it.todo(
					'should add created channel to `controller.pluginsChannel` object',
				);

				it.todo(
					'should call `channel.registerToBus` method to register channel to the Bus.',
				);
			});

			describe('when creating plugin', () => {
				it.todo(
					'should publish `loading:started` event before loading plugin.',
				);
				it.todo('should call `plugin.load` method.');
				it.todo(
					'should publish `loading:finished` event after loading plugin.',
				);
				it.todo('should add plugin to `controller.plugins` object.');
			});
		});

		it('should log registered events and actions', () => {
			// Assert
			expect(logger.debug).toHaveBeenCalledWith(
				undefined,
				'Bus listening to events',
			);
			expect(logger.debug).toHaveBeenCalledWith(
				undefined,
				'Bus ready for actions',
			);
		});
	});

	describe('#unloadPlugins', () => {
		let loadStubs: any;
		let unloadStubs: any;

		beforeEach(async () => {
			// Arrange
			loadStubs = {
				plugin1: jest.fn(),
				plugin2: jest.fn(),
			};

			unloadStubs = {
				plugin1: jest.fn(),
				plugin2: jest.fn(),
			};

			const plugins: any = {
				plugin1: createMockPlugin(
					'plugin1',
					loadStubs.plugin1,
					unloadStubs.plugin1,
				),
				plugin2: createMockPlugin(
					'plugin2',
					loadStubs.plugin2,
					unloadStubs.plugin2,
				),
			};
			const pluginOptions: any = {
				plugin1: {
					loadAsChildProcess: false,
				},
				plugin2: {
					loadAsChildProcess: false,
				},
			};

			await controller.load(plugins, pluginOptions);
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
			expect(controller.plugins).toEqual({});
		});

		it('should unload given plugins if plugins argument was provided', async () => {
			// Act
			await controller.unloadPlugins(['plugin2']);

			// Assert
			expect(Object.keys(controller.plugins)).toEqual(['plugin1']);
		});
	});
});
