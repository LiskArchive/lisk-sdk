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
import { setUpCommandSignMessage } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('sign message command', () => {
	beforeEach(setUpCommandSignMessage);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'a crypto instance has been initialised',
				given.aCryptoInstanceHasBeenInitialised,
				() => {
					Given('an action "sign message"', given.anAction, () => {
						Given(
							'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
							given.aPassphrase,
							() => {
								Given(
									'a message "Some secret message\nthat spans multiple\n lines"',
									given.aMessage,
									() => {
										Given(
											'an empty options object',
											given.anEmptyOptionsObject,
											() => {
												When(
													'the action is called with the options',
													when.theActionIsCalledWithTheOptions,
													() => {
														Then(
															'it should reject with validation error and message "No message was provided."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
												Given(
													'an error "Unknown data source type." occurs retrieving the inputs from their sources',
													given.anErrorOccursRetrievingTheInputsFromTheirSources,
													() => {
														When(
															'the action is called with the message and the options',
															when.theActionIsCalledWithTheMessageAndTheOptions,
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
															'the action is called with the message and the options',
															when.theActionIsCalledWithTheMessageAndTheOptions,
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
																	'it should not get the inputs from sources using the message source',
																	then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource,
																);
																Then(
																	'it should sign the message with the passphrase',
																	then.itShouldSignTheMessageWithThePassphrase,
																);
																Then(
																	'it should resolve to the result of signing the message',
																	then.itShouldResolveToTheResultOfSigningTheMessage,
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
															'the action is called with the message and the options',
															when.theActionIsCalledWithTheMessageAndTheOptions,
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
															'the action is called with the message and the options',
															when.theActionIsCalledWithTheMessageAndTheOptions,
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
																	'it should not get the inputs from sources using the message source',
																	then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource,
																);
																Then(
																	'it should sign the message with the passphrase',
																	then.itShouldSignTheMessageWithThePassphrase,
																);
																Then(
																	'it should resolve to the result of signing the message',
																	then.itShouldResolveToTheResultOfSigningTheMessage,
																);
															},
														);
													},
												);
											},
										);
										Given(
											'an options object with message set to "messageSource"',
											given.anOptionsObjectWithMessageSetTo,
											() => {
												Given(
													'an error "Unknown data source type." occurs retrieving the inputs from their sources',
													given.anErrorOccursRetrievingTheInputsFromTheirSources,
													() => {
														When(
															'the action is called with the message and the options',
															when.theActionIsCalledWithTheMessageAndTheOptions,
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
													'the passphrase and message can be retrieved from their sources',
													given.thePassphraseAndMessageCanBeRetrievedFromTheirSources,
													() => {
														When(
															'the action is called with the options',
															when.theActionIsCalledWithTheOptions,
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
																	'it should get the inputs from sources using the message source',
																	then.itShouldGetTheInputsFromSourcesUsingTheMessageSource,
																);
																Then(
																	'it should sign the message with the passphrase',
																	then.itShouldSignTheMessageWithThePassphrase,
																);
																Then(
																	'it should resolve to the result of signing the message',
																	then.itShouldResolveToTheResultOfSigningTheMessage,
																);
															},
														);
													},
												);
											},
										);
										Given(
											'an options object with passphrase set to "passphraseSource" and message set to "messageSource"',
											given.anOptionsObjectWithPassphraseSetToAndMessageSetTo,
											() => {
												Given(
													'an error "Unknown data source type." occurs retrieving the inputs from their sources',
													given.anErrorOccursRetrievingTheInputsFromTheirSources,
													() => {
														When(
															'the action is called with the message and the options',
															when.theActionIsCalledWithTheMessageAndTheOptions,
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
													'the passphrase and message can be retrieved from their sources',
													given.thePassphraseAndMessageCanBeRetrievedFromTheirSources,
													() => {
														When(
															'the action is called with the options',
															when.theActionIsCalledWithTheOptions,
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
																	'it should get the inputs from sources using the message source',
																	then.itShouldGetTheInputsFromSourcesUsingTheMessageSource,
																);
																Then(
																	'it should sign the message with the passphrase',
																	then.itShouldSignTheMessageWithThePassphrase,
																);
																Then(
																	'it should resolve to the result of signing the message',
																	then.itShouldResolveToTheResultOfSigningTheMessage,
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
		},
	);
});
