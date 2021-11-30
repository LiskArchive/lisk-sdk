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
import * as fs from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import { Block, BlockAssets } from '@liskhq/lisk-chain';
import { BaseChannel, BasePlugin } from '../../src';
import { Application } from '../../src/application';
import { Bus } from '../../src/controller/bus';
// import { IPCServer } from '../../src/controller/ipc/ipc_server';
import { WSServer } from '../../src/controller/ws/ws_server';
import { createLogger } from '../../src/logger';
import { Node } from '../../src/node';
import { systemDirs } from '../../src/system_dirs';
import * as basePluginModule from '../../src/plugins/base_plugin';
import * as networkConfig from '../fixtures/config/devnet/config.json';
import { createFakeBlockHeader } from '../fixtures';

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
	public name = 'test-plugin';

	public get nodeModulePath(): string {
		return __filename;
	}

	public async load(_channel: BaseChannel): Promise<void> {}

	public async unload(): Promise<void> {}
}

describe('Application', () => {
	// Arrange
	const config: any = {
		...networkConfig,
	};
	const loggerMock = {
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		trace: jest.fn(),
		fatal: jest.fn(),
	};

	(createLogger as jest.Mock).mockReturnValue(loggerMock);

	beforeEach(() => {
		jest.spyOn(os, 'homedir').mockReturnValue('/user');
		// jest.spyOn(IPCServer.prototype, 'start').mockResolvedValue();
		jest.spyOn(WSServer.prototype, 'start').mockResolvedValue(jest.fn() as never);
		jest.spyOn(Node.prototype, 'init').mockResolvedValue();
		jest.spyOn(process, 'exit').mockReturnValue(0 as never);
	});

	describe('#constructor', () => {
		it('should be able to start the application with default parameters if config is not provided', () => {
			const { app } = Application.defaultApplication();

			expect(app.config).toBeDefined();
		});

		it('should set app label with the genesis block transaction root prefixed with `lisk-` if label not provided', () => {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			const label = `lisk-${config.genesisConfig.communityIdentifier}`;
			const configWithoutLabel = objects.cloneDeep(config);
			delete configWithoutLabel.label;

			const { app } = Application.defaultApplication(configWithoutLabel);

			expect(app.config.label).toBe(label);
		});

		it('should use the same app label if provided', () => {
			const { app } = Application.defaultApplication(config);

			expect(app.config.label).toBe(config.label);
		});

		it('should set default rootPath if not provided', () => {
			// Arrange
			const rootPath = '~/.lisk';
			const configWithoutRootPath = objects.cloneDeep(config);
			delete configWithoutRootPath.rootPath;

			// Act
			const { app } = Application.defaultApplication(configWithoutRootPath);

			// Assert
			expect(app.config.rootPath).toBe(rootPath);
		});

		it('should set rootPath if provided', () => {
			// Arrange
			const customRootPath = '/my-lisk-folder';
			const configWithCustomRootPath = objects.cloneDeep(config);
			configWithCustomRootPath.rootPath = customRootPath;

			// Act
			const { app } = Application.defaultApplication(configWithCustomRootPath);

			// Assert
			expect(app.config.rootPath).toBe(customRootPath);
		});

		it('should set filename for logger if logger config was not provided', () => {
			// Arrange
			const configWithoutLogger = objects.cloneDeep(config);
			configWithoutLogger.logger = {};

			// Act
			const { app } = Application.defaultApplication(configWithoutLogger);

			// Assert
			expect(app.config.logger.logFileName).toBe('lisk.log');
		});

		it('should merge the constants with genesisConfig and assign it to app constants', () => {
			const customConfig = objects.cloneDeep(config);

			customConfig.genesisConfig = {
				...config.genesisConfig,
				maxPayloadLength: 15 * 1024,
				communityIdentifier: 'Lisk',
				blockTime: 5,
				rewards: {
					milestones: ['500000000', '400000000', '300000000', '200000000', '100000000'],
					offset: 2160,
					distance: 3000000,
				},
			};

			const { app } = Application.defaultApplication(customConfig);

			expect(app.config.genesisConfig.maxPayloadLength).toBe(15 * 1024);
		});

		it('should set internal variables', () => {
			// Act
			const { app } = Application.defaultApplication(config);

			// Assert
			expect(app.config).toMatchSnapshot();
			expect(app['_node']).not.toBeUndefined();
			expect(app['_controller']).not.toBeUndefined();
		});

		it('should not initialize logger', () => {
			// Act
			const { app } = Application.defaultApplication(config);

			// Assert
			expect(app.logger).toBeUndefined();
		});

		it('should throw if invalid forger is provided', () => {
			// Arrange
			const invalidConfig = objects.mergeDeep({}, config, {
				forging: {
					delegates: [
						{
							encryptedPassphrase:
								'0dbd21ac5c154dbb72ce90a4e252a64b692203a4f8e25f8bfa1b1993e2ba7a9bd9e1ef1896d8d584a62daf17a8ccf12b99f29521b92cc98b74434ff501374f7e1c6d8371a6ce4e2d083489',
							address: '9cabee3d27426676b852ce6b804cb2fdff7cd0b5',
							hashOnion: {
								count: 0,
								distance: 0,
								hashes: [],
							},
						},
					],
				},
			});
			// Act & Assert
			expect.assertions(5);
			try {
				Application.defaultApplication(invalidConfig);
			} catch (error) {
				/* eslint-disable jest/no-try-expect */
				expect(error.errors).toHaveLength(4);
				expect(error.errors[0].message).toContain('must match format "encryptedPassphrase"');
				expect(error.errors[1].message).toContain('must be >= 1');
				expect(error.errors[2].message).toContain('must be >= 1');
				expect(error.errors[3].message).toContain('must NOT have fewer than 2 items');
				/* eslint-enable jest/no-try-expect */
			}
		});
	});

	describe('#registerPlugin', () => {
		it('should throw error when plugin name is missing', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			class MyPlugin extends TestPlugin {
				public name = '';
			}

			// Act && Assert
			expect(() => app.registerPlugin(new MyPlugin())).toThrow('Plugin "name" is required.');
		});

		it('should throw error when plugin with same name is already registered', () => {
			// Arrange
			const { app } = Application.defaultApplication(config);
			class MyPlugin extends TestPlugin {
				public name = 'my-plugin';
			}
			app.registerPlugin(new MyPlugin());

			// Act && Assert
			expect(() => app.registerPlugin(new MyPlugin())).toThrow(
				'A plugin with name "my-plugin" already registered.',
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

	describe('#_setupDirectories', () => {
		let app: Application;
		let dirs: any;

		beforeEach(async () => {
			({ app } = Application.defaultApplication(config));
			jest.spyOn(app['_node']['_network'], 'start').mockResolvedValue();
			jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
			// jest.spyOn(IPCServer.prototype, 'start').mockResolvedValue();
			jest.spyOn(Bus.prototype, 'publish').mockResolvedValue(jest.fn() as never);
			jest.spyOn(WSServer.prototype, 'start').mockResolvedValue(jest.fn() as never);
			jest.spyOn(app['_node']['_stateMachine'], 'executeGenesisBlock').mockResolvedValue();

			await app.run(new Block(createFakeBlockHeader(), [], new BlockAssets()));

			dirs = systemDirs(app.config.label, app.config.rootPath);
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
				expect.toBeNumber(),
			);
		});
	});

	describe('#_emptySocketsDirectory', () => {
		let app: Application;
		const fakeSocketFiles = ['1.sock' as any, '2.sock' as any];

		beforeEach(async () => {
			({ app } = Application.defaultApplication(config));
			jest.spyOn(app['_node'], 'init').mockResolvedValue();
			jest.spyOn(app['_node'], 'start').mockResolvedValue();
			jest.spyOn(app['_node'], 'stop').mockResolvedValue();
			jest.spyOn(fs, 'readdirSync').mockReturnValue(fakeSocketFiles);
			jest.spyOn(Bus.prototype, 'publish').mockResolvedValue(jest.fn() as never);
			jest.spyOn(fs, 'unlink').mockResolvedValue();
			jest.spyOn(app['_node']['_stateMachine'], 'executeGenesisBlock').mockResolvedValue();

			await app.run(new Block(createFakeBlockHeader(), [], new BlockAssets()));
			await app.shutdown();
		});

		it('should delete all files in ~/.lisk/tmp/sockets', () => {
			const { sockets: socketsPath } = systemDirs(app.config.label, app.config.rootPath);

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
		let nodeCleanupSpy: jest.SpyInstance<any, unknown[]>;
		let blockChainDBSpy: jest.SpyInstance<any, unknown[]>;
		let forgerDBSpy: jest.SpyInstance<any, unknown[]>;
		let _nodeDBSpy: jest.SpyInstance<any, unknown[]>;

		beforeEach(async () => {
			jest.spyOn(Bus.prototype, 'publish').mockResolvedValue(jest.fn() as never);
			({ app } = Application.defaultApplication(config));
			jest.spyOn(app['_node']['_network'], 'start').mockResolvedValue();
			jest.spyOn(app['_node']['_stateMachine'], 'executeGenesisBlock').mockResolvedValue();

			await app.run(new Block(createFakeBlockHeader(), [], new BlockAssets()));

			jest.spyOn(fs, 'readdirSync').mockReturnValue(fakeSocketFiles);
			nodeCleanupSpy = jest.spyOn(app['_node'], 'stop').mockResolvedValue();
			jest.spyOn(app['_controller'], 'stop');
			blockChainDBSpy = jest.spyOn(app['_blockchainDB'], 'close');
			forgerDBSpy = jest.spyOn(app['_forgerDB'], 'close');
			_nodeDBSpy = jest.spyOn(app['_nodeDB'], 'close');
			emptySocketsDirectorySpy = jest
				.spyOn(app as any, '_emptySocketsDirectory')
				.mockResolvedValue([]);
			clearControllerPidFileSpy = jest.spyOn(app as any, '_clearControllerPidFile');
		});

		it('should call cleanup methods', async () => {
			await app.shutdown();
			expect(clearControllerPidFileSpy).toHaveBeenCalledTimes(1);
			expect(emptySocketsDirectorySpy).toHaveBeenCalledTimes(1);
			expect(nodeCleanupSpy).toHaveBeenCalledTimes(1);
			expect(blockChainDBSpy).toHaveBeenCalledTimes(1);
			expect(forgerDBSpy).toHaveBeenCalledTimes(1);
			expect(_nodeDBSpy).toHaveBeenCalledTimes(1);
			expect(app['_controller'].stop).toHaveBeenCalledTimes(1);
		});

		it('should call clearControllerPidFileSpy method with correct pid file location', async () => {
			const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockReturnValue();
			await app.shutdown();
			expect(unlinkSyncSpy).toHaveBeenCalledWith('/user/.lisk/devnet/tmp/pids/controller.pid');
		});
	});
});
