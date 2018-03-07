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
import { setUpCommandCreateTransactionRegisterMultisignatureAccount } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction register multisignature account command', () => {
	beforeEach(setUpCommandCreateTransactionRegisterMultisignatureAccount);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'an action "create transaction register multisignature account"',
				given.anAction,
				() => {
					Given(
						'a Lisk object that can create transactions',
						given.aLiskObjectThatCanCreateTransactions,
						() => {
							Given(
								'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
								given.aPassphrase,
								() => {
									Given(
										'a minimum of 2 signatures',
										given.aMinimumOfSignatures,
										() => {
											Given(
												'a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca" and "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"',
												given.aKeysgroupWithKeys,
												() => {
													Given(
														'an empty options object',
														given.anEmptyOptionsObject,
														() => {
															Given(
																'a lifetime of "NaN" hours',
																given.aLifetimeOfHours,
																() => {
																	When(
																		'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																		when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																		() => {
																			Then(
																				'it should reject with validation error and message "Lifetime must be an integer."',
																				then.itShouldRejectWithValidationErrorAndMessage,
																			);
																		},
																	);
																},
															);
															Given(
																'a lifetime of 5.5 hours',
																given.aLifetimeOfHours,
																() => {
																	When(
																		'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																		when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																		() => {
																			Then(
																				'it should reject with validation error and message "Lifetime must be an integer."',
																				then.itShouldRejectWithValidationErrorAndMessage,
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
										'a lifetime of 24 hours',
										given.aLifetimeOfHours,
										() => {
											Given(
												'a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca" and "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"',
												given.aKeysgroupWithKeys,
												() => {
													Given(
														'an empty options object',
														given.anEmptyOptionsObject,
														() => {
															Given(
																'a minimum of "NaN" signatures',
																given.aMinimumOfSignatures,
																() => {
																	When(
																		'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																		when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																		() => {
																			Then(
																				'it should reject with validation error and message "Minimum number of signatures must be an integer."',
																				then.itShouldRejectWithValidationErrorAndMessage,
																			);
																		},
																	);
																},
															);
															Given(
																'a minimum of 5.5 signatures',
																given.aMinimumOfSignatures,
																() => {
																	When(
																		'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																		when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																		() => {
																			Then(
																				'it should reject with validation error and message "Minimum number of signatures must be an integer."',
																				then.itShouldRejectWithValidationErrorAndMessage,
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
												'a minimum of 2 signatures',
												given.aMinimumOfSignatures,
												() => {
													Given(
														'a keysgroup with keys "+215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca"',
														given.aKeysgroupWithKeys,
														() => {
															Given(
																'an empty options object',
																given.anEmptyOptionsObject,
																() => {
																	When(
																		'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																		when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																		() => {
																			Then(
																				'it should reject with validation error and message "Error processing public key +215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca: Invalid hex string."',
																				then.itShouldRejectWithValidationErrorAndMessage,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca21"',
														given.aKeysgroupWithKeys,
														() => {
															Given(
																'an empty options object',
																given.anEmptyOptionsObject,
																() => {
																	When(
																		'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																		when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																		() => {
																			Then(
																				'it should reject with validation error and message "Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca21 length differs from the expected 64 hex characters for a public key."',
																				then.itShouldRejectWithValidationErrorAndMessage,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca" and "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"',
														given.aKeysgroupWithKeys,
														() => {
															Given(
																'an empty options object',
																given.anEmptyOptionsObject,
																() => {
																	Given(
																		'an error "Unknown data source type." occurs retrieving the inputs from their sources',
																		given.anErrorOccursRetrievingTheInputsFromTheirSources,
																		() => {
																			When(
																				'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																				when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																				() => {
																					Then(
																						'it should reject with the error message',
																						then.itShouldRejectWithTheErrorMessage,
																					);
																				},
																			);
																		},
																	);
																	Given(
																		'the passphrase can be retrieved from its source',
																		given.thePassphraseCanBeRetrievedFromItsSource,
																		() => {
																			When(
																				'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																				when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																				() => {
																					Then(
																						'it should get the inputs from sources using the Vorpal instance',
																						then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																					);
																					Then(
																						'it should get the inputs from sources using the passphrase source with a repeating prompt',
																						then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																					);
																					Then(
																						'it should not get the inputs from sources using the second passphrase source',
																						then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																					);
																					Then(
																						'it should create a register multisignature account transaction using the passphrase, the keysgroup, the lifetime and the minimum number of signatures',
																						then.itShouldCreateARegisterMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures,
																					);
																					Then(
																						'it should resolve to the created transaction',
																						then.itShouldResolveToTheCreatedTransaction,
																					);
																				},
																			);
																		},
																	);
																},
															);
															Given(
																'an options object with passphrase set to "passphraseSource"',
																given.anOptionsObjectWithPassphraseSetTo,
																() => {
																	Given(
																		'an error "Unknown data source type." occurs retrieving the inputs from their sources',
																		given.anErrorOccursRetrievingTheInputsFromTheirSources,
																		() => {
																			When(
																				'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																				when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																				() => {
																					Then(
																						'it should reject with the error message',
																						then.itShouldRejectWithTheErrorMessage,
																					);
																				},
																			);
																		},
																	);
																	Given(
																		'the passphrase can be retrieved from its source',
																		given.thePassphraseCanBeRetrievedFromItsSource,
																		() => {
																			When(
																				'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																				when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																				() => {
																					Then(
																						'it should get the inputs from sources using the Vorpal instance',
																						then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																					);
																					Then(
																						'it should get the inputs from sources using the passphrase source with a repeating prompt',
																						then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																					);
																					Then(
																						'it should not get the inputs from sources using the second passphrase source',
																						then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																					);
																					Then(
																						'it should create a register multisignature account transaction using the passphrase, the keysgroup, the lifetime and the minimum number of signatures',
																						then.itShouldCreateARegisterMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures,
																					);
																					Then(
																						'it should resolve to the created transaction',
																						then.itShouldResolveToTheCreatedTransaction,
																					);
																				},
																			);
																		},
																	);
																},
															);
															Given(
																'a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"',
																given.aSecondPassphrase,
																() => {
																	Given(
																		'an options object with second passphrase set to "secondPassphraseSource"',
																		given.anOptionsObjectWithSecondPassphraseSetTo,
																		() => {
																			Given(
																				'an error "Unknown data source type." occurs retrieving the inputs from their sources',
																				given.anErrorOccursRetrievingTheInputsFromTheirSources,
																				() => {
																					When(
																						'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																						when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																						() => {
																							Then(
																								'it should reject with the error message',
																								then.itShouldRejectWithTheErrorMessage,
																							);
																						},
																					);
																				},
																			);
																			Given(
																				'the passphrase and second passphrase can be retrieved from their sources',
																				given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources,
																				() => {
																					When(
																						'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																						when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																						() => {
																							Then(
																								'it should get the inputs from sources using the Vorpal instance',
																								then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																							);
																							Then(
																								'it should get the inputs from sources using the passphrase source with a repeating prompt',
																								then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																							);
																							Then(
																								'it should get the inputs from sources using the second passphrase source with a repeating prompt',
																								then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt,
																							);
																							Then(
																								'it should create a register multisignature account transaction using the passphrase, the second passphrase, the keysgroup, the lifetime and the minimum number of signatures',
																								then.itShouldCreateARegisterMultisignatureAccountTransactionUsingThePassphraseTheSecondPassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures,
																							);
																							Then(
																								'it should resolve to the created transaction',
																								then.itShouldResolveToTheCreatedTransaction,
																							);
																						},
																					);
																				},
																			);
																		},
																	);
																	Given(
																		'an options object with passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"',
																		given.anOptionsObjectWithPassphraseSetToAndSecondPassphraseSetTo,
																		() => {
																			Given(
																				'an error "Unknown data source type." occurs retrieving the inputs from their sources',
																				given.anErrorOccursRetrievingTheInputsFromTheirSources,
																				() => {
																					When(
																						'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																						when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																						() => {
																							Then(
																								'it should reject with the error message',
																								then.itShouldRejectWithTheErrorMessage,
																							);
																						},
																					);
																				},
																			);
																			Given(
																				'the passphrase and second passphrase can be retrieved from their sources',
																				given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources,
																				() => {
																					When(
																						'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																						when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																						() => {
																							Then(
																								'it should get the inputs from sources using the Vorpal instance',
																								then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																							);
																							Then(
																								'it should get the inputs from sources using the passphrase source with a repeating prompt',
																								then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																							);
																							Then(
																								'it should get the inputs from sources using the second passphrase source with a repeating prompt',
																								then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt,
																							);
																							Then(
																								'it should create a register multisignature account transaction using the passphrase, the second passphrase, the keysgroup, the lifetime and the minimum number of signatures',
																								then.itShouldCreateARegisterMultisignatureAccountTransactionUsingThePassphraseTheSecondPassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures,
																							);
																							Then(
																								'it should resolve to the created transaction',
																								then.itShouldResolveToTheCreatedTransaction,
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
							Given(
								'a minimum of 2 signatures',
								given.aMinimumOfSignatures,
								() => {
									Given(
										'a keysgroup with keys "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca" and "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"',
										given.aKeysgroupWithKeys,
										() => {
											Given(
												'an options object with signature set to "false"',
												given.anOptionsObjectWithSignatureSetTo,
												() => {
													Given(
														'a lifetime of "12" hours',
														given.aLifetimeOfHours,
														() => {
															When(
																'the action is called with the keysgroup, the lifetime, the minimum number of signatures and the options',
																when.theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions,
																() => {
																	Then(
																		'it should create a register multisignature account transaction using the keysgroup, the lifetime and the minimum number of signatures',
																		then.itShouldCreateARegisterMultisignatureAccountTransactionUsingTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures,
																	);
																	Then(
																		'it should resolve to the created transaction',
																		then.itShouldResolveToTheCreatedTransaction,
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
