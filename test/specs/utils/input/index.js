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
import { setUpUtilInput } from '../../../steps/setup';
import * as given from '../../../steps/1_given';
import * as when from '../../../steps/2_when';
import * as then from '../../../steps/3_then';

describe('input utils', () => {
	describe('#getFirstLineFromString', () => {
		Given(
			'there is no string available',
			given.thereIsNoStringAvailable,
			() => {
				When(
					'getFirstLineFromString is called on the string',
					when.getFirstLineFromStringIsCalledOnTheString,
					() => {
						Then('it should return null', then.itShouldReturnNull);
					},
				);
			},
		);
		Given(
			'there is a string "This is some text\nthat spans\nmultiple lines"',
			given.thereIsAString,
			() => {
				When(
					'getFirstLineFromString is called on the string',
					when.getFirstLineFromStringIsCalledOnTheString,
					() => {
						Then(
							'it should return string "This is some text"',
							then.itShouldReturnString,
						);
					},
				);
			},
		);
	});
	describe('#getInputsFromSource', () => {
		beforeEach(setUpUtilInput);
		Given(
			'a Vorpal instance that can log',
			given.aVorpalInstanceThatCanLog,
			() => {
				Given(
					'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
					given.aPassphrase,
					() => {
						Given(
							'a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"',
							given.aSecondPassphrase,
							() => {
								Given('a password "testing123"', given.aPassword, () => {
									Given(
										'some data "This is some text\nthat spans\nmultiple lines"',
										given.someData,
										() => {
											Given(
												'an empty options object',
												given.anEmptyOptionsObject,
												() => {
													When(
														'getInputsFromSources is called with the Vorpal instance and the options',
														when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
														() => {
															Then(
																'it should not ask for the passphrase from stdIn',
																then.itShouldNotAskForThePassphraseFromStdIn,
															);
															Then(
																'it should not ask for the second passphrase from stdIn',
																then.itShouldNotAskForTheSecondPassphraseFromStdIn,
															);
															Then(
																'it should not ask for the password from stdIn',
																then.itShouldNotAskForThePasswordFromStdIn,
															);
															Then(
																'it should not ask for the data from stdIn',
																then.itShouldNotAskForTheDataFromStdIn,
															);
															Then(
																'it should not get the passphrase',
																then.itShouldNotGetThePassphrase,
															);
															Then(
																'it should not get the second passphrase',
																then.itShouldNotGetTheSecondPassphrase,
															);
															Then(
																'it should not get the password',
																then.itShouldNotGetThePassword,
															);
															Then(
																'it should not get the data',
																then.itShouldNotGetTheData,
															);
															Then(
																'it should resolve without the passphrase',
																then.itShouldResolveWithoutThePassphrase,
															);
															Then(
																'it should resolve without the second passphrase',
																then.itShouldResolveWithoutTheSecondPassphrase,
															);
															Then(
																'it should resolve without the password',
																then.itShouldResolveWithoutThePassword,
															);
															Then(
																'it should resolve without the data',
																then.itShouldResolveWithoutTheData,
															);
														},
													);
												},
											);
											Given('an options object', given.anOptionsObject, () => {
												describe('passphrase option', () => {
													Given(
														'the options object has a "passphrase" field',
														given.theOptionsObjectHasAField,
														() => {
															Given(
																'the passphrase is available from the source',
																given.thePassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should get the passphrase with a single prompt',
																				then.itShouldGetThePassphraseWithASinglePrompt,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve with the passphrase',
																				then.itShouldResolveWithThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "passphrase" field with key "source" set to string "prompt"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the passphrase is available from the source',
																given.thePassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should get the passphrase with a single prompt',
																				then.itShouldGetThePassphraseWithASinglePrompt,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve with the passphrase',
																				then.itShouldResolveWithThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "passphrase" field with key "repeatPrompt" set to boolean true',
														given.theOptionsObjectHasAFieldWithKeySetToBoolean,
														() => {
															Given(
																'the passphrase is available from the source',
																given.thePassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should get the passphrase with a repeated prompt',
																				then.itShouldGetThePassphraseWithARepeatedPrompt,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve with the passphrase',
																				then.itShouldResolveWithThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "passphrase" field with key "source" set to string "file:/path/to/passphrase.txt"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the passphrase is available from the source',
																given.thePassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should get the passphrase',
																				then.itShouldGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve with the passphrase',
																				then.itShouldResolveWithThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "passphrase" field with key "source" set to string "stdin"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the passphrase is provided via stdIn',
																given.thePassphraseIsProvidedViaStdIn,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should ask for the passphrase from stdIn',
																				then.itShouldAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve with the passphrase',
																				then.itShouldResolveWithThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
												});
												describe('second passphrase option', () => {
													Given(
														'the options object has a "secondPassphrase" field',
														given.theOptionsObjectHasAField,
														() => {
															Given(
																'the second passphrase is available from the source',
																given.theSecondPassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should get the second passphrase with a single prompt',
																				then.itShouldGetTheSecondPassphraseWithASinglePrompt,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve with the second passphrase',
																				then.itShouldResolveWithTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "secondPassphrase" field with key "source" set to string "prompt"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the second passphrase is available from the source',
																given.theSecondPassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should get the second passphrase with a single prompt',
																				then.itShouldGetTheSecondPassphraseWithASinglePrompt,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve with the second passphrase',
																				then.itShouldResolveWithTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "secondPassphrase" field with key "repeatPrompt" set to boolean true',
														given.theOptionsObjectHasAFieldWithKeySetToBoolean,
														() => {
															Given(
																'the second passphrase is available from the source',
																given.theSecondPassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should get the second passphrase with a repeated prompt',
																				then.itShouldGetTheSecondPassphraseWithARepeatedPrompt,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve with the second passphrase',
																				then.itShouldResolveWithTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "secondPassphrase" field with key "source" set to string "file:/path/to/passphrase.txt"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the second passphrase is available from the source',
																given.theSecondPassphraseIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should get the second passphrase',
																				then.itShouldGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve with the second passphrase',
																				then.itShouldResolveWithTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "secondPassphrase" field with key "source" set to string "stdin"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the second passphrase is provided via stdIn',
																given.theSecondPassphraseIsProvidedViaStdIn,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should ask for the second passphrase from stdIn',
																				then.itShouldAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve with the second passphrase',
																				then.itShouldResolveWithTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
												});
												describe('password option', () => {
													Given(
														'the options object has a "password" field',
														given.theOptionsObjectHasAField,
														() => {
															Given(
																'the password is available from the source',
																given.thePasswordIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should get the password with a single prompt',
																				then.itShouldGetThePasswordWithASinglePrompt,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve with the password',
																				then.itShouldResolveWithThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "password" field with key "repeatPrompt" set to boolean true',
														given.theOptionsObjectHasAFieldWithKeySetToBoolean,
														() => {
															Given(
																'the password is available from the source',
																given.thePasswordIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should get the password with a repeated prompt',
																				then.itShouldGetThePasswordWithARepeatedPrompt,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve with the password',
																				then.itShouldResolveWithThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "password" field with key "source" set to string "file:/path/to/passphrase.txt"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the password is available from the source',
																given.thePasswordIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should get the password',
																				then.itShouldGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve with the password',
																				then.itShouldResolveWithThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "password" field with key "source" set to string "stdin"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the password is provided via stdIn',
																given.thePasswordIsProvidedViaStdIn,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should ask for the password from stdIn',
																				then.itShouldAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve with the password',
																				then.itShouldResolveWithThePassword,
																			);
																			Then(
																				'it should resolve without the data',
																				then.itShouldResolveWithoutTheData,
																			);
																		},
																	);
																},
															);
														},
													);
												});
												describe('data option', () => {
													Given(
														'the options object has a "data" field with key "source" set to string "file:/path/to/passphrase.txt"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the data is available from the source',
																given.theDataIsAvailableFromTheSource,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should not ask for the data from stdIn',
																				then.itShouldNotAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should get the data',
																				then.itShouldGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve with the data',
																				then.itShouldResolveWithTheData,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'the options object has a "data" field with key "source" set to string "stdin"',
														given.theOptionsObjectHasAFieldWithKeySetToString,
														() => {
															Given(
																'the data is provided via stdIn',
																given.theDataIsProvidedViaStdIn,
																() => {
																	When(
																		'getInputsFromSources is called with the Vorpal instance and the options',
																		when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																		() => {
																			Then(
																				'it should not ask for the passphrase from stdIn',
																				then.itShouldNotAskForThePassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the second passphrase from stdIn',
																				then.itShouldNotAskForTheSecondPassphraseFromStdIn,
																			);
																			Then(
																				'it should not ask for the password from stdIn',
																				then.itShouldNotAskForThePasswordFromStdIn,
																			);
																			Then(
																				'it should ask for the data from stdIn',
																				then.itShouldAskForTheDataFromStdIn,
																			);
																			Then(
																				'it should not get the passphrase',
																				then.itShouldNotGetThePassphrase,
																			);
																			Then(
																				'it should not get the second passphrase',
																				then.itShouldNotGetTheSecondPassphrase,
																			);
																			Then(
																				'it should not get the password',
																				then.itShouldNotGetThePassword,
																			);
																			Then(
																				'it should not get the data',
																				then.itShouldNotGetTheData,
																			);
																			Then(
																				'it should resolve without the passphrase',
																				then.itShouldResolveWithoutThePassphrase,
																			);
																			Then(
																				'it should resolve without the second passphrase',
																				then.itShouldResolveWithoutTheSecondPassphrase,
																			);
																			Then(
																				'it should resolve without the password',
																				then.itShouldResolveWithoutThePassword,
																			);
																			Then(
																				'it should resolve with the data',
																				then.itShouldResolveWithTheData,
																			);
																		},
																	);
																},
															);
														},
													);
												});
												describe('multiple options integration', () => {
													Given(
														'the options object has a "passphrase" field with key "repeatPrompt" set to boolean true',
														given.theOptionsObjectHasAFieldWithKeySetToBoolean,
														() => {
															Given(
																'the options object has a "secondPassphrase" field with key "source" set to string "stdin"',
																given.theOptionsObjectHasAFieldWithKeySetToString,
																() => {
																	Given(
																		'the options object has a "password" field',
																		given.theOptionsObjectHasAField,
																		() => {
																			Given(
																				'the options object has a "data" field with key "source" set to string "stdin"',
																				given.theOptionsObjectHasAFieldWithKeySetToString,
																				() => {
																					Given(
																						'the passphrase is available from the source',
																						given.thePassphraseIsAvailableFromTheSource,
																						() => {
																							Given(
																								'the password is available from the source',
																								given.thePasswordIsAvailableFromTheSource,
																								() => {
																									Given(
																										'the second passphrase and the data are provided via stdIn',
																										given.theSecondPassphraseAndTheDataAreProvidedViaStdIn,
																										() => {
																											When(
																												'getInputsFromSources is called with the Vorpal instance and the options',
																												when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions,
																												() => {
																													Then(
																														'it should not ask for the passphrase from stdIn',
																														then.itShouldNotAskForThePassphraseFromStdIn,
																													);
																													Then(
																														'it should ask for the second passphrase from stdIn',
																														then.itShouldAskForTheSecondPassphraseFromStdIn,
																													);
																													Then(
																														'it should not ask for the password from stdIn',
																														then.itShouldNotAskForThePasswordFromStdIn,
																													);
																													Then(
																														'it should ask for the data from stdIn',
																														then.itShouldAskForTheDataFromStdIn,
																													);
																													Then(
																														'it should get the passphrase with a repeated prompt',
																														then.itShouldGetThePassphraseWithARepeatedPrompt,
																													);
																													Then(
																														'it should not get the second passphrase',
																														then.itShouldNotGetTheSecondPassphrase,
																													);
																													Then(
																														'it should get the password with a single prompt',
																														then.itShouldGetThePasswordWithASinglePrompt,
																													);
																													Then(
																														'it should not get the data',
																														then.itShouldNotGetTheData,
																													);
																													Then(
																														'it should resolve with the passphrase',
																														then.itShouldResolveWithThePassphrase,
																													);
																													Then(
																														'it should resolve with the second passphrase',
																														then.itShouldResolveWithTheSecondPassphrase,
																													);
																													Then(
																														'it should resolve with the password',
																														then.itShouldResolveWithThePassword,
																													);
																													Then(
																														'it should resolve with the data',
																														then.itShouldResolveWithTheData,
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
										},
									);
								});
							},
						);
					},
				);
			},
		);
	});
});
