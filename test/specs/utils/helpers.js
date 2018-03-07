/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
import {
	setUpUtilCreateCommand,
	setUpUtilWrapActionCreator,
	setUpUtilHelpersJSONOutput,
	setUpUtilHelpersPrettyOutput,
} from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('utils helpers', () => {
	describe('#validatePublicKeys', () => {
		Given(
			'invalid public keys "+647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6"',
			given.invalidPublicKeys,
			() => {
				When(
					'validatePublicKeys is called with the public keys',
					when.validatePublicKeysIsCalledWithThePublicKeys,
					() => {
						Then(
							'it should throw validation error "Error processing public key +647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6: Invalid hex string."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
		Given(
			'invalid public keys "12345678123456781234567812345678123456781234567812345678123456gg"',
			given.invalidPublicKeys,
			() => {
				When(
					'validatePublicKeys is called with the public keys',
					when.validatePublicKeysIsCalledWithThePublicKeys,
					() => {
						Then(
							'it should throw validation error "Public key 12345678123456781234567812345678123456781234567812345678123456gg bytes length differs from the expected 32 bytes for a public key."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
		Given(
			'invalid public keys "647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9e"',
			given.invalidPublicKeys,
			() => {
				When(
					'validatePublicKeysAndPrependPlus is called with the public keys',
					when.validatePublicKeysIsCalledWithThePublicKeys,
					() => {
						Then(
							'it should throw validation error "Public key 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9e length differs from the expected 64 hex characters for a public key."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
		Given(
			'public keys "647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6" and "96d78cb7d246dd3b426182763e464301835787e1fe8342532660eba75b6b97fc"',
			given.publicKeys,
			() => {
				When(
					'validatePublicKeysAndPrependPlus is called with the public keys',
					when.validatePublicKeysIsCalledWithThePublicKeys,
					() => {
						Then(
							'it should return the public keys',
							then.itShouldReturnThePublicKeys,
						);
					},
				);
			},
		);
	});
	describe('#validateLifetime', () => {
		Given(
			'a string lifetime of "1234567890" hours',
			given.aStringLifetimeOfHours,
			() => {
				When(
					'validateLifetime is called on the lifetime',
					when.validateLifetimeIsCalledOnTheLifetime,
					() => {
						Then('it should return true', then.itShouldReturnTrue);
					},
				);
			},
		);
		Given(
			'an invalid string lifetime of "123.4" hours',
			given.anInvalidStringLifetimeOfHours,
			() => {
				When(
					'validateLifetime is called on the lifetime',
					when.validateLifetimeIsCalledOnTheLifetime,
					() => {
						Then(
							'it should throw validation error "Lifetime must be an integer."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
		Given(
			'an invalid string lifetime of "NaN" hours',
			given.anInvalidStringLifetimeOfHours,
			() => {
				When(
					'validateLifetime is called on the lifetime',
					when.validateLifetimeIsCalledOnTheLifetime,
					() => {
						Then(
							'it should throw validation error "Lifetime must be an integer."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
	});
	describe('#validateMinimum', () => {
		Given(
			'a string minimum of "1234567890" signatures',
			given.aStringMinimumOfSignatures,
			() => {
				When(
					'validateMinimum is called on the minimum',
					when.validateMinimumIsCalledOnTheMinimum,
					() => {
						Then('it should return true', then.itShouldReturnTrue);
					},
				);
			},
		);
		Given(
			'an invalid string minimum of "123.4" signatures',
			given.anInvalidStringMinimumOfSignatures,
			() => {
				When(
					'validateMinimum is called on the minimum',
					when.validateMinimumIsCalledOnTheMinimum,
					() => {
						Then(
							'it should throw validation error "Minimum number of signatures must be an integer."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
		Given(
			'an invalid string minimum of "NaN" signatures',
			given.anInvalidStringMinimumOfSignatures,
			() => {
				When(
					'validateMinimum is called on the minimum',
					when.validateMinimumIsCalledOnTheMinimum,
					() => {
						Then(
							'it should throw validation error "Minimum number of signatures must be an integer."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
	});
	describe('#validateAddress', () => {
		Given('an address "13356260975429434553L"', given.anAddress, () => {
			When(
				'validateAddress is called on the address',
				when.validateAddressIsCalledOnTheAddress,
				() => {
					Then('it should return true', then.itShouldReturnTrue);
				},
			);
		});
		Given('an invalid address "1234567890LL"', given.anInvalidAddress, () => {
			When(
				'validateAddress is called on the address',
				when.validateAddressIsCalledOnTheAddress,
				() => {
					Then(
						'it should throw validation error "1234567890LL is not a valid address."',
						then.itShouldThrowValidationError,
					);
				},
			);
		});
		Given('an invalid address "L"', given.anInvalidAddress, () => {
			When(
				'validateAddress is called on the address',
				when.validateAddressIsCalledOnTheAddress,
				() => {
					Then(
						'it should throw validation error "L is not a valid address."',
						then.itShouldThrowValidationError,
					);
				},
			);
		});
		Given(
			'an invalid address "0123456789101112131415L"',
			given.anInvalidAddress,
			() => {
				When(
					'validateAddress is called on the address',
					when.validateAddressIsCalledOnTheAddress,
					() => {
						Then(
							'it should throw validation error "0123456789101112131415L is not a valid address."',
							then.itShouldThrowValidationError,
						);
					},
				);
			},
		);
	});
	describe('#validateAmount', () => {
		Given('an amount "100.123"', given.anAmount, () => {
			When(
				'validateAmount is called on the amount',
				when.validateAmountIsCalledOnTheAmount,
				() => {
					Then('it should return true', then.itShouldReturnTrue);
				},
			);
		});
		Given('an invalid amount "abcedf"', given.anInvalidAmount, () => {
			When(
				'validateAmount is called on the amount',
				when.validateAmountIsCalledOnTheAmount,
				() => {
					Then(
						'it should throw validation error "Amount must be a number with no more than 8 decimal places."',
						then.itShouldThrowValidationError,
					);
				},
			);
		});
		Given('an invalid amount "10.0001000001"', given.anInvalidAmount, () => {
			When(
				'validateAmount is called on the amount',
				when.validateAmountIsCalledOnTheAmount,
				() => {
					Then(
						'it should throw validation error "Amount must be a number with no more than 8 decimal places."',
						then.itShouldThrowValidationError,
					);
				},
			);
		});
	});
	describe('#normalizeAmount', () => {
		Given(
			'an amount "120" with normalized amount "12000000000"',
			given.anAmountWithNormalizedAmount,
			() => {
				When(
					'normalizeAmount is called on the amount',
					when.normalizeAmountIsCalledOnTheAmount,
					() => {
						Then(
							'it should return the normalized amount',
							then.itShouldReturnTheNormalizedAmount,
						);
					},
				);
			},
		);
		Given(
			'an amount "123.456" with normalized amount "12345600000"',
			given.anAmountWithNormalizedAmount,
			() => {
				When(
					'normalizeAmount is called on the amount',
					when.normalizeAmountIsCalledOnTheAmount,
					() => {
						Then(
							'it should return the normalized amount',
							then.itShouldReturnTheNormalizedAmount,
						);
					},
				);
			},
		);
		Given(
			'an amount "0" with normalized amount "0"',
			given.anAmountWithNormalizedAmount,
			() => {
				When(
					'normalizeAmount is called on the amount',
					when.normalizeAmountIsCalledOnTheAmount,
					() => {
						Then(
							'it should return the normalized amount',
							then.itShouldReturnTheNormalizedAmount,
						);
					},
				);
			},
		);
		Given(
			'an amount "0.00000123" with normalized amount "123"',
			given.anAmountWithNormalizedAmount,
			() => {
				When(
					'normalizeAmount is called on the amount',
					when.normalizeAmountIsCalledOnTheAmount,
					() => {
						Then(
							'it should return the normalized amount',
							then.itShouldReturnTheNormalizedAmount,
						);
					},
				);
			},
		);
		Given('an invalid amount "0.123456789"', given.anInvalidAmount, () => {
			When(
				'normalizeAmount is called on the amount',
				when.normalizeAmountIsCalledOnTheAmount,
				() => {
					Then(
						'it should throw validation error "Amount must be a number with no more than 8 decimal places."',
						then.itShouldThrowValidationError,
					);
				},
			);
		});
	});
	describe('#deAlias', () => {
		Given(
			'a type "addresses" with alias "accounts"',
			given.aTypeWithAlias,
			() => {
				When(
					'deAlias is called on the type',
					when.deAliasIsCalledOnTheType,
					() => {
						Then('it should return the alias', then.itShouldReturnTheAlias);
					},
				);
			},
		);
		Given('a type "block" with no alias', given.aTypeWithNoAlias, () => {
			When(
				'deAlias is called on the type',
				when.deAliasIsCalledOnTheType,
				() => {
					Then('it should return the type', then.itShouldReturnTheType);
				},
			);
		});
	});
	describe('#prepareOptions', () => {
		Given('an empty options object', given.anEmptyOptionsObject, () => {
			When(
				'prepareOptions is called with the options',
				when.prepareOptionsIsCalledWithTheOptions,
				() => {
					Then(
						'it should resolve to the options',
						then.itShouldResolveToTheOptions,
					);
				},
			);
		});
		Given(
			'an options object with json set to true and table set to true',
			given.anOptionsObjectWithJsonSetToAndTableSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should reject with validation error and message "Cannot output both JSON and table."',
							then.itShouldRejectWithValidationErrorAndMessage,
						);
						Then(
							'it should delete the json option',
							then.itShouldDeleteTheJsonOption,
						);
						Then(
							'it should delete the table option',
							then.itShouldDeleteTheTableOption,
						);
					},
				);
			},
		);
		Given(
			'an options object with json set to false and table set to false',
			given.anOptionsObjectWithJsonSetToAndTableSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should reject with validation error and message "Must output either JSON or table."',
							then.itShouldRejectWithValidationErrorAndMessage,
						);
						Then(
							'it should delete the json option',
							then.itShouldDeleteTheJsonOption,
						);
						Then(
							'it should delete the table option',
							then.itShouldDeleteTheTableOption,
						);
					},
				);
			},
		);
		Given(
			'an options object with json set to true',
			given.anOptionsObjectWithJsonSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should resolve to the options',
							then.itShouldResolveToTheOptions,
						);
						Then(
							'it should not delete the json option',
							then.itShouldNotDeleteTheJsonOption,
						);
					},
				);
			},
		);
		Given(
			'an options object with json set to false',
			given.anOptionsObjectWithJsonSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should resolve to the options',
							then.itShouldResolveToTheOptions,
						);
						Then(
							'it should not delete the json option',
							then.itShouldNotDeleteTheJsonOption,
						);
					},
				);
			},
		);
		Given(
			'an options object with table set to true',
			given.anOptionsObjectWithTableSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should resolve to the options',
							then.itShouldResolveToTheOptions,
						);
						Then(
							'it should not delete the table option',
							then.itShouldNotDeleteTheTableOption,
						);
					},
				);
			},
		);
		Given(
			'an options object with table set to false',
			given.anOptionsObjectWithTableSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should resolve to the options',
							then.itShouldResolveToTheOptions,
						);
						Then(
							'it should not delete the table option',
							then.itShouldNotDeleteTheTableOption,
						);
					},
				);
			},
		);
		Given(
			'an options object with json set to true and table set to false',
			given.anOptionsObjectWithJsonSetToAndTableSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should resolve to the options',
							then.itShouldResolveToTheOptions,
						);
						Then(
							'it should not delete the json option',
							then.itShouldNotDeleteTheJsonOption,
						);
						Then(
							'it should not delete the table option',
							then.itShouldNotDeleteTheTableOption,
						);
					},
				);
			},
		);
		Given(
			'an options object with json set to false and table set to true',
			given.anOptionsObjectWithJsonSetToAndTableSetTo,
			() => {
				When(
					'prepareOptions is called with the options',
					when.prepareOptionsIsCalledWithTheOptions,
					() => {
						Then(
							'it should resolve to the options',
							then.itShouldResolveToTheOptions,
						);
						Then(
							'it should not delete the json option',
							then.itShouldNotDeleteTheJsonOption,
						);
						Then(
							'it should not delete the table option',
							then.itShouldNotDeleteTheTableOption,
						);
					},
				);
			},
		);
	});
	describe('#shouldUseJSONOutput', () => {
		beforeEach(setUpUtilHelpersJSONOutput);
		When(
			'shouldUseJSONOutput is called with the config and the options',
			when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
			() => {
				Then('it should return false', then.itShouldReturnFalse);
			},
		);
		Given('a config with json set to true', given.aConfigWithJsonSetTo, () => {
			Given(
				'an options object with json set to true',
				given.anOptionsObjectWithJsonSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return true', then.itShouldReturnTrue);
						},
					);
				},
			);
			Given(
				'an options object with json set to false',
				given.anOptionsObjectWithJsonSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return false', then.itShouldReturnFalse);
						},
					);
				},
			);
			Given(
				'an options object with table set to true',
				given.anOptionsObjectWithTableSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return false', then.itShouldReturnFalse);
						},
					);
				},
			);
			Given(
				'an options object with table set to false',
				given.anOptionsObjectWithTableSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return true', then.itShouldReturnTrue);
						},
					);
				},
			);
			Given('an empty options object', given.anEmptyOptionsObject, () => {
				When(
					'shouldUseJSONOutput is called with the config and options',
					when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
					() => {
						Then('it should return true', then.itShouldReturnTrue);
					},
				);
			});
		});
		Given('a config with json set to false', given.aConfigWithJsonSetTo, () => {
			Given(
				'an options object with json set to true',
				given.anOptionsObjectWithJsonSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return true', then.itShouldReturnTrue);
						},
					);
				},
			);
			Given(
				'an options object with json set to false',
				given.anOptionsObjectWithJsonSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return false', then.itShouldReturnFalse);
						},
					);
				},
			);
			Given(
				'an options object with table set to true',
				given.anOptionsObjectWithTableSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return false', then.itShouldReturnFalse);
						},
					);
				},
			);
			Given(
				'an options object with table set to false',
				given.anOptionsObjectWithTableSetTo,
				() => {
					When(
						'shouldUseJSONOutput is called with the config and options',
						when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return true', then.itShouldReturnTrue);
						},
					);
				},
			);
			Given('an empty options object', given.anEmptyOptionsObject, () => {
				When(
					'shouldUseJSONOutput is called with the config and options',
					when.shouldUseJSONOutputIsCalledWithTheConfigAndOptions,
					() => {
						Then('it should return false', then.itShouldReturnFalse);
					},
				);
			});
		});
	});
	describe('#shouldUsePrettyOutput', () => {
		beforeEach(setUpUtilHelpersPrettyOutput);
		Given(
			'a config with pretty set to true',
			given.aConfigWithPrettySetTo,
			() => {
				Given(
					'an options object with pretty set to true',
					given.anOptionsObjectWithPrettySetTo,
					() => {
						When(
							'shouldUsePrettyOutput is called with the config and options',
							when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions,
							() => {
								Then('it should return true', then.itShouldReturnTrue);
							},
						);
					},
				);
				Given(
					'an options object with pretty set to false',
					given.anOptionsObjectWithPrettySetTo,
					() => {
						When(
							'shouldUsePrettyOutput is called with the config and options',
							when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions,
							() => {
								Then('it should return false', then.itShouldReturnFalse);
							},
						);
					},
				);
				Given('an empty options object', given.anEmptyOptionsObject, () => {
					When(
						'shouldUsePrettyOutput is called with the config and options',
						when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return true', then.itShouldReturnTrue);
						},
					);
				});
			},
		);
		Given(
			'a config with pretty set to false',
			given.aConfigWithPrettySetTo,
			() => {
				Given(
					'an options object with pretty set to true',
					given.anOptionsObjectWithPrettySetTo,
					() => {
						When(
							'shouldUsePrettyOutput is called with the config and options',
							when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions,
							() => {
								Then('it should return true', then.itShouldReturnTrue);
							},
						);
					},
				);
				Given(
					'an options object with pretty set to false',
					given.anOptionsObjectWithPrettySetTo,
					() => {
						When(
							'shouldUsePrettyOutput is called with the config and options',
							when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions,
							() => {
								Then('it should return false', then.itShouldReturnFalse);
							},
						);
					},
				);
				Given('an empty options object', given.anEmptyOptionsObject, () => {
					When(
						'shouldUsePrettyOutput is called with the config and options',
						when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions,
						() => {
							Then('it should return false', then.itShouldReturnFalse);
						},
					);
				});
			},
		);
	});
	describe('#createErrorHandler', () => {
		Given('a prefix "Some error message prefix"', given.aPrefix, () => {
			Given(
				'an object with message "Some message."',
				given.anObjectWithMessage,
				() => {
					When(
						'createErrorHandler is called with the prefix',
						when.createErrorHandlerIsCalledWithThePrefix,
						() => {
							When(
								'the returned function is called with the object',
								when.theReturnedFunctionIsCalledWithTheObject,
								() => {
									Then(
										'it should return an object with error "Some error message prefix: Some message."',
										then.itShouldReturnAnObjectWithError,
									);
								},
							);
						},
					);
				},
			);
		});
	});
	describe('#wrapActionCreator', () => {
		beforeEach(setUpUtilWrapActionCreator);
		Given('a Vorpal instance', given.aVorpalInstance, () => {
			Given(
				'an options object with JSON set to true',
				given.anOptionsObjectWithJsonSetTo,
				() => {
					Given(
						'a parameters object with the options',
						given.aParametersObjectWithTheOptions,
						() => {
							Given(
								'a prefix "Some error message prefix"',
								given.aPrefix,
								() => {
									Given(
										'an action creator that creates an action that rejects with an error',
										given.anActionCreatorThatCreatesAnActionThatRejectsWithAnError,
										() => {
											When(
												'wrapActionCreator is called with the Vorpal instance, the action creator and the prefix',
												when.wrapActionCreatorIsCalledWithTheVorpalInstanceTheActionCreatorAndThePrefix,
												() => {
													When(
														'the wrapped action creator is called with the parameters',
														when.theWrappedActionCreatorIsCalledWithTheParameters,
														() => {
															Then(
																'the error should be printed with the prefix',
																then.theErrorShouldBePrintedWithThePrefix,
															);
														},
													);
												},
											);
										},
									);
									Given(
										'an action creator that creates an action that resolves to an object',
										given.anActionCreatorThatCreatesAnActionThatResolvesToAnObject,
										() => {
											When(
												'wrapActionCreator is called with the Vorpal instance, the action creator and the prefix',
												when.wrapActionCreatorIsCalledWithTheVorpalInstanceTheActionCreatorAndThePrefix,
												() => {
													When(
														'the wrapped action creator is called with the parameters',
														when.theWrappedActionCreatorIsCalledWithTheParameters,
														() => {
															Then(
																'the object should be printed',
																then.theObjectShouldBePrinted,
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
	});
	describe('#createCommand', () => {
		beforeEach(setUpUtilCreateCommand);
		Given('a Vorpal instance', given.aVorpalInstance, () => {
			Given(
				'a command "some command <with> [some] [args...]"',
				given.aCommand,
				() => {
					Given(
						'an autocomplete list including "something" and "else"',
						given.anAutocompleteListIncluding,
						() => {
							Given(
								'a description "Some description of a command"',
								given.aDescription,
								() => {
									Given(
										'an action creator that creates an action that resolves to an object',
										given.anActionCreatorThatCreatesAnActionThatResolvesToAnObject,
										() => {
											Given(
												'an options list including "passphrase" and "password"',
												given.anOptionsListIncluding,
												() => {
													Given(
														'a prefix "Some error message prefix"',
														given.aPrefix,
														() => {
															When(
																'createCommand is called with an object containing the command, the autocomplete list, the description, the action creator, the options list, and the prefix',
																when.createCommandIsCalledWithAnObjectContainingTheCommandTheAutocompleteListTheDescriptionTheActionCreatorTheOptionsListAndThePrefix,
																() => {
																	When(
																		'the created commmand is called with the Vorpal instance',
																		when.theCreatedCommandIsCalledWithTheVorpalInstance,
																		() => {
																			Then(
																				'the Vorpal instance should have the command',
																				then.theVorpalInstanceShouldHaveTheCommand,
																			);
																			Then(
																				'the Vorpal command instance should have the autocomplete list',
																				then.theVorpalCommandInstanceShouldHaveTheAutocompleteList,
																			);
																			Then(
																				'the Vorpal command instance should have the description',
																				then.theVorpalCommandInstanceShouldHaveTheDescription,
																			);
																			Then(
																				'the Vorpal command instance should have the provided options',
																				then.theVorpalCommandInstanceShouldHaveTheProvidedOptions,
																			);
																			Then(
																				'the Vorpal command instance should have the json option',
																				then.theVorpalCommandInstanceShouldHaveTheJsonOption,
																			);
																			Then(
																				'the Vorpal command instance should have the pretty option',
																				then.theVorpalCommandInstanceShouldHaveThePrettyOption,
																			);
																			Then(
																				'the Vorpal command instance should have the table option',
																				then.theVorpalCommandInstanceShouldHaveTheTableOption,
																			);
																			When(
																				'the command "some command someArg" is executed',
																				when.theCommandIsExecuted,
																				() => {
																					Then(
																						'the object should be printed',
																						then.theObjectShouldBePrinted,
																					);
																				},
																			);
																		},
																	);
																},
															);
															Given(
																'an alias "alternative command"',
																given.anAlias,
																() => {
																	When(
																		'createCommand is called with an object containing the command, the autocomplete list, the description, the alias, the action creator, the options list, and the prefix',
																		when.createCommandIsCalledWithAnObjectContainingTheCommandTheAutocompleteListTheDescriptionTheAliasTheActionCreatorTheOptionsListAndThePrefix,
																		() => {
																			When(
																				'the created commmand is called with the Vorpal instance',
																				when.theCreatedCommandIsCalledWithTheVorpalInstance,
																				() => {
																					Then(
																						'the Vorpal instance should have the command',
																						then.theVorpalInstanceShouldHaveTheCommand,
																					);
																					Then(
																						'the Vorpal command instance should have the autocomplete list',
																						then.theVorpalCommandInstanceShouldHaveTheAutocompleteList,
																					);
																					Then(
																						'the Vorpal command instance should have the description',
																						then.theVorpalCommandInstanceShouldHaveTheDescription,
																					);
																					Then(
																						'the Vorpal command instance should have the alias',
																						then.theVorpalCommandInstanceShouldHaveTheAlias,
																					);
																					Then(
																						'the Vorpal command instance should have the provided options',
																						then.theVorpalCommandInstanceShouldHaveTheProvidedOptions,
																					);
																					Then(
																						'the Vorpal command instance should have the json option',
																						then.theVorpalCommandInstanceShouldHaveTheJsonOption,
																					);
																					Then(
																						'the Vorpal command instance should have the pretty option',
																						then.theVorpalCommandInstanceShouldHaveThePrettyOption,
																					);
																					Then(
																						'the Vorpal command instance should have the table option',
																						then.theVorpalCommandInstanceShouldHaveTheTableOption,
																					);
																					When(
																						'the command "alternative command someArg" is executed',
																						when.theCommandIsExecuted,
																						() => {
																							Then(
																								'the object should be printed',
																								then.theObjectShouldBePrinted,
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
