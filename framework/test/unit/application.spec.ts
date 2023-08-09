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
/* eslint-disable max-classes-per-file */

import { objects } from '@liskhq/lisk-utils';
import * as childProcess from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import {
	BaseCCMethod,
	BaseEndpoint,
	BaseInteroperableModule,
	BaseMethod,
	BaseModule,
	BasePlugin,
	ModuleMetadata,
	SidechainInteroperabilityModule,
} from '../../src';
import { Application } from '../../src/application';
import { Bus } from '../../src/controller/bus';
import { WSServer } from '../../src/controller/ws/ws_server';
import { createLogger } from '../../src/logger';
import { Engine } from '../../src/engine';
import * as basePluginModule from '../../src/plugins/base_plugin';
import * as defaultConfig from '../fixtures/config/devnet/config.json';
import { ABIServer } from '../../src/abi_handler/abi_server';
import { ABIHandler, EVENT_ENGINE_READY } from '../../src/abi_handler/abi_handler';
import { systemDirs } from '../../src/system_dirs';
import { OWNER_READ_WRITE } from '../../src/constants';

jest.mock('fs-extra');
jest.mock('zeromq', () => {
	return {
		Publisher: jest
			.fn()
			.mockReturnValue({ bind: jest.fn(), close: jest.fn(), subscribe: jest.fn() }),
		Subscriber: jest
			.fn()
			.mockReturnValue({ bind: jest.fn(), close: jest.fn(), subscribe: jest.fn() }),
		Router: jest.fn().mockReturnValue({ bind: jest.fn(), close: jest.fn() }),
	};
});
jest.mock('@liskhq/lisk-db');
jest.mock('../../src/logger');

class TestPlugin extends BasePlugin {
	public get nodeModulePath(): string {
		return __filename;
	}

	public get name() {
		return 'test-plugin';
	}

	public async load(): Promise<void> {}

	public async unload(): Promise<void> {}
}

class TestModule extends BaseModule {
	public commands = [];
	public endpoint: BaseEndpoint = {} as BaseEndpoint;
	public method: BaseMethod = {} as BaseMethod;

	public verifyAssets = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterCommandExecute = jest.fn();

	public get name() {
		return 'test-module';
	}
	public metadata(): ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}

class TestInteroperableModule extends BaseInteroperableModule {
	public crossChainMethod = { stores: {}, events: {} } as unknown as BaseCCMethod;
	public commands = [];
	public endpoint: BaseEndpoint = {} as BaseEndpoint;
	public method: BaseMethod = {} as BaseMethod;

	public verifyAssets = jest.fn();
	public beforeTransactionsExecute = jest.fn();
	public afterCommandExecute = jest.fn();

	public get name() {
		return 'test-interoperable-module';
	}

	public metadata(): ModuleMetadata {
		throw new Error('Method not implemented.');
	}
}

