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
import { setUpCommandSet, tearDownCommandSet } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('set command', () => {
	beforeEach(setUpCommandSet);
	afterEach(tearDownCommandSet);
	Given('a config', given.aConfig, () => {
		describe(`Given a directory path "${process.env.LISKY_CONFIG_DIR}"`, () => {
			beforeEach(given.aDirectoryPath);
			Given('a config file name "config.json"', given.aConfigFileName, () => {
				Given('an action "set"', given.anAction, () => {
					Given('an unknown variable "xxx"', given.anUnknownVariable, () => {
						Given('a value "true"', given.aValue, () => {
							When(
								'the action is called with the variable and the value',
								when.theActionIsCalledWithTheVariableAndTheValue,
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
								'the action is called with the variable and the value',
								when.theActionIsCalledWithTheVariableAndTheValue,
								() => {
									Then(
										'it should reject with validation error and message "Value must be a boolean."',
										then.itShouldRejectWithValidationErrorAndMessage,
									);
								},
							);
						});
						Given('a value "true"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "json" to boolean true',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "json" to boolean true',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
						Given('a value "false"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "json" to boolean false',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "json" to boolean false',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
						Given('a value "my_custom_lisky"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "name" to the value',
														then.itShouldUpdateTheConfigVariableToTheValue,
													);
													Then(
														'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
														then.itShouldResolveToAnObjectWithWarning,
													);
													Then(
														'it should resolve to an object with message "Successfully set name to my_custom_lisky."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "name" to the value',
														then.itShouldUpdateTheConfigVariableToTheValue,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set name to my_custom_lisky."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "name" to the value',
														then.itShouldUpdateTheConfigVariableToTheValue,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set name to my_custom_lisky."',
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
								'the action is called with the variable and the value',
								when.theActionIsCalledWithTheVariableAndTheValue,
								() => {
									Then(
										'it should reject with validation error and message "Value must be a boolean."',
										then.itShouldRejectWithValidationErrorAndMessage,
									);
								},
							);
						});
						Given('a value "true"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "pretty" to boolean true',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "pretty" to boolean true',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
						Given('a value "false"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "pretty" to boolean false',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config variable "pretty" to boolean false',
														then.itShouldUpdateTheConfigVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
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
					Given('a variable "liskJS.testnet"', given.aVariable, () => {
						Given('an unknown value "xxx"', given.anUnknownValue, () => {
							When(
								'the action is called with the variable and the value',
								when.theActionIsCalledWithTheVariableAndTheValue,
								() => {
									Then(
										'it should reject with validation error and message "Value must be a boolean."',
										then.itShouldRejectWithValidationErrorAndMessage,
									);
								},
							);
						});
						Given('a value "true"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.testnet" to boolean true',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
														then.itShouldResolveToAnObjectWithWarning,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.testnet to true."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.testnet" to boolean true',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.testnet to true."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.testnet" to boolean true',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.testnet to true."',
														then.itShouldResolveToAnObjectWithMessage,
													);
												},
											);
										},
									);
								},
							);
						});
						Given('a value "false"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.testnet" to boolean false',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
														then.itShouldResolveToAnObjectWithWarning,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.testnet to false."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.testnet" to boolean false',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.testnet to false."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.testnet" to boolean false',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.testnet to false."',
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

					Given('a variable "liskJS.ssl"', given.aVariable, () => {
						Given('an unknown value "xxx"', given.anUnknownValue, () => {
							When(
								'the action is called with the variable and the value',
								when.theActionIsCalledWithTheVariableAndTheValue,
								() => {
									Then(
										'it should reject with validation error and message "Value must be a boolean."',
										then.itShouldRejectWithValidationErrorAndMessage,
									);
								},
							);
						});
						Given('a value "true"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.ssl" to boolean true',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
														then.itShouldResolveToAnObjectWithWarning,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.ssl to true."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.ssl" to boolean true',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.ssl to true."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.ssl" to boolean true',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.ssl to true."',
														then.itShouldResolveToAnObjectWithMessage,
													);
												},
											);
										},
									);
								},
							);
						});
						Given('a value "false"', given.aValue, () => {
							Given(
								'the config file cannot be written',
								given.theConfigFileCannotBeWritten,
								() => {
									Given(
										'Vorpal is in non-interactive mode',
										given.vorpalIsInNonInteractiveMode,
										() => {
											When(
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.ssl" to boolean false',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."',
														then.itShouldResolveToAnObjectWithWarning,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.ssl to false."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.ssl" to boolean false',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.ssl to false."',
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
												'the action is called with the variable and the value',
												when.theActionIsCalledWithTheVariableAndTheValue,
												() => {
													Then(
														'it should update the config nested variable "liskJS.ssl" to boolean false',
														then.itShouldUpdateTheConfigNestedVariableToBoolean,
													);
													Then(
														'it should write the updated config to the config file',
														then.itShouldWriteTheUpdatedConfigToTheConfigFile,
													);
													Then(
														'it should resolve to an object with message "Successfully set liskJS.ssl to false."',
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
				});
			});
		});
	});
});
