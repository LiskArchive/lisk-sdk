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
import { setUpCommandDecryptPassphrase } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('decrypt passphrase command', () => {
	beforeEach(setUpCommandDecryptPassphrase);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'a crypto instance has been initialised',
				given.aCryptoInstanceHasBeenInitialised,
				() => {
					Given('an action "decrypt passphrase"', given.anAction, () => {
						Given(
							'an encrypted passphrase "iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1"',
							given.anEncryptedPassphrase,
							() => {
								Given('a password "testing123"', given.aPassword, () => {
									Given(
										'an empty options object',
										given.anEmptyOptionsObject,
										() => {
											When(
												'the action is called with the options',
												when.theActionIsCalledWithTheOptions,
												() => {
													Then(
														'it should reject with validation error and message "No encrypted passphrase was provided."',
														then.itShouldRejectWithValidationErrorAndMessage,
													);
												},
											);
											Given(
												'an error "Unknown data source type." occurs retrieving the inputs from their sources',
												given.anErrorOccursRetrievingTheInputsFromTheirSources,
												() => {
													When(
														'the action is called with the encrypted passphrase and the options',
														when.theActionIsCalledWithTheEncryptedPassphraseAndTheOptions,
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
												'the password can be retrieved from its source',
												given.thePasswordCanBeRetrievedFromItsSource,
												() => {
													When(
														'the action is called with the encrypted passphrase and the options',
														when.theActionIsCalledWithTheEncryptedPassphraseAndTheOptions,
														() => {
															Then(
																'it should get the inputs from sources using the Vorpal instance',
																then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
															);
															Then(
																'it should get the inputs from sources using the password source without a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt,
															);
															Then(
																'it should not get the inputs from sources using the encrypted passphrase source',
																then.itShouldNotGetTheInputsFromSourcesUsingTheEncryptedPassphraseSource,
															);
															Then(
																'it should decrypt the passphrase using the password',
																then.itShouldDecryptThePassphraseUsingThePassword,
															);
															Then(
																'it should resolve to the result of decrypting the passphrase',
																then.itShouldResolveToTheResultOfDecryptingThePassphrase,
															);
														},
													);
												},
											);
										},
									);
									Given(
										'an options object with password set to "passwordSource"',
										given.anOptionsObjectWithPasswordSetTo,
										() => {
											Given(
												'an error "Unknown data source type." occurs retrieving the inputs from their sources',
												given.anErrorOccursRetrievingTheInputsFromTheirSources,
												() => {
													When(
														'the action is called with the encrypted passphrase and the options',
														when.theActionIsCalledWithTheEncryptedPassphraseAndTheOptions,
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
												'the password can be retrieved from its source',
												given.thePasswordCanBeRetrievedFromItsSource,
												() => {
													When(
														'the action is called with the encrypted passphrase and the options',
														when.theActionIsCalledWithTheEncryptedPassphraseAndTheOptions,
														() => {
															Then(
																'it should get the inputs from sources using the Vorpal instance',
																then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
															);
															Then(
																'it should get the inputs from sources using the password source without a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt,
															);
															Then(
																'it should not get the inputs from sources using the encrypted passphrase source',
																then.itShouldNotGetTheInputsFromSourcesUsingTheEncryptedPassphraseSource,
															);
															Then(
																'it should decrypt the passphrase using the password',
																then.itShouldDecryptThePassphraseUsingThePassword,
															);
															Then(
																'it should resolve to the result of decrypting the passphrase',
																then.itShouldResolveToTheResultOfDecryptingThePassphrase,
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
														'the action is called with the encrypted passphrase and the options',
														when.theActionIsCalledWithTheEncryptedPassphraseAndTheOptions,
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
												'the password and encrypted passphrase can be retrieved from their sources',
												given.thePasswordAndEncryptedPassphraseCanBeRetrievedFromTheirSources,
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
																'it should get the inputs from sources using the password source without a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt,
															);
															Then(
																'it should get the inputs from sources using the encrypted passphrase source without a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingTheEncryptedPassphraseSourceWithoutARepeatingPrompt,
															);
															Then(
																'it should decrypt the passphrase using the password',
																then.itShouldDecryptThePassphraseUsingThePassword,
															);
															Then(
																'it should resolve to the result of decrypting the passphrase',
																then.itShouldResolveToTheResultOfDecryptingThePassphrase,
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
														'the action is called with the encrypted passphrase and the options',
														when.theActionIsCalledWithTheEncryptedPassphraseAndTheOptions,
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
												'the password and encrypted passphrase can be retrieved from their sources',
												given.thePasswordAndEncryptedPassphraseCanBeRetrievedFromTheirSources,
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
																'it should get the inputs from sources using the password source without a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt,
															);
															Then(
																'it should get the inputs from sources using the encrypted passphrase source without a repeating prompt',
																then.itShouldGetTheInputsFromSourcesUsingTheEncryptedPassphraseSourceWithoutARepeatingPrompt,
															);
															Then(
																'it should decrypt the passphrase using the password',
																then.itShouldDecryptThePassphraseUsingThePassword,
															);
															Then(
																'it should resolve to the result of decrypting the passphrase',
																then.itShouldResolveToTheResultOfDecryptingThePassphrase,
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
