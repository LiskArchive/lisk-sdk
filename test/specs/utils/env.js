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
import {
	givenADefaultConfig,
	givenADirectoryPath,
	givenAConfigFileName,
	givenTheDirectoryDoesNotExist,
	givenTheDirectoryDoesExist,
	givenTheDirectoryCannotBeCreated,
	givenTheDirectoryCanBeCreated,
	givenTheFileDoesNotExist,
	givenTheFileDoesExist,
	givenTheFileCannotBeWritten,
	givenTheFileCanBeWritten,
	givenTheFileCannotBeRead,
	givenTheFileCanBeRead,
	givenTheFileIsNotValidJSON,
	givenTheFileIsValidJSON,
} from '../../steps/1_given';
import {
	whenTheConfigIsLoaded,
} from '../../steps/2_when';
import {
	thenTheDefaultConfigShouldBeExported,
	thenTheUsersConfigShouldBeExported,
	thenTheDefaultConfigShouldBeWrittenToTheConfigFile,
	thenTheConfigFileShouldNotBeWritten,
	thenTheUserShouldBeWarnedThatTheConfigWillNotBePersisted,
	thenTheUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect,
	thenTheUserShouldBeInformedThatTheConfigFileIsNotValidJSON,
	thenTheProcessShouldExitWithErrorCode,
} from '../../steps/3_then';

const CONFIG_PATH = '../../../src/utils/env';

describe('env util', () => {
	beforeEach(() => {
		setUpFsStubs();
		setUpConsoleStubs();
		setUpProcessStubs();
		delete require.cache[require.resolve(CONFIG_PATH)];
	});

	describe('Given a default config', () => {
		beforeEach(givenADefaultConfig);

		describe(`Given a directory path "${os.homedir()}/.lisky"`, () => {
			beforeEach(givenADirectoryPath);

			describe('Given a config file name "config.json"', () => {
				beforeEach(givenAConfigFileName);

				describe('Given the directory does not exist', () => {
					beforeEach(givenTheDirectoryDoesNotExist);

					describe('Given the directory cannot be created', () => {
						beforeEach(givenTheDirectoryCannotBeCreated);

						describe('When the config is loaded', () => {
							beforeEach(whenTheConfigIsLoaded);

							it('Then the user should be warned that the config will not be persisted', thenTheUserShouldBeWarnedThatTheConfigWillNotBePersisted);

							it('Then the default config should be exported', thenTheDefaultConfigShouldBeExported);
						});
					});

					describe('Given the config directory can be created', () => {
						beforeEach(givenTheDirectoryCanBeCreated);

						describe('When the config is loaded', () => {
							beforeEach(whenTheConfigIsLoaded);

							it('Then the default config should be written to the config file', thenTheDefaultConfigShouldBeWrittenToTheConfigFile);

							it('Then the default config should be exported', thenTheDefaultConfigShouldBeExported);
						});
					});
				});

				describe('Given the config directory does exist', () => {
					beforeEach(givenTheDirectoryDoesExist);

					describe('Given the config file does not exist', () => {
						beforeEach(givenTheFileDoesNotExist);

						describe('Given the config file cannot be written', () => {
							beforeEach(givenTheFileCannotBeWritten);

							describe('When the config is loaded', () => {
								beforeEach(whenTheConfigIsLoaded);

								it('Then the user should be warned that the config will not be persisted', thenTheUserShouldBeWarnedThatTheConfigWillNotBePersisted);

								it('Then the default config should be exported', thenTheDefaultConfigShouldBeExported);
							});
						});

						describe('Given the config file can be written', () => {
							beforeEach(givenTheFileCanBeWritten);

							describe('When the config is loaded', () => {
								beforeEach(whenTheConfigIsLoaded);

								it('Then the default config should be written to the config file', thenTheDefaultConfigShouldBeWrittenToTheConfigFile);

								it('Then the default config should be exported', thenTheDefaultConfigShouldBeExported);
							});
						});
					});

					describe('Given the config file does exist', () => {
						beforeEach(givenTheFileDoesExist);

						describe('Given the config file is not readable', () => {
							beforeEach(givenTheFileCannotBeRead);

							describe('When the config is loaded', () => {
								beforeEach(whenTheConfigIsLoaded);

								it('Then the user should be informed that the config file permissions are incorrect', thenTheUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect);

								it('Then the process should exit with error code "1"', thenTheProcessShouldExitWithErrorCode);

								it('Then the config file should not be written', thenTheConfigFileShouldNotBeWritten);
							});
						});

						describe('Given the config file can be read', () => {
							beforeEach(givenTheFileCanBeRead);

							describe('Given the config file is not valid JSON', () => {
								beforeEach(givenTheFileIsNotValidJSON);

								describe('When the config is loaded', () => {
									beforeEach(whenTheConfigIsLoaded);

									it('Then the user should be informed that the config file is not valid JSON', thenTheUserShouldBeInformedThatTheConfigFileIsNotValidJSON);

									it('Then the process should exit with error code "2"', thenTheProcessShouldExitWithErrorCode);

									it('Then the config file should not be written', thenTheConfigFileShouldNotBeWritten);
								});
							});

							describe('Given the config file is valid JSON', () => {
								beforeEach(givenTheFileIsValidJSON);

								describe('Given the config file cannot be written', () => {
									beforeEach(givenTheFileCannotBeWritten);

									describe('When the config is loaded', () => {
										beforeEach(whenTheConfigIsLoaded);

										it('Then the config file should not be written', thenTheConfigFileShouldNotBeWritten);

										it('Then the user’s config should be exported', thenTheUsersConfigShouldBeExported);
									});
								});

								describe('Given the config file can be written', () => {
									beforeEach(givenTheFileCanBeWritten);

									describe('When the config is loaded', () => {
										beforeEach(whenTheConfigIsLoaded);

										it('Then the config file should not be written', thenTheConfigFileShouldNotBeWritten);

										it('Then the user’s config should be exported', thenTheUsersConfigShouldBeExported);
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
