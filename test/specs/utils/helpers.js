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
import { setUpUtilWrapActionCreator } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('utils helpers', () => {
	describe('#validateAddress', () => {
		describe('Given an address "13356260975429434553L"', () => {
			beforeEach(given.anAddress);
			describe('When validateAddress is called on the address', () => {
				beforeEach(when.validateAddressIsCalledOnTheAddress);
				it('Then it should return true', then.itShouldReturnTrue);
			});
		});
		describe('Given an address "1234567890LL"', () => {
			beforeEach(given.anAddress);
			describe('When validateAddress is called on the address', () => {
				beforeEach(when.validateAddressIsCalledOnTheAddress);
				it('Then it should throw error "1234567890LL is not a valid address."', then.itShouldThrowError);
			});
		});
		describe('Given an address "L"', () => {
			beforeEach(given.anAddress);
			describe('When validateAddress is called on the address', () => {
				beforeEach(when.validateAddressIsCalledOnTheAddress);
				it('Then it should throw error "L is not a valid address."', then.itShouldThrowError);
			});
		});
		describe('Given an address "0123456789101112131415L"', () => {
			beforeEach(given.anAddress);
			describe('When validateAddress is called on the address', () => {
				beforeEach(when.validateAddressIsCalledOnTheAddress);
				it('Then it should throw error "0123456789101112131415L is not a valid address."', then.itShouldThrowError);
			});
		});
	});
	describe('#validateAmount', () => {
		describe('Given an amount "100.123"', () => {
			beforeEach(given.anAmount);
			describe('When validateAmount is called on the amount', () => {
				beforeEach(when.validateAmountIsCalledOnTheAmount);
				it('Then it should return true', then.itShouldReturnTrue);
			});
		});
		describe('Given an invalid amount "abcedf"', () => {
			beforeEach(given.anInvalidAmount);
			describe('When validateAmount is called on the amount', () => {
				beforeEach(when.validateAmountIsCalledOnTheAmount);
				it('Then it should throw the error "Amount must be a number with no more than 8 decimal places."', then.itShouldThrowError);
			});
		});
		describe('Given an invalid amount "10.0001000001"', () => {
			beforeEach(given.anInvalidAmount);
			describe('When validateAmount is called on the amount', () => {
				beforeEach(when.validateAmountIsCalledOnTheAmount);
				it('Then it should throw the error "Amount must be a number with no more than 8 decimal places."', then.itShouldThrowError);
			});
		});
	});
	describe('#deAlias', () => {
		describe('Given a type "address" with alias "account"', () => {
			beforeEach(given.aTypeWithAlias);
			describe('When deAlias is called on the type', () => {
				beforeEach(when.deAliasIsCalledOnTheType);
				it('Then it should return the alias', then.itShouldReturnTheAlias);
			});
		});
		describe('Given a type "block" with no alias', () => {
			beforeEach(given.aTypeWithNoAlias);
			describe('When deAlias is called on the type', () => {
				beforeEach(when.deAliasIsCalledOnTheType);
				it('Then it should return the type', then.itShouldReturnTheType);
			});
		});
	});
	describe('#processQueryResult', () => {
		describe('Given a type "block"', () => {
			beforeEach(given.aType);
			describe('Given a result with error "The block could not be found."', () => {
				beforeEach(given.aResultWithError);
				describe('When processQueryResult is called with the type then the result', () => {
					beforeEach(when.processQueryResultIsCalledWithTheTypeThenTheResult);
					it('Then it should return the result', then.itShouldReturnTheResult);
				});
			});
			describe('Given a result with a block', () => {
				beforeEach(given.aResultWithABlock);
				describe('When processQueryResult is called with the type then the result', () => {
					beforeEach(when.processQueryResultIsCalledWithTheTypeThenTheResult);
					it('Then it should return the block', then.itShouldReturnTheBlock);
				});
			});
		});
	});
	describe('#shouldUseJsonOutput', () => {
		describe('Given a config with json set to true', () => {
			beforeEach(given.aConfigWithJsonSetTo);
			describe('Given an options object with json set to true', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);
				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return true', then.itShouldReturnTrue);
				});
			});
			describe('Given an options object with json set to false', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);
				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return false', then.itShouldReturnFalse);
				});
			});
			describe('Given an empty options object', () => {
				beforeEach(given.anEmptyOptionsObject);
				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return true', then.itShouldReturnTrue);
				});
			});
		});
		describe('Given a config with json set to false', () => {
			beforeEach(given.aConfigWithJsonSetTo);
			describe('Given an options object with json set to true', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);
				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return true', then.itShouldReturnTrue);
				});
			});
			describe('Given an options object with json set to false', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);
				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return false', then.itShouldReturnFalse);
				});
			});
			describe('Given an empty options object', () => {
				beforeEach(given.anEmptyOptionsObject);
				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return false', then.itShouldReturnFalse);
				});
			});
		});
	});
	describe('#shouldUsePrettyOutput', () => {
		describe('Given a config with pretty set to true', () => {
			beforeEach(given.aConfigWithPrettySetTo);
			describe('Given an options object with pretty set to true', () => {
				beforeEach(given.anOptionsObjectWithPrettySetTo);
				describe('When shouldUsePrettyOutput is called with the config and options', () => {
					beforeEach(when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return true', then.itShouldReturnTrue);
				});
			});
			describe('Given an options object with pretty set to false', () => {
				beforeEach(given.anOptionsObjectWithPrettySetTo);
				describe('When shouldUsePrettyOutput is called with the config and options', () => {
					beforeEach(when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return false', then.itShouldReturnFalse);
				});
			});
			describe('Given an empty options object', () => {
				beforeEach(given.anEmptyOptionsObject);
				describe('When shouldUsePrettyOutput is called with the config and options', () => {
					beforeEach(when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return true', then.itShouldReturnTrue);
				});
			});
		});
		describe('Given a config with pretty set to false', () => {
			beforeEach(given.aConfigWithPrettySetTo);
			describe('Given an options object with pretty set to true', () => {
				beforeEach(given.anOptionsObjectWithPrettySetTo);
				describe('When shouldUsePrettyOutput is called with the config and options', () => {
					beforeEach(when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return true', then.itShouldReturnTrue);
				});
			});
			describe('Given an options object with pretty set to false', () => {
				beforeEach(given.anOptionsObjectWithPrettySetTo);
				describe('When shouldUsePrettyOutput is called with the config and options', () => {
					beforeEach(when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return false', then.itShouldReturnFalse);
				});
			});
			describe('Given an empty options object', () => {
				beforeEach(given.anEmptyOptionsObject);
				describe('When shouldUsePrettyOutput is called with the config and options', () => {
					beforeEach(when.shouldUsePrettyOutputIsCalledWithTheConfigAndOptions);
					it('Then it should return false', then.itShouldReturnFalse);
				});
			});
		});
	});
	describe('#createErrorHandler', () => {
		describe('Given a prefix "Some error message prefix"', () => {
			beforeEach(given.aPrefix);
			describe('Given an object with message "Some message."', () => {
				beforeEach(given.anObjectWithMessage);
				describe('When createErrorHandler is called with the prefix', () => {
					beforeEach(when.createErrorHandlerIsCalledWithThePrefix);
					describe('When the returned function is called with the object', () => {
						beforeEach(when.theReturnedFunctionIsCalledWithTheObject);
						it('Then it should return an object with error "Some error message prefix: Some message."', then.itShouldReturnAnObjectWithError);
					});
				});
			});
		});
	});
	describe('#wrapActionCreator', () => {
		beforeEach(setUpUtilWrapActionCreator);
		describe('Given a Vorpal instance', () => {
			beforeEach(given.aVorpalInstance);
			describe('Given an options object with JSON set to true', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);
				describe('Given a parameters object with the options', () => {
					beforeEach(given.aParametersObjectWithTheOptions);
					describe('Given a prefix "Some error message prefix"', () => {
						beforeEach(given.aPrefix);
						describe('Given an action creator that creates an action that rejects with an error', () => {
							beforeEach(given.anActionCreatorThatCreatesAnActionThatRejectsWithAnError);
							describe('When wrapActionCreator is called with the Vorpal instance, the action creator and the prefix', () => {
								beforeEach(when.wrapActionCreatorIsCalledWithTheVorpalInstanceTheActionCreatorAndThePrefix);
								describe('When the wrapped action creator is called with the parameters', () => {
									beforeEach(when.theWrappedActionCreatorIsCalledWithTheParameters);
									it('Then the error should be printed with the prefix', then.theErrorShouldBePrintedWithThePrefix);
								});
							});
						});
						describe('Given an action creator that creates an action that resolves to an object', () => {
							beforeEach(given.anActionCreatorThatCreatesAnActionThatResolvesToAnObject);
							describe('When wrapActionCreator is called with the Vorpal instance, the action creator and the prefix', () => {
								beforeEach(when.wrapActionCreatorIsCalledWithTheVorpalInstanceTheActionCreatorAndThePrefix);
								describe('When the wrapped action creator is called with the parameters', () => {
									beforeEach(when.theWrappedActionCreatorIsCalledWithTheParameters);
									it('Then the object should be printed', then.theObjectShouldBePrinted);
								});
							});
						});
					});
				});
			});
		});
	});
	describe('#createCommand', () => {
		describe('Given a Vorpal instance', () => {
			beforeEach(given.aVorpalInstance);
			describe('Given a command "some command <with> [some] [args...]"', () => {
				beforeEach(given.aCommand);
				describe('Given an autocomplete list including "something" and "else"', () => {
					beforeEach(given.anAutocompleteListIncluding);
					describe('Given a description "Some description of a command"', () => {
						beforeEach(given.aDescription);
						describe('Given an action creator that creates an action that resolves to an object', () => {
							beforeEach(given.anActionCreatorThatCreatesAnActionThatResolvesToAnObject);
							describe('Given an options list including "passphrase" and "password"', () => {
								beforeEach(given.anOptionsListIncluding);
								describe('Given a prefix "Some error message prefix"', () => {
									beforeEach(given.aPrefix);
									describe('When createCommand is called with an object containing the command, the autocomplete list, the description, the action creator, the options list, and the prefix', () => {
										beforeEach(when.createCommandIsCalledWithAnObjectContainingTheCommandTheAutocompleteListTheDescriptionTheActionCreatorTheOptionsListAndThePrefix);
										describe('When the created commmand is called with the Vorpal instance', () => {
											beforeEach(when.theCreatedCommandIsCalledWithTheVorpalInstance);
											it('Then the Vorpal instance should have the command', then.theVorpalInstanceShouldHaveTheCommand);
											it('Then the Vorpal command instance should have the autocomplete list', then.theVorpalCommandInstanceShouldHaveTheAutocompleteList);
											it('Then the Vorpal command instance should have the description', then.theVorpalCommandInstanceShouldHaveTheDescription);
											it('Then the Vorpal command instance should have the provided options', then.theVorpalCommandInstanceShouldHaveTheProvidedOptions);
											it('Then the Vorpal command instance should have the json option', then.theVorpalCommandInstanceShouldHaveTheJsonOption);
											it('Then the Vorpal command instance should have the noJson option', then.theVorpalCommandInstanceShouldHaveTheNoJsonOption);
											it('Then the Vorpal command instance should have the pretty option', then.theVorpalCommandInstanceShouldHaveThePrettyOption);
											describe('When the command "some command someArg" is executed', () => {
												beforeEach(when.theCommandIsExecuted);
												it('Then it should resolve to the object', then.itShouldResolveToTheObject);
											});
										});
									});
									describe('Given an alias "alternative command"', () => {
										beforeEach(given.anAlias);
										describe('When createCommand is called with an object containing the command, the autocomplete list, the description, the alias, the action creator, the options list, and the prefix', () => {
											beforeEach(when.createCommandIsCalledWithAnObjectContainingTheCommandTheAutocompleteListTheDescriptionTheAliasTheActionCreatorTheOptionsListAndThePrefix);
											describe('When the created commmand is called with the Vorpal instance', () => {
												beforeEach(when.theCreatedCommandIsCalledWithTheVorpalInstance);
												it('Then the Vorpal instance should have the command', then.theVorpalInstanceShouldHaveTheCommand);
												it('Then the Vorpal command instance should have the autocomplete list', then.theVorpalCommandInstanceShouldHaveTheAutocompleteList);
												it('Then the Vorpal command instance should have the description', then.theVorpalCommandInstanceShouldHaveTheDescription);
												it('Then the Vorpal command instance should have the alias', then.theVorpalCommandInstanceShouldHaveTheAlias);
												it('Then the Vorpal command instance should have the provided options', then.theVorpalCommandInstanceShouldHaveTheProvidedOptions);
												it('Then the Vorpal command instance should have the json option', then.theVorpalCommandInstanceShouldHaveTheJsonOption);
												it('Then the Vorpal command instance should have the noJson option', then.theVorpalCommandInstanceShouldHaveTheNoJsonOption);
												it('Then the Vorpal command instance should have the pretty option', then.theVorpalCommandInstanceShouldHaveThePrettyOption);
												describe('When the command "alternative command someArg" is executed', () => {
													beforeEach(when.theCommandIsExecuted);
													it('Then it should resolve to the object', then.itShouldResolveToTheObject);
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
		});
	});
});
