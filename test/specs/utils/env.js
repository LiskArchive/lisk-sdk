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

import {
	setUpFsStubs,
	setUpConsoleStubs,
	setUpProcessStubs,
} from '../../steps/utils';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

const CONFIG_PATH = '../../../src/utils/env';

describe('env util', () => {
	beforeEach(() => {
		setUpFsStubs();
		setUpConsoleStubs();
		setUpProcessStubs();
		delete require.cache[require.resolve(CONFIG_PATH)];
	});

	describe('Given a default config', () => {
		beforeEach(given.aDefaultConfig);

		describe(`Given a directory path "${os.homedir()}/.lisky"`, () => {
			beforeEach(given.aDirectoryPath);

			describe('Given a config file name "config.json"', () => {
				beforeEach(given.aConfigFileName);

				describe('Given the directory does not exist', () => {
					beforeEach(given.theDirectoryDoesNotExist);

					describe('Given the directory cannot be created', () => {
						beforeEach(given.theDirectoryCannotBeCreated);

						describe('When the config is loaded', () => {
							beforeEach(when.theConfigIsLoaded);

							it('Then the user should be warned that the config will not be persisted', then.theUserShouldBeWarnedThatTheConfigWillNotBePersisted);
							it('Then the default config should be exported', then.theDefaultConfigShouldBeExported);
						});
					});

					describe('Given the config directory can be created', () => {
						beforeEach(given.theDirectoryCanBeCreated);

						describe('When the config is loaded', () => {
							beforeEach(when.theConfigIsLoaded);

							it('Then the default config should be written to the config file', then.theDefaultConfigShouldBeWrittenToTheConfigFile);
							it('Then the default config should be exported', then.theDefaultConfigShouldBeExported);
						});
					});
				});

				describe('Given the config directory does exist', () => {
					beforeEach(given.theDirectoryDoesExist);

					describe('Given the config file does not exist', () => {
						beforeEach(given.theFileDoesNotExist);

						describe('Given the config file cannot be written', () => {
							beforeEach(given.theFileCannotBeWritten);

							describe('When the config is loaded', () => {
								beforeEach(when.theConfigIsLoaded);

								it('Then the user should be warned that the config will not be persisted', then.theUserShouldBeWarnedThatTheConfigWillNotBePersisted);
								it('Then the default config should be exported', then.theDefaultConfigShouldBeExported);
							});
						});

						describe('Given the config file can be written', () => {
							beforeEach(given.theFileCanBeWritten);

							describe('When the config is loaded', () => {
								beforeEach(when.theConfigIsLoaded);

								it('Then the default config should be written to the config file', then.theDefaultConfigShouldBeWrittenToTheConfigFile);
								it('Then the default config should be exported', then.theDefaultConfigShouldBeExported);
							});
						});
					});

					describe('Given the config file does exist', () => {
						beforeEach(given.theFileDoesExist);

						describe('Given the config file is not readable', () => {
							beforeEach(given.theFileCannotBeRead);

							describe('When the config is loaded', () => {
								beforeEach(when.theConfigIsLoaded);

								it('Then the user should be informed that the config file permissions are incorrect', then.theUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect);
								it('Then the process should exit with error code "1"', then.theProcessShouldExitWithErrorCode);
								it('Then the config file should not be written', then.theConfigFileShouldNotBeWritten);
							});
						});

						describe('Given the config file can be read', () => {
							beforeEach(given.theFileCanBeRead);

							describe('Given the config file is not valid JSON', () => {
								beforeEach(given.theFileIsNotValidJSON);

								describe('When the config is loaded', () => {
									beforeEach(when.theConfigIsLoaded);

									it('Then the user should be informed that the config file is not valid JSON', then.theUserShouldBeInformedThatTheConfigFileIsNotValidJSON);
									it('Then the process should exit with error code "2"', then.theProcessShouldExitWithErrorCode);
									it('Then the config file should not be written', then.theConfigFileShouldNotBeWritten);
								});
							});

							describe('Given the config file is valid JSON', () => {
								beforeEach(given.theFileIsValidJSON);

								describe('Given the config file cannot be written', () => {
									beforeEach(given.theFileCannotBeWritten);

									describe('When the config is loaded', () => {
										beforeEach(when.theConfigIsLoaded);

										it('Then the config file should not be written', then.theConfigFileShouldNotBeWritten);
										it('Then the user’s config should be exported', then.theUsersConfigShouldBeExported);
									});
								});

								describe('Given the config file can be written', () => {
									beforeEach(given.theFileCanBeWritten);

									describe('When the config is loaded', () => {
										beforeEach(when.theConfigIsLoaded);

										it('Then the config file should not be written', then.theConfigFileShouldNotBeWritten);
										it('Then the user’s config should be exported', then.theUsersConfigShouldBeExported);
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
