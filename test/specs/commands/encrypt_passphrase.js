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
import { setUpCommandEncryptPassphrase } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('encrypt passphrase command', () => {
	beforeEach(setUpCommandEncryptPassphrase);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'a crypto instance has been initialised',
				given.aCryptoInstanceHasBeenInitialised,
				() => {
					Given('an action "encrypt passphrase"', given.anAction, () => {
						Given(
							'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"',
							given.aPassphraseWithPublicKey,
							() => {
								Given('a password "testing123"', given.aPassword, () => {
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
												'the passphrase and password can be retrieved from their sources',
												given.thePassphraseAndPasswordCanBeRetrievedFromTheirSources,
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
																'it should get the inputs from sources using the password source with a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt,
															);
															Then(
																'it should encrypt the passphrase using the password',
																then.itShouldEncryptThePassphraseUsingThePassword,
															);
															Then(
																'it should resolve to the result of encrypting the passphrase',
																then.itShouldResolveToTheResultOfEncryptingThePassphrase,
															);
														},
													);
												},
											);
										},
									);
									Given(
										'an options object with output-public-key set to boolean true',
										given.anOptionsObjectWithOutputPublicKeySetToBoolean,
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
												'the passphrase and password can be retrieved from their sources',
												given.thePassphraseAndPasswordCanBeRetrievedFromTheirSources,
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
																'it should get the inputs from sources using the password source with a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt,
															);
															Then(
																'it should encrypt the passphrase using the password',
																then.itShouldEncryptThePassphraseUsingThePassword,
															);
															Then(
																'it should resolve to the result of encrypting the passphrase combined with the public key',
																then.itShouldResolveToTheResultOfEncryptingThePassphraseCombinedWithThePublicKey,
															);
														},
													);
												},
											);
										},
									);
									Given(
										'an options object with passphrase set to "passphraseSource" and password set to "passwordSource"',
										given.anOptionsObjectWithPassphraseSetToAndPasswordSetTo,
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
												'the passphrase and password can be retrieved from their sources',
												given.thePassphraseAndPasswordCanBeRetrievedFromTheirSources,
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
																'it should get the inputs from sources using the password source with a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt,
															);
															Then(
																'it should encrypt the passphrase using the password',
																then.itShouldEncryptThePassphraseUsingThePassword,
															);
															Then(
																'it should resolve to the result of encrypting the passphrase',
																then.itShouldResolveToTheResultOfEncryptingThePassphrase,
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
				},
			);
		},
	);
});
