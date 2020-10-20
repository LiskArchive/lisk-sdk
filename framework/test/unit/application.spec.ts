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

import * as fs from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import { objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { Application } from '../../src/application';
import * as networkConfig from '../fixtures/config/devnet/config.json';
import { systemDirs } from '../../src/system_dirs';
import { createLogger } from '../../src/logger';
import { genesisBlock } from '../fixtures/blocks';
import { BaseModule, BaseAsset } from '../../src';

jest.mock('fs-extra');
jest.mock('@liskhq/lisk-db');
jest.mock('@liskhq/lisk-p2p');
jest.mock('../../src/logger');

const config: any = {
	...networkConfig,
};

// eslint-disable-next-line
describe('Application', () => {
	// Arrange
	const loggerMock = {
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		trace: jest.fn(),
		fatal: jest.fn(),
	};
	const genesisBlockJSON = (genesisBlock() as unknown) as Record<string, unknown>;

	(createLogger as jest.Mock).mockReturnValue(loggerMock);

	beforeEach(() => {
		jest.spyOn(os, 'homedir').mockReturnValue('~');
	});

	afterEach(() => {
		// So we can start a fresh schema each time Application is instantiated
		validator.removeSchema();
	});

	describe('#constructor', () => {
		it('should be able to start the application with default parameters if config is not provided', () => {
			const app = Application.defaultApplication(genesisBlockJSON);

			expect(app.config).toBeDefined();
		});

		it('should set app label with the genesis block transaction root prefixed with `lisk-` if label not provided', () => {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			const label = `lisk-${config.genesisConfig.communityIdentifier}`;
			const configWithoutLabel = objects.cloneDeep(config);
			delete configWithoutLabel.label;

			const app = Application.defaultApplication(genesisBlockJSON, configWithoutLabel);

			expect(app.config.label).toBe(label);
		});

		it('should use the same app label if provided', () => {
			const app = Application.defaultApplication(genesisBlockJSON, config);

			expect(app.config.label).toBe(config.label);
		});

		it('should set default rootPath if not provided', () => {
			// Arrange
			const rootPath = '~/.lisk';
			const configWithoutRootPath = objects.cloneDeep(config);
			delete configWithoutRootPath.rootPath;

			// Act
			const app = Application.defaultApplication(genesisBlockJSON, configWithoutRootPath);

			// Assert
			expect(app.config.rootPath).toBe(rootPath);
		});

		it('should set rootPath if provided', () => {
			// Arrange
			const customRootPath = '/my-lisk-folder';
			const configWithCustomRootPath = objects.cloneDeep(config);
			configWithCustomRootPath.rootPath = customRootPath;

			// Act
			const app = Application.defaultApplication(genesisBlockJSON, configWithCustomRootPath);

			// Assert
			expect(app.config.rootPath).toBe(customRootPath);
		});

		it('should set filename for logger if logger config was not provided', () => {
			// Arrange
			const configWithoutLogger = objects.cloneDeep(config);
			configWithoutLogger.logger = {};

			// Act
			const app = Application.defaultApplication(genesisBlockJSON, configWithoutLogger);

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

			const app = Application.defaultApplication(genesisBlockJSON, customConfig);

			expect(app.config.genesisConfig.maxPayloadLength).toBe(15 * 1024);
		});

		it('should set internal variables', () => {
			// Act
			const app = Application.defaultApplication(genesisBlockJSON, config);

			// Assert
			expect(app['_genesisBlock']).toEqual(genesisBlockJSON);
			expect(app.config).toMatchSnapshot();
			expect(app['_node']).not.toBeUndefined();
			expect(app['_plugins']).toBeInstanceOf(Object);
		});

		it('should not initialize logger', () => {
			// Act
			const app = Application.defaultApplication(genesisBlockJSON, config);

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
				Application.defaultApplication(genesisBlockJSON, invalidConfig);
			} catch (error) {
				/* eslint-disable jest/no-try-expect */
				expect(error.errors).toHaveLength(4);
				expect(error.errors[0].message).toContain('should match format "encryptedPassphrase"');
				expect(error.errors[1].message).toContain('should be >= 1');
				expect(error.errors[2].message).toContain('should be >= 1');
				expect(error.errors[3].message).toContain('should NOT have fewer than 2 items');
				/* eslint-enable jest/no-try-expect */
			}
		});
	});

	describe('#registerModule', () => {
		it('should throw error when transaction class is missing', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);

			// Act && Assert
			expect(() => (app as any).registerModule()).toThrow('Module implementation is required');
		});

		it('should throw an error if id is less than 2 when registering a module', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 1;
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				'Custom module must have id greater than 2',
			);
		});

		it('should throw an error if module id is missing', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 0;
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				"Custom module 'SampleModule' is missing either one or both of the required properties: 'id', 'name'.",
			);
		});

		it('should throw an error if module name is missing', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleModule extends BaseModule {
				public name = '';
				public id = 1000;
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				"Custom module 'SampleModule' is missing either one or both of the required properties: 'id', 'name'.",
			);
		});

		it('should throw error if id is less than 1000 when registering an external module', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 999;
			}
			// Assert
			expect(() => app.registerModule(SampleModule)).toThrow(
				'Custom module must have id greater than or equal to 1000',
			);
		});

		it('should throw an error if asset does not extend BaseAsset', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleAsset {
				public name = 'asset';
				public id = 0;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				// eslint-disable-next-line class-methods-use-this
				public async apply(): Promise<void> {}
			}
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 999999;
				public transactionAssets = [new SampleAsset()];
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				'Custom module contains asset which does not extend `BaseAsset` class.',
			);
		});

		it('should throw an error if asset id is invalid', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleAsset extends BaseAsset {
				public name = 'asset';
				public id = null as any;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				// eslint-disable-next-line class-methods-use-this
				public async apply(): Promise<void> {}
			}
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 999999;
				public transactionAssets = [new SampleAsset()];
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				'Custom module contains asset with invalid `id` property.',
			);
		});

		it('should throw an error if asset name is invalid', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleAsset extends BaseAsset {
				public name = '';
				public id = 0;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				// eslint-disable-next-line class-methods-use-this
				public async apply(): Promise<void> {}
			}
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 999999;
				public transactionAssets = [new SampleAsset()];
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				'Custom module contains asset with invalid `name` property.',
			);
		});

		it('should throw an error if asset schema is invalid', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleAsset extends BaseAsset {
				public name = 'asset';
				public id = 0;
				public schema = undefined as any;
				// eslint-disable-next-line class-methods-use-this
				public async apply(): Promise<void> {}
			}
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 999999;
				public transactionAssets = [new SampleAsset()];
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				'Custom module contains asset with invalid `schema` property.',
			);
		});

		it('should throw an error if asset apply is invalid', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleAsset extends BaseAsset {
				public name = 'asset';
				public id = 0;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				public apply = {} as any;
			}
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 999999;
				public transactionAssets = [new SampleAsset()];
			}
			// Assert
			expect(() => app['_registerModule'](SampleModule)).toThrow(
				'Custom module contains asset with invalid `apply` property.',
			);
		});

		it('should add custom module to collection.', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'registerModule');

			// Act
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public id = 1000;
			}
			app.registerModule(SampleModule);

			// Assert
			expect(app['_node'].registerModule).toHaveBeenCalledTimes(1);
		});
	});

	describe('#_initChannel', () => {
		let app;
		let actionsList: any;

		beforeEach(() => {
			// Arrange
			app = Application.defaultApplication(genesisBlockJSON, config);
			app['_channel'] = app['_initChannel']();
			actionsList = app['_channel'].actionsList;
		});

		it('should create getAccount action', () => {
			// Assert
			expect(actionsList).toContain('getAccount');
		});

		it('should create getAccounts action', () => {
			// Assert
			expect(actionsList).toContain('getAccounts');
		});

		it('should create getBlockByID action', () => {
			// Assert
			expect(actionsList).toContain('getBlockByID');
		});

		it('should create getBlocksByIDs action', () => {
			// Assert
			expect(actionsList).toContain('getBlocksByIDs');
		});

		it('should create getBlockByHeight action', () => {
			// Assert
			expect(actionsList).toContain('getBlockByHeight');
		});

		it('should create getBlocksByHeightBetween action', () => {
			// Assert
			expect(actionsList).toContain('getBlocksByHeightBetween');
		});

		it('should create getTransactionByID action', () => {
			// Assert
			expect(actionsList).toContain('getTransactionByID');
		});

		it('should create getTransactionsByIDs action', () => {
			// Assert
			expect(actionsList).toContain('getTransactionsByIDs');
		});
	});

	describe('#_setupDirectories', () => {
		let app: Application;
		let dirs: any;
		beforeEach(async () => {
			app = Application.defaultApplication(genesisBlockJSON, config);
			try {
				await app.run();
			} catch (error) {
				// Expected error
			}
			jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
			dirs = systemDirs(app.config.label, app.config.rootPath);
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
			app = Application.defaultApplication(genesisBlockJSON, config);
			try {
				await app.run();
			} catch (error) {
				// Expected error
			}
			jest.spyOn(fs, 'readdirSync').mockReturnValue(fakeSocketFiles);
		});

		it('should delete all files in ~/.lisk/tmp/sockets', () => {
			const { sockets: socketsPath } = systemDirs(app.config.label, app.config.rootPath);

			// Arrange
			const spy = jest.spyOn(fs, 'unlink').mockReturnValue(Promise.resolve());
			(app as any)._emptySocketsDirectory();

			// Assert
			for (const aSocketFile of fakeSocketFiles) {
				expect(spy).toHaveBeenCalledWith(join(socketsPath, aSocketFile), expect.anything());
			}
		});
	});

	describe('shutdown', () => {
		let app: Application;
		const fakeSocketFiles = ['1.sock' as any, '2.sock' as any];
		let clearControllerPidFileSpy: jest.SpyInstance<any, unknown[]>;
		let emptySocketsDirectorySpy: jest.SpyInstance<any, unknown[]>;
		let nodeCleanupSpy: jest.SpyInstance<any, unknown[]>;
		let controllerCleanupSpy: jest.SpyInstance<any, unknown[]>;
		let blockChainDBSpy: jest.SpyInstance<any, unknown[]>;
		let forgerDBSpy: jest.SpyInstance<any, unknown[]>;
		let _nodeDBSpy: jest.SpyInstance<any, unknown[]>;

		beforeEach(async () => {
			app = Application.defaultApplication(genesisBlockJSON, config);
			jest.spyOn(app['_node'], 'init').mockResolvedValue();
			await app.run();
			jest.spyOn(fs, 'readdirSync').mockReturnValue(fakeSocketFiles);
			jest.spyOn(process, 'exit').mockReturnValue(0 as never);
			nodeCleanupSpy = jest.spyOn((app as any)._node, 'cleanup').mockResolvedValue(true);
			controllerCleanupSpy = jest.spyOn((app as any)._controller, 'cleanup');
			blockChainDBSpy = jest.spyOn((app as any)._blockchainDB, 'close');
			forgerDBSpy = jest.spyOn((app as any)._forgerDB, 'close');
			_nodeDBSpy = jest.spyOn((app as any)._nodeDB, 'close');
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
			expect(controllerCleanupSpy).toHaveBeenCalledTimes(1);
		});

		it('should call clearControllerPidFileSpy method with correct pid file location', async () => {
			const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockReturnValue();
			await app.shutdown();
			expect(unlinkSyncSpy).toHaveBeenCalledWith('~/.lisk/devnet/tmp/pids/controller.pid');
		});
	});
});
