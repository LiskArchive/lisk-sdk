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
import { setUpCommandSet, tearDownCommandSet } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('set command', () => {
	beforeEach(setUpCommandSet);
	afterEach(tearDownCommandSet);
	Given(
		`a directory path "${process.env.LISK_COMMANDER_CONFIG_DIR}"`,
		given.aDirectoryPath,
		() => {
			Given('a config file name "config.json"', given.aConfigFileName, () => {
				Given('an action "set"', given.anAction, () => {
					Given(
						'a config with unknown properties',
						given.aConfigWithUnknownProperties,
						() => {
							Given('a variable "api.nodes"', given.aVariable, () => {
								Given('values "http://localhost"', given.values, () => {
									When(
										'the action is called with the variable and the values',
										when.theActionIsCalledWithTheVariableAndTheValues,
										() => {
											Then(
												`it should reject with validation error and message "Config file could not be written: property 'api.nodes' was not found. It looks like your configuration file is corrupted. Please check the file at ${
													process.env.LISK_COMMANDER_CONFIG_DIR
												}/config.json or remove it (a fresh default configuration file will be created when you run Lisk Commander again)."`,
												then.itShouldRejectWithValidationErrorAndMessage,
											);
										},
									);
								});
							});
						},
					);
					Given('a config', given.aConfig, () => {
						Given('an unknown variable "xxx"', given.anUnknownVariable, () => {
							Given('values "true"', given.values, () => {
								When(
									'the action is called with the variable and the values',
									when.theActionIsCalledWithTheVariableAndTheValues,
									() => {
										Then(
											'it should reject with validation error and message "Unsupported variable name."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
							});
						});
						Given('a variable "json"', given.aVariable, () => {
							Given('an unknown value "xxx"', given.anUnknownValue, () => {
								When(
									'the action is called with the variable and the values',
									when.theActionIsCalledWithTheVariableAndTheValues,
									() => {
										Then(
											'it should reject with validation error and message "Value must be a boolean."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
							});
							Given('values "true"', given.values, () => {
								Given(
									'the config file cannot be written',
									given.theConfigFileCannotBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with file system error and message "Config file could not be written: your changes will not be persisted."',
															then.itShouldRejectWithFileSystemErrorAndMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "json" to boolean true',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
															then.itShouldResolveToAnObjectWithWarning,
														);
														Then(
															'it should resolve to an object with message "Successfully set json to true."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "json" to boolean true',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set json to true."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "json" to boolean true',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set json to true."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given('values "false"', given.values, () => {
								Given(
									'the config file cannot be written',
									given.theConfigFileCannotBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with file system error and message "Config file could not be written: your changes will not be persisted."',
															then.itShouldRejectWithFileSystemErrorAndMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "json" to boolean false',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
															then.itShouldResolveToAnObjectWithWarning,
														);
														Then(
															'it should resolve to an object with message "Successfully set json to false."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "json" to boolean false',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set json to false."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "json" to boolean false',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set json to false."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
						});
						Given('a variable "name"', given.aVariable, () => {
							Given('values "my_custom_lisk_cli"', given.values, () => {
								Given(
									'the config file cannot be written',
									given.theConfigFileCannotBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with file system error and message "Config file could not be written: your changes will not be persisted."',
															then.itShouldRejectWithFileSystemErrorAndMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "name" to the first value',
															then.itShouldUpdateTheConfigVariableToTheFirstValue,
														);
														Then(
															'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
															then.itShouldResolveToAnObjectWithWarning,
														);
														Then(
															'it should resolve to an object with message "Successfully set name to my_custom_lisk_cli."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "name" to the first value',
															then.itShouldUpdateTheConfigVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set name to my_custom_lisk_cli."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "name" to the first value',
															then.itShouldUpdateTheConfigVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set name to my_custom_lisk_cli."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
						});
						Given('a variable "pretty"', given.aVariable, () => {
							Given('an unknown value "xxx"', given.anUnknownValue, () => {
								When(
									'the action is called with the variable and the values',
									when.theActionIsCalledWithTheVariableAndTheValues,
									() => {
										Then(
											'it should reject with validation error and message "Value must be a boolean."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
							});
							Given('values "true"', given.values, () => {
								Given(
									'the config file cannot be written',
									given.theConfigFileCannotBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with file system error and message "Config file could not be written: your changes will not be persisted."',
															then.itShouldRejectWithFileSystemErrorAndMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "pretty" to boolean true',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
															then.itShouldResolveToAnObjectWithWarning,
														);
														Then(
															'it should resolve to an object with message "Successfully set pretty to true."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "pretty" to boolean true',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set pretty to true."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "pretty" to boolean true',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set pretty to true."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given('values "false"', given.values, () => {
								Given(
									'the config file cannot be written',
									given.theConfigFileCannotBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with file system error and message "Config file could not be written: your changes will not be persisted."',
															then.itShouldRejectWithFileSystemErrorAndMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "pretty" to boolean false',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
															then.itShouldResolveToAnObjectWithWarning,
														);
														Then(
															'it should resolve to an object with message "Successfully set pretty to false."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "pretty" to boolean false',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set pretty to false."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config variable "pretty" to boolean false',
															then.itShouldUpdateTheConfigVariableToBoolean,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set pretty to false."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
						});
						Given('a variable "api.nodes"', given.aVariable, () => {
							Given('values "localhost"', given.values, () => {
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with validation error and message "Node URLs must include a supported protocol (http, https) and a hostname. E.g. https://127.0.0.1:4000 or http://localhost."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with validation error and message "Node URLs must include a supported protocol (http, https) and a hostname. E.g. https://127.0.0.1:4000 or http://localhost."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given('values "localhost:4000"', given.values, () => {
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with validation error and message "Node URLs must include a supported protocol (http, https) and a hostname. E.g. https://127.0.0.1:4000 or http://localhost."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should reject with validation error and message "Node URLs must include a supported protocol (http, https) and a hostname. E.g. https://127.0.0.1:4000 or http://localhost."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given(
								'values "http://localhost:4000" and "http://127.0.0.1"',
								given.values,
								() => {
									Given(
										'the config file can be written',
										given.theConfigFileCanBeWritten,
										() => {
											Given(
												'Vorpal is in non-interactive mode',
												given.vorpalIsInNonInteractiveMode,
												() => {
													When(
														'the action is called with the variable and the values',
														when.theActionIsCalledWithTheVariableAndTheValues,
														() => {
															Then(
																'it should update the config nested variable "api.nodes" to the values',
																then.itShouldUpdateTheConfigNestedVariableToTheValues,
															);
															Then(
																'it should call setConfig with the updated config',
																then.itShouldCallSetConfigWithTheUpdatedConfig,
															);
															Then(
																'it should resolve to an object with message "Successfully set api.nodes to http://localhost:4000,http://127.0.0.1."',
																then.itShouldResolveToAnObjectWithMessage,
															);
														},
													);
												},
											);
											Given(
												'Vorpal is in interactive mode',
												given.vorpalIsInInteractiveMode,
												() => {
													When(
														'the action is called with the variable and the values',
														when.theActionIsCalledWithTheVariableAndTheValues,
														() => {
															Then(
																'it should update the config nested variable "api.nodes" to the values',
																then.itShouldUpdateTheConfigNestedVariableToTheValues,
															);
															Then(
																'it should call setConfig with the updated config',
																then.itShouldCallSetConfigWithTheUpdatedConfig,
															);
															Then(
																'it should resolve to an object with message "Successfully set api.nodes to http://localhost:4000,http://127.0.0.1."',
																then.itShouldResolveToAnObjectWithMessage,
															);
														},
													);
												},
											);
										},
									);
								},
							);
							Given('values "http://localhost:4000"', given.values, () => {
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.nodes" to the values',
															then.itShouldUpdateTheConfigNestedVariableToTheValues,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.nodes to http://localhost:4000."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.nodes" to the values',
															then.itShouldUpdateTheConfigNestedVariableToTheValues,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.nodes to http://localhost:4000."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given('values ""', given.values, () => {
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.nodes" to the values',
															then.itShouldUpdateTheConfigNestedVariableToTheValues,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully reset api.nodes."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.nodes" to the values',
															then.itShouldUpdateTheConfigNestedVariableToTheValues,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully reset api.nodes."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given(
								'the config file can be written',
								given.theConfigFileCanBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the values',
												when.theActionIsCalledWithTheVariableAndTheValues,
												() => {
													Then(
														'it should update the config nested variable "api.nodes" to empty array',
														then.itShouldUpdateTheConfigNestedVariableToEmptyArray,
													);
													Then(
														'it should call setConfig with the updated config',
														then.itShouldCallSetConfigWithTheUpdatedConfig,
													);
													Then(
														'it should resolve to an object with message "Successfully reset api.nodes."',
														then.itShouldResolveToAnObjectWithMessage,
													);
												},
											);
										},
									);
									Given(
										'Vorpal is in interactive mode',
										given.vorpalIsInInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the values',
												when.theActionIsCalledWithTheVariableAndTheValues,
												() => {
													Then(
														'it should update the config nested variable "api.nodes" to empty array',
														then.itShouldUpdateTheConfigNestedVariableToEmptyArray,
													);
													Then(
														'it should call setConfig with the updated config',
														then.itShouldCallSetConfigWithTheUpdatedConfig,
													);
													Then(
														'it should resolve to an object with message "Successfully reset api.nodes."',
														then.itShouldResolveToAnObjectWithMessage,
													);
												},
											);
										},
									);
								},
							);
						});
						Given('a variable "api.network"', given.aVariable, () => {
							Given('an unknown value "xxx"', given.anUnknownValue, () => {
								When(
									'the action is called with the variable and the values',
									when.theActionIsCalledWithTheVariableAndTheValues,
									() => {
										Then(
											'it should reject with validation error and message "Value must be a hex string with 64 characters, or one of main, test or beta."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
							});
							Given(
								'values "ed14889723f24ecc54871d058d98ce91ff2f97"',
								given.values,
								() => {
									When(
										'the action is called with the variable and the values',
										when.theActionIsCalledWithTheVariableAndTheValues,
										() => {
											Then(
												'it should reject with validation error and message "Value must be a hex string with 64 characters, or one of main, test or beta."',
												then.itShouldRejectWithValidationErrorAndMessage,
											);
										},
									);
								},
							);
							Given(
								'values "ed14889723f24ecc54871d058xxxxxxxxxxxxxxxxxxxxxxxxxba2b7b70ad2500"',
								given.values,
								() => {
									When(
										'the action is called with the variable and the values',
										when.theActionIsCalledWithTheVariableAndTheValues,
										() => {
											Then(
												'it should reject with validation error and message "Value must be a hex string with 64 characters, or one of main, test or beta."',
												then.itShouldRejectWithValidationErrorAndMessage,
											);
										},
									);
								},
							);
							Given('values "main"', given.values, () => {
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.network" to the first value',
															then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.network to main."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.network" to the first value',
															then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.network to main."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given('values "test"', given.values, () => {
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.network" to the first value',
															then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.network to test."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.network" to the first value',
															then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.network to test."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given('values "beta"', given.values, () => {
								Given(
									'the config file can be written',
									given.theConfigFileCanBeWritten,
									() => {
										Given(
											'Vorpal is in non-interactive mode',
											given.vorpalIsInNonInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.network" to the first value',
															then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.network to beta."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
										Given(
											'Vorpal is in interactive mode',
											given.vorpalIsInInteractiveMode,
											() => {
												When(
													'the action is called with the variable and the values',
													when.theActionIsCalledWithTheVariableAndTheValues,
													() => {
														Then(
															'it should update the config nested variable "api.network" to the first value',
															then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
														);
														Then(
															'it should call setConfig with the updated config',
															then.itShouldCallSetConfigWithTheUpdatedConfig,
														);
														Then(
															'it should resolve to an object with message "Successfully set api.network to beta."',
															then.itShouldResolveToAnObjectWithMessage,
														);
													},
												);
											},
										);
									},
								);
							});
							Given(
								'values "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
								given.values,
								() => {
									Given(
										'the config file cannot be written',
										given.theConfigFileCannotBeWritten,
										() => {
											Given(
												'Vorpal is in non-interactive mode',
												given.vorpalIsInNonInteractiveMode,
												() => {
													When(
														'the action is called with the variable and the values',
														when.theActionIsCalledWithTheVariableAndTheValues,
														() => {
															Then(
																'it should reject with file system error and message "Config file could not be written: your changes will not be persisted."',
																then.itShouldRejectWithFileSystemErrorAndMessage,
															);
														},
													);
												},
											);
											Given(
												'Vorpal is in interactive mode',
												given.vorpalIsInInteractiveMode,
												() => {
													When(
														'the action is called with the variable and the values',
														when.theActionIsCalledWithTheVariableAndTheValues,
														() => {
															Then(
																'it should update the config nested variable "api.network" to the first value',
																then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
															);
															Then(
																'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
																then.itShouldResolveToAnObjectWithWarning,
															);
															Then(
																'it should resolve to an object with message "Successfully set api.network to aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa."',
																then.itShouldResolveToAnObjectWithMessage,
															);
														},
													);
												},
											);
										},
									);
									Given(
										'the config file can be written',
										given.theConfigFileCanBeWritten,
										() => {
											Given(
												'Vorpal is in non-interactive mode',
												given.vorpalIsInNonInteractiveMode,
												() => {
													When(
														'the action is called with the variable and the values',
														when.theActionIsCalledWithTheVariableAndTheValues,
														() => {
															Then(
																'it should update the config nested variable "api.network" to the first value',
																then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
															);
															Then(
																'it should call setConfig with the updated config',
																then.itShouldCallSetConfigWithTheUpdatedConfig,
															);
															Then(
																'it should resolve to an object with message "Successfully set api.network to aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa."',
																then.itShouldResolveToAnObjectWithMessage,
															);
														},
													);
												},
											);
											Given(
												'Vorpal is in interactive mode',
												given.vorpalIsInInteractiveMode,
												() => {
													When(
														'the action is called with the variable and the values',
														when.theActionIsCalledWithTheVariableAndTheValues,
														() => {
															Then(
																'it should update the config nested variable "api.network" to the first value',
																then.itShouldUpdateTheConfigNestedVariableToTheFirstValue,
															);
															Then(
																'it should call setConfig with the updated config',
																then.itShouldCallSetConfigWithTheUpdatedConfig,
															);
															Then(
																'it should resolve to an object with message "Successfully set api.network to aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa."',
																then.itShouldResolveToAnObjectWithMessage,
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
					});
				});
			});
		},
	);
});
