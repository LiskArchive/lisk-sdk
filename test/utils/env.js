/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import os from 'os';
import fse from 'fs-extra';
import defaultConfig from '../../defaultConfig.json';

const userConfig = {
	name: 'custom',
	json: true,
	liskJS: {
		testnet: true,
		node: 'custom',
		port: 7000,
		ssl: true,
	},
};

const envPath = '../../src/utils/env';
const configDirName = '.lisky';
const configFileName = 'config.json';
const homedir = os.homedir();
const configDirPath = `${homedir}/${configDirName}`;
const configFilePath = `${configDirPath}/${configFileName}`;

const jsonWriteOptions = { spaces: '\t' };

// eslint-disable-next-line global-require, import/no-dynamic-require
const reloadConfig = () => require(envPath).default;

const shouldExportTheDefaultConfig = (exportedConfig) => {
	(exportedConfig).should.eql(defaultConfig);
};

const shouldExportTheUsersConfig = (exportedConfig) => {
	(exportedConfig).should.eql(userConfig);
};

const shouldNotWriteToTheConfigFile = (writeJsonSyncStub) => {
	(writeJsonSyncStub.called).should.be.false();
};

const shouldWriteTheDefaultConfigToTheConfigFile = (writeJsonSyncStub) => {
	(writeJsonSyncStub.calledWithExactly(configFilePath, defaultConfig, jsonWriteOptions))
		.should.be.true();
};

const shouldWarnTheUserThatTheConfigWillNotBePersisted = (consoleWarnStub) => {
	(consoleWarnStub.args
		.some(args => args[0].match(/Your configuration will not be persisted\./))
	).should.be.true();
};

const shouldPrintAnErrorInformingTheUserThatTheConfigFilePermissionsAreInconsistent =
	(consoleErrorStub) => {
		(consoleErrorStub.calledWithExactly(`Could not read config file. Please check permissions for ${configFilePath} or delete the file so we can create a new one from defaults.`))
			.should.be.true();
	};

const shouldPrintAnErrorInformingTheUserThatTheConfigFileIsNotValidJSON = (consoleErrorStub) => {
	(consoleErrorStub.calledWithExactly(`Config file is not valid JSON. Please check ${configFilePath} or delete the file so we can create a new one from defaults.`))
		.should.be.true();
};

const shouldExitTheProcessWithAnErrorCode = (processExitStub, code) => {
	(processExitStub.calledWithExactly(code)).should.be.true();
};

