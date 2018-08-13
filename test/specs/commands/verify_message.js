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
import { setUpCommandVerifyMessage } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('verify message command', () => {
	beforeEach(setUpCommandVerifyMessage);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'a crypto instance has been initialised',
				given.aCryptoInstanceHasBeenInitialised,
				() => {
					Given('an action "verify message"', given.anAction, () => {
						Given(
							'a public key "647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6"',
							given.aPublicKey,
							() => {
								Given(
									'a signature "2a3ca127efcf7b2bf62ac8c3b1f5acf6997cab62ba9fde3567d188edcbacbc5dc8177fb88d03a8691ce03348f569b121bca9e7a3c43bf5c056382f35ff843c09"',
									given.aSignature,
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
															'it should reject with validation error and message "No public key was provided."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
												When(
													'the action is called with the options and the public key',
													when.theActionIsCalledWithTheOptionsAndThePublicKey,
													() => {
														Then(
															'it should reject with validation error and message "No signature was provided."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
												When(
													'the action is called with the options, the public key and the signature',
													when.theActionIsCalledWithTheOptionsThePublicKeyAndTheSignature,
													() => {
														Then(
															'it should reject with validation error and message "No message was provided."',
															then.itShouldRejectWithValidationErrorAndMessage,
														);
													},
												);
												Given('a message "Hello world"', given.aMessage, () => {
													When(
														'the action is called with the options, the message, the public key and the signature',
														when.theActionIsCalledWithTheOptionsTheMessageThePublicKeyAndTheSignature,
														() => {
															Then(
																'it should resolve to the result of verifying the message',
																then.itShouldResolveToTheResultOfVerifyingTheMessage,
															);
														},
													);
												});
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
															'the action is called with the options, the public key and the signature',
															when.theActionIsCalledWithTheOptionsThePublicKeyAndTheSignature,
															() => {
																Then(
																	'it should get the inputs from sources using the message source',
																	then.itShouldGetTheInputsFromSourcesUsingTheMessageSource,
																);
																Then(
																	'it should reject with the error message',
																	then.itShouldRejectWithTheErrorMessage,
																);
															},
														);
													},
												);
												Given(
													'the message can be retrieved from its source',
													given.theMessageCanBeRetrievedFromItsSource,
													() => {
														When(
															'the action is called with the options, the public key and the signature',
															when.theActionIsCalledWithTheOptionsThePublicKeyAndTheSignature,
															() => {
																Then(
																	'it should get the inputs from sources using the Vorpal instance',
																	then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																);
																Then(
																	'it should get the inputs from sources using the message source',
																	then.itShouldGetTheInputsFromSourcesUsingTheMessageSource,
																);
																Then(
																	'it should resolve to the result of verifying the message',
																	then.itShouldResolveToTheResultOfVerifyingTheMessage,
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
