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
import { setUpUtilEnv } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('config util', () => {
	beforeEach(setUpUtilEnv);
	Given('a default config', given.aDefaultConfig, () => {
		Given(`a directory path "${os.homedir()}/.lisky"`, given.aDirectoryPath, () => {
			Given('a config file name "config.json"', given.aConfigFileName, () => {
				Given('the directory does not exist', given.theDirectoryDoesNotExist, () => {
					Given('the directory cannot be created', given.theDirectoryCannotBeCreated, () => {
						When('the config is loaded', when.theConfigIsLoaded, () => {
							Then('the user should be warned that the config will not be persisted', then.theUserShouldBeWarnedThatTheConfigWillNotBePersisted);
							Then('the default config should be exported', then.theDefaultConfigShouldBeExported);
						});
					});
					Given('the config directory can be created', given.theDirectoryCanBeCreated, () => {
						When('the config is loaded', when.theConfigIsLoaded, () => {
							Then('the default config should be written to the config file', then.theDefaultConfigShouldBeWrittenToTheConfigFile);
							Then('the default config should be exported', then.theDefaultConfigShouldBeExported);
						});
					});
				});
				Given('the config directory does exist', given.theDirectoryDoesExist, () => {
					Given('the config file does not exist', given.theFileDoesNotExist, () => {
						Given('the config file cannot be written', given.theFileCannotBeWritten, () => {
							When('the config is loaded', when.theConfigIsLoaded, () => {
								Then('the user should be warned that the config will not be persisted', then.theUserShouldBeWarnedThatTheConfigWillNotBePersisted);
								Then('the default config should be exported', then.theDefaultConfigShouldBeExported);
							});
						});
						Given('the config file can be written', given.theFileCanBeWritten, () => {
							When('the config is loaded', when.theConfigIsLoaded, () => {
								Then('the default config should be written to the config file', then.theDefaultConfigShouldBeWrittenToTheConfigFile);
								Then('the default config should be exported', then.theDefaultConfigShouldBeExported);
							});
						});
					});
					Given('the config file does exist', given.theFileDoesExist, () => {
						Given('the config file is not readable', given.theFileCannotBeRead, () => {
							When('the config is loaded', when.theConfigIsLoaded, () => {
								Then('the user should be informed that the config file permissions are incorrect', then.theUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect);
								Then('the process should exit with error code "1"', then.theProcessShouldExitWithErrorCode);
								Then('the config file should not be written', then.theConfigFileShouldNotBeWritten);
							});
						});
						Given('the config file can be read', given.theFileCanBeRead, () => {
							Given('the config file is not valid JSON', given.theFileIsNotValidJSON, () => {
								When('the config is loaded', when.theConfigIsLoaded, () => {
									Then('the user should be informed that the config file is not valid JSON', then.theUserShouldBeInformedThatTheConfigFileIsNotValidJSON);
									Then('the process should exit with error code "2"', then.theProcessShouldExitWithErrorCode);
									Then('the config file should not be written', then.theConfigFileShouldNotBeWritten);
								});
							});
							Given('the config file is valid JSON', given.theFileIsValidJSON, () => {
								Given('the config file cannot be written', given.theFileCannotBeWritten, () => {
									When('the config is loaded', when.theConfigIsLoaded, () => {
										Then('the config file should not be written', then.theConfigFileShouldNotBeWritten);
										Then('the user’s config should be exported', then.theUsersConfigShouldBeExported);
									});
								});
								Given('the config file can be written', given.theFileCanBeWritten, () => {
									When('the config is loaded', when.theConfigIsLoaded, () => {
										Then('the config file should not be written', then.theConfigFileShouldNotBeWritten);
										Then('the user’s config should be exported', then.theUsersConfigShouldBeExported);
									});
								});
							});
						});
					});
				});
			});
		});
	});
});
