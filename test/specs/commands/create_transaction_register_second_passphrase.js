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
import { setUpCommandCreateTransactionRegisterSecondPassphrase } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction register second passphrase command', () => {
	beforeEach(setUpCommandCreateTransactionRegisterSecondPassphrase);
	Given(
		'a vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'an action "create transaction register second passphrase"',
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
										'a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"',
										given.aSecondPassphrase,
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
																'the action is called with the options',
																when.theActionIsCalledWithTheOptions,
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
																'the action is called with the options',
																when.theActionIsCalledWithTheOptions,
																() => {
																	Then(
																		'it should get the inputs from sources using the vorpal instance',
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
																		'it should create a register second passphrase transaction using the passphrase and the second passphrase',
																		then.itShouldCreateARegisterSecondPassphraseTransactionUsingThePassphraseAndTheSecondPassphrase,
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
												'an options object with second passphrase set to "secondPassphraseSource"',
												given.anOptionsObjectWithSecondPassphraseSetTo,
												() => {
													Given(
														'an error "Unknown data source type." occurs retrieving the inputs from their sources',
														given.anErrorOccursRetrievingTheInputsFromTheirSources,
														() => {
															When(
																'the action is called with the options',
																when.theActionIsCalledWithTheOptions,
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
																'the action is called with the options',
																when.theActionIsCalledWithTheOptions,
																() => {
																	Then(
																		'it should get the inputs from sources using the vorpal instance',
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
																		'it should create a register second passphrase transaction using the passphrase and the second passphrase',
																		then.itShouldCreateARegisterSecondPassphraseTransactionUsingThePassphraseAndTheSecondPassphrase,
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
																'the action is called with the options',
																when.theActionIsCalledWithTheOptions,
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
																'the action is called with the options',
																when.theActionIsCalledWithTheOptions,
																() => {
																	Then(
																		'it should get the inputs from sources using the vorpal instance',
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
																		'it should create a register second passphrase transaction using the passphrase and the second passphrase',
																		then.itShouldCreateARegisterSecondPassphraseTransactionUsingThePassphraseAndTheSecondPassphrase,
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
							Given(
								'a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"',
								given.aSecondPassphrase,
								() => {
									Given(
										'an options object with signature set to false',
										given.anOptionsObjectWithSignatureSetTo,
										() => {
											Given(
												'the second passphrase can be retrieved from its source',
												given.theSecondPassphraseCanBeRetrievedFromItsSource,
												() => {
													When(
														'the action is called with the options',
														when.theActionIsCalledWithTheOptions,
														() => {
															Then(
																'it should create a register second passphrase transaction using the second passphrase',
																then.itShouldCreateARegisterSecondPassphraseTransactionUsingTheSecondPassphrase,
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
});
