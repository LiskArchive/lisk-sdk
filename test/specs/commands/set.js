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
import { setUpCommandSet, tearDownCommandSet } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('set command', () => {
	beforeEach(setUpCommandSet);
	afterEach(tearDownCommandSet);
	describe('Given a config', () => {
		beforeEach(given.aConfig);
		describe(`Given a directory path "${os.homedir()}/.lisky"`, () => {
			beforeEach(given.aDirectoryPath);
			describe('Given a config file name "config.json"', () => {
				beforeEach(given.aConfigFileName);
				describe('Given an action "set"', () => {
					beforeEach(given.anAction);
					describe('Given an unknown variable "xxx"', () => {
						beforeEach(given.anUnknownVariable);
						describe('Given a value "true"', () => {
							beforeEach(given.aValue);
							describe('When the action is called with the variable and the value', () => {
								beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
								it('Then it should reject with message "Unsupported variable name."', then.itShouldRejectWithMessage);
							});
						});
					});
					describe('Given a variable "json"', () => {
						beforeEach(given.aVariable);
						describe('Given an unknown value "xxx"', () => {
							beforeEach(given.anUnknownValue);
							describe('When the action is called with the variable and the value', () => {
								beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
								it('Then it should reject with message "Value must be a boolean."', then.itShouldRejectWithMessage);
							});
						});
						describe('Given a value "true"', () => {
							beforeEach(given.aValue);
							describe('Given the config file cannot be written', () => {
								beforeEach(given.theConfigFileCannotBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should reject with message "Config file could not be written: your changes will not be persisted."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "json" to boolean true', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."', then.itShouldResolveToAnObjectWithWarning);
										it('Then it should resolve to an object with message "Successfully set json to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
							describe('Given the config file can be written', () => {
								beforeEach(given.theConfigFileCanBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "json" to boolean true', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set json to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "json" to boolean true', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set json to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
						});
						describe('Given a value "false"', () => {
							beforeEach(given.aValue);
							describe('Given the config file cannot be written', () => {
								beforeEach(given.theConfigFileCannotBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should reject with message "Config file could not be written: your changes will not be persisted."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "json" to boolean false', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."', then.itShouldResolveToAnObjectWithWarning);
										it('Then it should resolve to an object with message "Successfully set json to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
							describe('Given the config file can be written', () => {
								beforeEach(given.theConfigFileCanBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "json" to boolean false', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set json to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "json" to boolean false', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set json to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
						});
					});
					describe('Given a variable "name"', () => {
						beforeEach(given.aVariable);
						describe('Given a value "my_custom_lisky"', () => {
							beforeEach(given.aValue);
							describe('Given the config file cannot be written', () => {
								beforeEach(given.theConfigFileCannotBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should reject with message "Config file could not be written: your changes will not be persisted."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "name" to the value', then.itShouldUpdateTheConfigVariableToTheValue);
										it('Then it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."', then.itShouldResolveToAnObjectWithWarning);
										it('Then it should resolve to an object with message "Successfully set name to my_custom_lisky."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
							describe('Given the config file can be written', () => {
								beforeEach(given.theConfigFileCanBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "name" to the value', then.itShouldUpdateTheConfigVariableToTheValue);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set name to my_custom_lisky."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "name" to the value', then.itShouldUpdateTheConfigVariableToTheValue);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set name to my_custom_lisky."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
						});
					});
					describe('Given a variable "pretty"', () => {
						beforeEach(given.aVariable);
						describe('Given an unknown value "xxx"', () => {
							beforeEach(given.anUnknownValue);
							describe('When the action is called with the variable and the value', () => {
								beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
								it('Then it should reject with message "Value must be a boolean."', then.itShouldRejectWithMessage);
							});
						});
						describe('Given a value "true"', () => {
							beforeEach(given.aValue);
							describe('Given the config file cannot be written', () => {
								beforeEach(given.theConfigFileCannotBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should reject with message "Config file could not be written: your changes will not be persisted."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "pretty" to boolean true', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."', then.itShouldResolveToAnObjectWithWarning);
										it('Then it should resolve to an object with message "Successfully set pretty to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
							describe('Given the config file can be written', () => {
								beforeEach(given.theConfigFileCanBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "pretty" to boolean true', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set pretty to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "pretty" to boolean true', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set pretty to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
						});
						describe('Given a value "false"', () => {
							beforeEach(given.aValue);
							describe('Given the config file cannot be written', () => {
								beforeEach(given.theConfigFileCannotBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should reject with message "Config file could not be written: your changes will not be persisted."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "pretty" to boolean false', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."', then.itShouldResolveToAnObjectWithWarning);
										it('Then it should resolve to an object with message "Successfully set pretty to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
							describe('Given the config file can be written', () => {
								beforeEach(given.theConfigFileCanBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "pretty" to boolean false', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set pretty to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config variable "pretty" to boolean false', then.itShouldUpdateTheConfigVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set pretty to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
						});
					});
					describe('Given a variable "testnet"', () => {
						beforeEach(given.aVariable);
						describe('Given an unknown value "xxx"', () => {
							beforeEach(given.anUnknownValue);
							describe('When the action is called with the variable and the value', () => {
								beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
								it('Then it should reject with message "Value must be a boolean."', then.itShouldRejectWithMessage);
							});
						});
						describe('Given a value "true"', () => {
							beforeEach(given.aValue);
							describe('Given the config file cannot be written', () => {
								beforeEach(given.theConfigFileCannotBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should reject with message "Config file could not be written: your changes will not be persisted."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config nested variable "liskJS.testnet" to boolean true', then.itShouldUpdateTheConfigNestedVariableToBoolean);
										it('Then it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."', then.itShouldResolveToAnObjectWithWarning);
										it('Then it should resolve to an object with message "Successfully set testnet to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
							describe('Given the config file can be written', () => {
								beforeEach(given.theConfigFileCanBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config nested variable "liskJS.testnet" to boolean true', then.itShouldUpdateTheConfigNestedVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set testnet to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config nested variable "liskJS.testnet" to boolean true', then.itShouldUpdateTheConfigNestedVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set testnet to true."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
						});
						describe('Given a value "false"', () => {
							beforeEach(given.aValue);
							describe('Given the config file cannot be written', () => {
								beforeEach(given.theConfigFileCannotBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should reject with message "Config file could not be written: your changes will not be persisted."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config nested variable "liskJS.testnet" to boolean false', then.itShouldUpdateTheConfigNestedVariableToBoolean);
										it('Then it should resolve to an object with warning "Config file could not be written: your changes will not be persisted."', then.itShouldResolveToAnObjectWithWarning);
										it('Then it should resolve to an object with message "Successfully set testnet to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
							});
							describe('Given the config file can be written', () => {
								beforeEach(given.theConfigFileCanBeWritten);
								describe('Given Vorpal is in non-interactive mode', () => {
									beforeEach(given.vorpalIsInNonInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config nested variable "liskJS.testnet" to boolean false', then.itShouldUpdateTheConfigNestedVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set testnet to false."', then.itShouldResolveToAnObjectWithMessage);
									});
								});
								describe('Given Vorpal is in interactive mode', () => {
									beforeEach(given.vorpalIsInInteractiveMode);
									describe('When the action is called with the variable and the value', () => {
										beforeEach(when.theActionIsCalledWithTheVariableAndTheValue);
										it('Then it should update the config nested variable "liskJS.testnet" to boolean false', then.itShouldUpdateTheConfigNestedVariableToBoolean);
										it('Then it should write the updated config to the config file', then.itShouldWriteTheUpdatedConfigToTheConfigFile);
										it('Then it should resolve to an object with message "Successfully set testnet to false."', then.itShouldResolveToAnObjectWithMessage);
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