describe('Application', () => {
	// Arrange
	const config = {
		...defaultConfig,
		genesis: {
			...defaultConfig.genesis,
			chainID: '10000000',
		},
	};
	const loggerMock = {
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		trace: jest.fn(),
		fatal: jest.fn(),
	};

	let engineProcessMock: {
		on: jest.Mock;
		kill: jest.Mock;
	};

	(createLogger as jest.Mock).mockReturnValue(loggerMock);

	beforeEach(() => {
		engineProcessMock = {
			on: jest.fn(),
			kill: jest.fn(),
		};
		jest.spyOn(childProcess, 'fork').mockReturnValue(engineProcessMock as never);
		jest.spyOn(os, 'homedir').mockReturnValue('/user');
		// jest.spyOn(IPCServer.prototype, 'start').mockResolvedValue();
		jest.spyOn(WSServer.prototype, 'start').mockResolvedValue(jest.fn() as never);
		jest.spyOn(Engine.prototype, 'start').mockResolvedValue();
		jest.spyOn(ABIHandler.prototype, 'cacheGenesisState').mockResolvedValue();
		jest.spyOn(process, 'exit').mockReturnValue(0 as never);
	});

	describe('#constructor', () => {
		it('should be able to start the application with default parameters if config is not provided', () => {
			const { app } = Application.defaultApplication({ genesis: { chainID: '10000000' } });

			expect(app.config).toBeDefined();
		});

		it('should merge the constants with genesis and assign it to app constants', () => {
			const customConfig = objects.cloneDeep(config);

			customConfig.genesis = {
				...config.genesis,
				maxTransactionsSize: 15 * 1024,
				blockTime: 5,
			};

			const { app } = Application.defaultApplication(customConfig);

			expect(app.config.genesis.maxTransactionsSize).toBe(15 * 1024);
		});

		it('should set internal variables', () => {
			// Act
			const { app } = Application.defaultApplication(config);

			// Assert
			expect(app.config).toMatchSnapshot();
			expect(app['_stateMachine']).toBeDefined();
			expect(app['_controller']).toBeDefined();
		});

		it('should not initialize logger', () => {
			// Act
			const { app } = Application.defaultApplication(config);

			// Assert
			expect(app.logger).toBeUndefined();
		});
	});

	describe('#registerPlugin', () => {
		it('should throw error when plugin with same name is already registered', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			app.registerPlugin(new TestPlugin());

			// Act && Assert
			expect(() => app.registerPlugin(new TestPlugin())).toThrow(
				'A plugin with name "test-plugin" is already registered.',
			);
		});

		it('should throw error when module with same name is already registered', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			class DuplicateNameModule extends TestModule {
				public get name() {
					return 'test-plugin';
				}
			}
			app.registerModule(new DuplicateNameModule());

			// Act && Assert
			expect(() => app.registerPlugin(new TestPlugin())).toThrow(
				'A module with name "test-plugin" is already registered.',
			);
		});

		it('should call validatePluginSpec function', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			jest.spyOn(basePluginModule, 'validatePluginSpec').mockReturnValue();

			// Act
			app.registerPlugin(new TestPlugin());

			// Assert
			expect(basePluginModule.validatePluginSpec).toHaveBeenCalledTimes(1);
			expect(basePluginModule.validatePluginSpec).toHaveBeenCalledWith(new TestPlugin());
		});

		it('should throw error when plugin is required to load as child process and not exported', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			jest.spyOn(basePluginModule, 'getPluginExportPath').mockReturnValue(undefined);

			// Act && Assert
			expect(() => app.registerPlugin(new TestPlugin(), { loadAsChildProcess: true })).toThrow(
				'Unable to register plugin "test-plugin" to load as child process. Package name or __filename must be specified in nodeModulePath.',
			);
			expect(basePluginModule.getPluginExportPath).toHaveBeenCalledTimes(1);
			expect(basePluginModule.getPluginExportPath).toHaveBeenCalledWith(new TestPlugin());
		});

		it('should add plugin to the collection', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			const plugin = new TestPlugin();
			jest.spyOn(app['_controller'], 'registerPlugin');
			app.registerPlugin(plugin);

			// Act && Assert
			expect(app['_controller'].registerPlugin).toHaveBeenCalledWith(plugin, {
				loadAsChildProcess: false,
			});
		});
	});

	describe('#registerModule', () => {
		it('should throw error when plugin with same name is already registered', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			class DuplicateNamePlugin extends TestPlugin {
				public get name() {
					return 'test-module';
				}
			}
			app.registerPlugin(new DuplicateNamePlugin());

			// Act && Assert
			expect(() => app.registerModule(new TestModule())).toThrow(
				'A plugin with name "test-module" is already registered.',
			);
		});
	});

	describe('#registerInteroperableModule', () => {
		it('should register CCCommands and CCMethods of the registered interoperable module', () => {
			const { app } = Application.defaultApplication(config);

			const testInteroperableModule = new TestInteroperableModule();

			app.registerInteroperableModule(testInteroperableModule);

			const interoperabilityModule = app['_registeredModules'].find(
				module => module.name === 'interoperability',
			) as SidechainInteroperabilityModule;

			expect(
				interoperabilityModule['interoperableCCCommands'].has(testInteroperableModule.name),
			).toBeTrue();

			expect(
				interoperabilityModule['interoperableCCMethods'].has(testInteroperableModule.name),
			).toBeTrue();
		});
	});

	describe('#run', () => {
		let app: Application;

		beforeEach(async () => {
			({ app } = Application.defaultApplication(config));
			jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
			// jest.spyOn(IPCServer.prototype, 'start').mockResolvedValue();
			jest.spyOn(Bus.prototype, 'publish').mockResolvedValue(jest.fn() as never);
			jest.spyOn(WSServer.prototype, 'start').mockResolvedValue(jest.fn() as never);

			jest.spyOn(ABIServer.prototype, 'start');
			await app.run();
		});

		afterEach(async () => {
			await app.shutdown();
		});

		// Skip for https://github.com/LiskHQ/lisk-sdk/issues/8184
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should start ABI server', () => {
			expect(ABIServer.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should try to cache genesis state', () => {
			expect(ABIHandler.prototype.cacheGenesisState).toHaveBeenCalledTimes(1);
		});

		// Skip for https://github.com/LiskHQ/lisk-sdk/issues/8184
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should start engine', () => {
			expect(childProcess.fork).toHaveBeenCalledTimes(1);
			expect(childProcess.fork).toHaveBeenCalledWith(expect.stringContaining('engine_igniter'), [
				expect.stringContaining('.ipc'),
				'--config',
				expect.stringContaining('engine_config.json'),
			]);
		});

		// Skip for https://github.com/LiskHQ/lisk-sdk/issues/8184
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should register engine signal handler', () => {
			expect(engineProcessMock.on).toHaveBeenCalledWith('exit', expect.any(Function));
			expect(engineProcessMock.on).toHaveBeenCalledWith('error', expect.any(Function));
		});
	});

	describe('#_setupDirectories', () => {
		let app: Application;
		let dirs: any;

		beforeEach(async () => {
			({ app } = Application.defaultApplication(config));
			jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
			// jest.spyOn(IPCServer.prototype, 'start').mockResolvedValue();
			jest.spyOn(Bus.prototype, 'publish').mockResolvedValue(jest.fn() as never);
			jest.spyOn(WSServer.prototype, 'start').mockResolvedValue(jest.fn() as never);

			await app.run();

			dirs = systemDirs(app.config.system.dataPath);
		});

		afterEach(async () => {
			await app.shutdown();
		});

		it('should ensure directory exists', () => {
			// Arrange
			jest.spyOn(fs, 'ensureDir');

			// Assert

			Array.from(Object.values(dirs)).map(dirPath =>
				expect(fs.ensureDir).toHaveBeenCalledWith(dirPath),
			);
		});

		it('should write process id to pid file if pid file not exits', () => {
			jest.spyOn(fs, 'pathExists').mockResolvedValue(false as never);
			jest.spyOn(fs, 'writeFile');

			expect(fs.writeFile).toHaveBeenCalledWith(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`${dirs.pids}/controller.pid`,
				expect.toBeString(),
				{
					mode: OWNER_READ_WRITE,
				},
			);
		});
	});

	describe('#_emptySocketsDirectory', () => {
		let app: Application;
		const fakeSocketFiles = ['1.sock' as any, '2.sock' as any];

		beforeEach(async () => {
			({ app } = Application.defaultApplication(config));
			jest.spyOn(Engine.prototype, 'start').mockResolvedValue();
			jest.spyOn(Engine.prototype, 'stop').mockResolvedValue();
			jest.spyOn(fs, 'readdirSync').mockReturnValue(fakeSocketFiles);
			jest.spyOn(Bus.prototype, 'publish').mockResolvedValue(jest.fn() as never);
			jest.spyOn(fs, 'unlink').mockResolvedValue();

			await app.run();
			app['_abiHandler'].event.emit(EVENT_ENGINE_READY);
			await app.shutdown();
		});

		it('should delete all files in ~/.lisk/tmp/sockets', () => {
			const { sockets: socketsPath } = systemDirs(app.config.system.dataPath);

			// Assert
			for (const aSocketFile of fakeSocketFiles) {
				expect(fs.unlink).toHaveBeenCalledWith(join(socketsPath, aSocketFile));
			}
		});
	});

	describe('shutdown', () => {
		let app: Application;
		const fakeSocketFiles = ['1.sock' as any, '2.sock' as any];
		let clearControllerPidFileSpy: jest.SpyInstance<any, unknown[]>;
		let emptySocketsDirectorySpy: jest.SpyInstance<any, unknown[]>;
		let blockChainDBSpy: jest.SpyInstance<any, unknown[]>;
		let forgerDBSpy: jest.SpyInstance<any, unknown[]>;

		beforeEach(async () => {
			jest.spyOn(Bus.prototype, 'publish').mockResolvedValue(jest.fn() as never);
			({ app } = Application.defaultApplication(config));
			jest.spyOn(Engine.prototype, 'start').mockResolvedValue();
			jest.spyOn(Engine.prototype, 'stop').mockResolvedValue();

			await app.run();
			app['_abiHandler'].event.emit(EVENT_ENGINE_READY);

			jest.spyOn(fs, 'readdirSync').mockReturnValue(fakeSocketFiles);
			jest.spyOn(app['_controller'], 'stop');
			blockChainDBSpy = jest.spyOn(app['_stateDB'], 'close');
			forgerDBSpy = jest.spyOn(app['_moduleDB'], 'close');
			emptySocketsDirectorySpy = jest
				.spyOn(app as any, '_emptySocketsDirectory')
				.mockResolvedValue([]);
			clearControllerPidFileSpy = jest.spyOn(app as any, '_clearControllerPidFile');
		});

		// Skip for https://github.com/LiskHQ/lisk-sdk/issues/8184
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should stop the engine', async () => {
			await app.shutdown();
			expect(engineProcessMock.kill).toHaveBeenCalledTimes(2);
			expect(engineProcessMock.kill).toHaveBeenCalledWith('SIGINT');
			expect(engineProcessMock.kill).toHaveBeenCalledWith('SIGTERM');
		});

		it('should call cleanup methods', async () => {
			await app.shutdown();
			expect(clearControllerPidFileSpy).toHaveBeenCalledTimes(1);
			expect(emptySocketsDirectorySpy).toHaveBeenCalledTimes(1);
			expect(blockChainDBSpy).toHaveBeenCalledTimes(1);
			expect(forgerDBSpy).toHaveBeenCalledTimes(1);
			expect(app['_controller'].stop).toHaveBeenCalledTimes(1);
		});

		it('should call clearControllerPidFileSpy method with correct pid file location', async () => {
			const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockReturnValue();
			await app.shutdown();
			expect(unlinkSyncSpy).toHaveBeenCalledWith(
				'/user/.lisk/beta-sdk-app/tmp/pids/controller.pid',
			);
		});
	});
});
