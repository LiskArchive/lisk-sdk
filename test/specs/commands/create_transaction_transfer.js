/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { setUpCommandCreateTransactionTransfer } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction transfer command', () => {
	beforeEach(setUpCommandCreateTransactionTransfer);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given('an action "create transaction transfer"', given.anAction, () => {
				Given(
					'a Lisk object that can create transactions',
					given.aLiskObjectThatCanCreateTransactions,
					() => {
						Given(
							'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
							given.aPassphrase,
							() => {
								Given(
									'an empty options object',
									given.anEmptyOptionsObject,
									() => {
										Given(
											'an address "13356260975429434553L"',
											given.anAddress,
											() => {
												Given(
													'an invalid amount "abc"',
													given.anInvalidAmount,
													() => {
														When(
															'the action is called with the amount, the address and the options',
															when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
															() => {
																Then(
																	'it should reject with validation error and message "Amount must be a number with no more than 8 decimal places."',
																	then.itShouldRejectWithValidationErrorAndMessage,
																);
															},
														);
													},
												);
												Given(
													'an invalid amount "100,5"',
													given.anInvalidAmount,
													() => {
														When(
															'the action is called with the amount, the address and the options',
															when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
															() => {
																Then(
																	'it should reject with validation error and message "Amount must be a number with no more than 8 decimal places."',
																	then.itShouldRejectWithValidationErrorAndMessage,
																);
															},
														);
													},
												);
											},
										);
										Given(
											'an amount "100.123" with normalized amount "10012300000"',
											given.anAmountWithNormalizedAmount,
											() => {
												Given(
													'an invalid address "1234567890LL"',
													given.anInvalidAddress,
													() => {
														When(
															'the action is called with the amount, the address and the options',
															when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
															() => {
																Then(
																	'it should reject with validation error and message "1234567890LL is not a valid address."',
																	then.itShouldRejectWithValidationErrorAndMessage,
																);
															},
														);
													},
												);
												Given(
													'an address "13356260975429434553L"',
													given.anAddress,
													() => {
														Given(
															'an error "Unknown data source type." occurs retrieving the inputs from their sources',
															given.anErrorOccursRetrievingTheInputsFromTheirSources,
															() => {
																When(
																	'the action is called with the amount, the address and the options',
																	when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																	'the action is called with the amount, the address and the options',
																	when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																			'it should create a transfer transaction using the address, the normalized amount and the passphrase',
																			then.itShouldCreateATransferTransactionUsingTheAddressTheNormalizedAmountAndThePassphrase,
																		);
																		Then(
																			'it should resolve to the created transaction',
																			then.itShouldResolveToTheCreatedTransaction,
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
																			'the action is called with the amount, the address and the options',
																			when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																			'the action is called with the amount, the address and the options',
																			when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																					'it should create a transfer transaction using the address, the normalized amount and the passphrase',
																					then.itShouldCreateATransferTransactionUsingTheAddressTheNormalizedAmountAndThePassphrase,
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
																					'the action is called with the amount, the address and the options',
																					when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																					'the action is called with the amount, the address and the options',
																					when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																							'it should create a transfer transaction using the address, the normalized amount, the passphrase and the second passphrase',
																							then.itShouldCreateATransferTransactionUsingTheAddressTheNormalizedAmountThePassphraseAndTheSecondPassphrase,
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
																					'the action is called with the amount, the address and the options',
																					when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																					'the action is called with the amount, the address and the options',
																					when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
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
																							'it should create a transfer transaction using the address, the normalized amount, the passphrase and the second passphrase',
																							then.itShouldCreateATransferTransactionUsingTheAddressTheNormalizedAmountThePassphraseAndTheSecondPassphrase,
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
							'an options object with signature set to "false"',
							given.anOptionsObjectWithSignatureSetTo,
							() => {
								Given(
									'an address "13356260975429434553L"',
									given.anAddress,
									() => {
										Given(
											'an amount "123" with normalized amount "12300000000"',
											given.anAmountWithNormalizedAmount,
											() => {
												When(
													'the action is called with the amount, the address and the options',
													when.theActionIsCalledWithTheAmountTheAddressAndTheOptions,
													() => {
														Then(
															'it should create a transfer transaction using the address and the normalized amount',
															then.itShouldCreateATransferTransactionUsingTheAddressAndTheNormalizedAmount,
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
			});
		},
	);
});