describe('env util', () => {
	let existsSyncStub;
	let mkdirSyncStub;
	let readJsonSyncStub;
	let writeJsonSyncStub;
	let accessSyncStub;
	let consoleWarnStub;
	let consoleErrorStub;
	let processExitStub;
	let exportedConfig;

	beforeEach(() => {
		delete require.cache[require.resolve(envPath)];

		existsSyncStub = sinon.stub(fse, 'existsSync');
		mkdirSyncStub = sinon.stub(fse, 'mkdirSync');
		readJsonSyncStub = sinon.stub(fse, 'readJsonSync');
		writeJsonSyncStub = sinon.stub(fse, 'writeJsonSync');
		accessSyncStub = sinon.stub(fse, 'accessSync');
		consoleWarnStub = sinon.stub(console, 'warn');
		consoleErrorStub = sinon.stub(console, 'error');
		processExitStub = sinon.stub(process, 'exit');
	});

	afterEach(() => {
		existsSyncStub.restore();
		mkdirSyncStub.restore();
		readJsonSyncStub.restore();
		writeJsonSyncStub.restore();
		accessSyncStub.restore();
		consoleWarnStub.restore();
		consoleErrorStub.restore();
		processExitStub.restore();
	});

	describe('when lisky config directory does not exist', () => {
		beforeEach(() => {
			existsSyncStub.withArgs(configDirPath).returns(false);
			readJsonSyncStub.throws('Cannot read file');
		});

		describe('when lisky config directory cannot be created', () => {
			beforeEach(() => {
				mkdirSyncStub.throws('Cannot make directory');
				exportedConfig = reloadConfig();
			});

			it('should warn the user that the config will not be persisted',
				() => shouldWarnTheUserThatTheConfigWillNotBePersisted(consoleWarnStub),
			);

			it('should export the default config',
				() => shouldExportTheDefaultConfig(exportedConfig),
			);
		});

		describe('when lisky config directory can be created', () => {
			beforeEach(() => {
				readJsonSyncStub.returns(Object.assign({}, defaultConfig));
				exportedConfig = reloadConfig();
			});

			it('should write the default config to the config file',
				() => shouldWriteTheDefaultConfigToTheConfigFile(writeJsonSyncStub),
			);

			it('should export the default config',
				() => shouldExportTheDefaultConfig(exportedConfig),
			);
		});
	});

	describe('when lisky config directory does exist', () => {
		beforeEach(() => {
			existsSyncStub.withArgs(configDirPath).returns(true);
		});

		describe('when lisky config file does not exist', () => {
			beforeEach(() => {
				existsSyncStub.withArgs(configFilePath).returns(false);
				readJsonSyncStub.throws('Cannot read file');
			});

			describe('when lisky config file is not writable', () => {
				beforeEach(() => {
					writeJsonSyncStub.throws('Cannot write to file');
					exportedConfig = reloadConfig();
				});

				it('should warn the user that the config will not be persisted',
					() => shouldWarnTheUserThatTheConfigWillNotBePersisted(consoleWarnStub),
				);

				it('should export the default config',
					() => shouldExportTheDefaultConfig(exportedConfig),
				);
			});

			describe('when lisky config file is writable', () => {
				beforeEach(() => {
					exportedConfig = reloadConfig();
				});

				it('should write the default config to the config file',
					() => shouldWriteTheDefaultConfigToTheConfigFile(writeJsonSyncStub),
				);

				it('should export the default config',
					() => shouldExportTheDefaultConfig(exportedConfig),
				);
			});
		});

		describe('when lisky config file does exist', () => {
			beforeEach(() => {
				existsSyncStub.withArgs(configFilePath).returns(true);
			});

			describe('when lisky config file is not readable', () => {
				beforeEach(() => {
					readJsonSyncStub.throws('Cannot read file');
					accessSyncStub.withArgs(configFilePath, fse.constants.R_OK).throws('Cannot read file');
					exportedConfig = reloadConfig();
				});

				it('should print an error informing the user that the config file permissions are incorrect',
					() => shouldPrintAnErrorInformingTheUserThatTheConfigFilePermissionsAreInconsistent(
						consoleErrorStub,
					),
				);

				it('should exit the process with error code 1',
					() => shouldExitTheProcessWithAnErrorCode(processExitStub, 1),
				);

				it('should not write to the config file',
					() => shouldNotWriteToTheConfigFile(writeJsonSyncStub),
				);
			});

			describe('when lisky config file is readable', () => {
				describe('when lisky config file is not valid JSON', () => {
					beforeEach(() => {
						readJsonSyncStub.throws('Invalid JSON');
						exportedConfig = reloadConfig();
					});

					it('should print an error informing the user that the config file is not valid JSON',
						() => shouldPrintAnErrorInformingTheUserThatTheConfigFileIsNotValidJSON(
							consoleErrorStub,
						),
					);

					it('should exit the process with error code 2',
						() => shouldExitTheProcessWithAnErrorCode(processExitStub, 2),
					);

					it('should not write to the config file',
						() => shouldNotWriteToTheConfigFile(writeJsonSyncStub),
					);
				});

				describe('when lisky config file is valid JSON', () => {
					beforeEach(() => {
						readJsonSyncStub.returns(Object.assign({}, userConfig));
					});

					describe('when lisky config file is not writable', () => {
						beforeEach(() => {
							writeJsonSyncStub.throws('Cannot write JSON');
							exportedConfig = reloadConfig();
						});

						it('should not write to the config file',
							() => shouldNotWriteToTheConfigFile(writeJsonSyncStub),
						);

						it('should export the user’s config',
							() => shouldExportTheUsersConfig(exportedConfig),
						);
					});

					describe('when lisky config file is writable', () => {
						beforeEach(() => {
							exportedConfig = reloadConfig();
						});

						it('should not write to the config file',
							() => shouldNotWriteToTheConfigFile(writeJsonSyncStub),
						);

						it('should export the user’s config',
							() => shouldExportTheUsersConfig(exportedConfig),
						);
					});
				});
			});
		});
	});
});
