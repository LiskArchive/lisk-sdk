/*
 * LiskHQ/lisk-commander
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
import { setUpUtilConfig, tearDownUtilConfig } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('config util', () => {
	beforeEach(setUpUtilConfig);
	afterEach(tearDownUtilConfig);
	Given('a default config', given.aDefaultConfig, () => {
		Given(
			'the config directory path is not specified in an environmental variable',
			given.theConfigDirectoryPathIsNotSpecifiedInAnEnvironmentalVariable,
			() => {
				When('getConfig is called', when.getConfigIsCalled, () => {
					Then(
						'the default config should be returned',
						then.theDefaultConfigShouldBeReturned,
					);
				});
			},
		);
		Given(
			`a directory path "${process.env.LISKY_CONFIG_DIR}"`,
			given.aDirectoryPath,
			() => {
				Given('a config file name "config.json"', given.aConfigFileName, () => {
					Given(
						'the directory does not exist',
						given.theDirectoryDoesNotExist,
						() => {
							Given(
								'the directory cannot be created',
								given.theDirectoryCannotBeCreated,
								() => {
									When('getConfig is called', when.getConfigIsCalled, () => {
										Then(
											'the user should be warned that the config will not be persisted',
											then.theUserShouldBeWarnedThatTheConfigWillNotBePersisted,
										);
									});
								},
							);
							Given(
								'the config directory can be created',
								given.theDirectoryCanBeCreated,
								() => {
									When('getConfig is called', when.getConfigIsCalled, () => {
										Then(
											'the default config should be written to the config file',
											then.theDefaultConfigShouldBeWrittenToTheConfigFile,
										);
									});
								},
							);
						},
					);
					Given(
						'the config directory does exist',
						given.theDirectoryDoesExist,
						() => {
							Given(
								'the config file does not exist',
								given.theFileDoesNotExist,
								() => {
									Given(
										'the config file cannot be written',
										given.theFileCannotBeWritten,
										() => {
											When(
												'getConfig is called',
												when.getConfigIsCalled,
												() => {
													Then(
														'the user should be warned that the config will not be persisted',
														then.theUserShouldBeWarnedThatTheConfigWillNotBePersisted,
													);
												},
											);
										},
									);
									Given(
										'the config file can be written',
										given.theFileCanBeWritten,
										() => {
											When(
												'getConfig is called',
												when.getConfigIsCalled,
												() => {
													Then(
														'the default config should be written to the config file',
														then.theDefaultConfigShouldBeWrittenToTheConfigFile,
													);
												},
											);
										},
									);
								},
							);
							Given(
								'the config file does exist',
								given.theFileDoesExist,
								() => {
									Given(
										'there is a config lockfile',
										given.thereIsAConfigLockfile,
										() => {
											When(
												'setConfig is called',
												when.setConfigIsCalled,
												() => {
													Then(
														`the user should be informed that a config lockfile was found at path "${
															process.env.LISKY_CONFIG_DIR
														}/config.lock"`,
														then.theUserShouldBeInformedThatAConfigLockfileWasFoundAtPath,
													);
													Then(
														'the process should exit with error code "1"',
														then.theProcessShouldExitWithErrorCode,
													);
												},
											);
											Given(
												'the config file can be read',
												given.theFileCanBeRead,
												() => {
													Given(
														'the config file is not valid JSON',
														given.theFileIsNotValidJSON,
														() => {
															When(
																'getConfig is called',
																when.getConfigIsCalled,
																() => {
																	Then(
																		'the user should be informed that the config file cannot be read or is not valid JSON',
																		then.theUserShouldBeInformedThatTheConfigFileCannotBeReadOrIsNotValidJSON,
																	);
																	Then(
																		'the process should exit with error code "1"',
																		then.theProcessShouldExitWithErrorCode,
																	);
																	Then(
																		'the config file should not be written',
																		then.theConfigFileShouldNotBeWritten,
																	);
																},
															);
														},
													);
													Given(
														'the config file is valid',
														given.theFileIsValid,
														() => {
															Given(
																'the config file cannot be written',
																given.theFileCannotBeWritten,
																() => {
																	When(
																		'getConfig is called',
																		when.getConfigIsCalled,
																		() => {
																			Then(
																				'the config file should not be written',
																				then.theConfigFileShouldNotBeWritten,
																			);
																			Then(
																				'the user’s config should be returned',
																				then.theUsersConfigShouldBeReturned,
																			);
																		},
																	);
																	When(
																		'setConfig is called',
																		when.setConfigIsCalled,
																		() => {
																			Then(
																				'it should lock the file',
																				then.itShouldLockTheFile,
																			);
																			Then(
																				'it should unlock the file',
																				then.itShouldUnlockTheFile,
																			);
																			Then(
																				'the default config should be written to the config file',
																				then.theDefaultConfigShouldBeWrittenToTheConfigFile,
																			);
																		},
																	);
																},
															);
															Given(
																'the config file can be written',
																given.theFileCanBeWritten,
																() => {
																	When(
																		'getConfig is called',
																		when.getConfigIsCalled,
																		() => {
																			Then(
																				'the config file should not be written',
																				then.theConfigFileShouldNotBeWritten,
																			);
																			Then(
																				'the user’s config should be returned',
																				then.theUsersConfigShouldBeReturned,
																			);
																		},
																	);
																	When(
																		'setConfig is called',
																		when.setConfigIsCalled,
																		() => {
																			Then(
																				'it should lock the file',
																				then.itShouldLockTheFile,
																			);
																			Then(
																				'it should unlock the file',
																				then.itShouldUnlockTheFile,
																			);
																		},
																	);
																},
															);
														},
													);
												},
											);
										},
									);
									Given(
										'there is no config lockfile',
										given.thereIsNoConfigLockfile,
										() => {
											Given(
												'the config file cannot be read',
												given.theFileCannotBeRead,
												() => {
													When(
														'getConfig is called',
														when.getConfigIsCalled,
														() => {
															Then(
																'the user should be informed that the config file cannot be read or is not valid JSON',
																then.theUserShouldBeInformedThatTheConfigFileCannotBeReadOrIsNotValidJSON,
															);
															Then(
																'the process should exit with error code "1"',
																then.theProcessShouldExitWithErrorCode,
															);
															Then(
																'the config file should not be written',
																then.theConfigFileShouldNotBeWritten,
															);
														},
													);
													When(
														'setConfig is called',
														when.setConfigIsCalled,
														() => {
															Then(
																'it should lock the file',
																then.itShouldLockTheFile,
															);
															Then(
																'it should unlock the file',
																then.itShouldUnlockTheFile,
															);
															Then(
																'the default config should be written to the config file',
																then.theDefaultConfigShouldBeWrittenToTheConfigFile,
															);
														},
													);
												},
											);
											Given(
												'the config file can be read',
												given.theFileCanBeRead,
												() => {
													Given(
														'the config file is not valid JSON',
														given.theFileIsNotValidJSON,
														() => {
															When(
																'getConfig is called',
																when.getConfigIsCalled,
																() => {
																	Then(
																		'the user should be informed that the config file cannot be read or is not valid JSON',
																		then.theUserShouldBeInformedThatTheConfigFileCannotBeReadOrIsNotValidJSON,
																	);
																	Then(
																		'the process should exit with error code "1"',
																		then.theProcessShouldExitWithErrorCode,
																	);
																	Then(
																		'the config file should not be written',
																		then.theConfigFileShouldNotBeWritten,
																	);
																},
															);
														},
													);
													Given(
														'the config file is missing required keys',
														given.theFileIsMissingRequiredKeys,
														() => {
															When(
																'getConfig is called',
																when.getConfigIsCalled,
																() => {
																	Then(
																		`the user should be informed that the config file at "${
																			process.env.LISKY_CONFIG_DIR
																		}/config.json" is corrupted`,
																		then.theUserShouldBeInformedThatTheConfigFileIsCorrupted,
																	);
																	Then(
																		'the process should exit with error code "1"',
																		then.theProcessShouldExitWithErrorCode,
																	);
																	Then(
																		'the config file should not be written',
																		then.theConfigFileShouldNotBeWritten,
																	);
																},
															);
														},
													);
													Given(
														'the config file is valid',
														given.theFileIsValid,
														() => {
															When(
																'getConfig is called',
																when.getConfigIsCalled,
																() => {
																	Then(
																		'the config file should not be written',
																		then.theConfigFileShouldNotBeWritten,
																	);
																	Then(
																		'the user’s config should be returned',
																		then.theUsersConfigShouldBeReturned,
																	);
																},
															);
														},
													);
												},
											);
										},
									);
								},
							);
						},
					);
				});
			},
		);
	});
});
