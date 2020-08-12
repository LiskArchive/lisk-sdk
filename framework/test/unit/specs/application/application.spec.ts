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
import { Application } from '../../../../src/application';
import * as networkConfig from '../../../fixtures/config/devnet/config.json';
import { systemDirs } from '../../../../src/application/system_dirs';
import { createLogger } from '../../../../src/application/logger';
import { genesisBlock } from '../../../fixtures/blocks';
import { BaseModule } from '../../../../src';

jest.mock('fs-extra');
jest.mock('@liskhq/lisk-db');
jest.mock('@liskhq/lisk-p2p');
jest.mock('../../../../src/application/logger');

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
				maxPayloadLength: 15 * 1024,
				communityIdentifier: 'Lisk',
				blockTime: 2,
				rewards: {
					milestones: ['500000000', '400000000', '300000000', '200000000', '100000000'],
					offset: 2160,
					distance: 3000000,
				},
			};

			const app = Application.defaultApplication(genesisBlockJSON, customConfig);

			expect(app.constants.maxPayloadLength).toBe(15 * 1024);
		});

		it('should set internal variables', () => {
			// Act
			const app = Application.defaultApplication(genesisBlockJSON, config);

			// Assert
			expect(app['_genesisBlock']).toEqual(genesisBlockJSON);
			expect(app.config).toMatchSnapshot();
			expect(app['_controller']).toBeUndefined();
			expect(app['_node']).toBeUndefined();
			expect(app['_network']).toBeUndefined();
			expect(app['_channel']).toBeUndefined();
			expect(app['_plugins']).toBeInstanceOf(Object);
		});

		it('should not initialize logger', () => {
			// Act
			const app = Application.defaultApplication(genesisBlockJSON, config);

			// Assert
			expect(app.logger).toBeUndefined();
		});

		it('should throw validation error if constants are overridden by the user', () => {
			const customConfig = objects.cloneDeep(config);

			customConfig.genesisConfig = {
				CONSTANT: 'aConstant',
			};

			expect(() => {
				// eslint-disable-next-line no-new
				Application.defaultApplication(genesisBlockJSON, customConfig);
			}).toThrow(
				"Lisk validator found 1 error[s]:\nMissing property, should have required property 'communityIdentifier'",
			);
		});
	});

	describe('#registerModule', () => {
		it('should throw error when transaction class is missing.', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);

			// Act && Assert
			expect(() => (app as any).registerModule()).toThrow('Module implementation is required');
		});

		it('should add custom module to collection.', () => {
			// Arrange
			const app = Application.defaultApplication(genesisBlockJSON, config);

			// Act
			class SampleModule extends BaseModule {
				public name = 'SampleModule';
				public type = 0;
			}
			app.registerModule(SampleModule);

			// Assert
			expect(app['_customModules'].pop()).toBe(SampleModule);
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
});
