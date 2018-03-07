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
import { setUpCommandDecryptMessage } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('decrypt message command', () => {
	beforeEach(setUpCommandDecryptMessage);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'a crypto instance has been initialised',
				given.aCryptoInstanceHasBeenInitialised,
				() => {
					Given('an action "decrypt message"', given.anAction, () => {
						Given(
							'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
							given.aPassphrase,
							() => {
								Given(
									'an encrypted message "4728715ed4463a37d8e90720a27377f04a84911b95520c2582a8b6da"',
									given.anEncryptedMessage,
									() => {
										Given(
											'a nonce "682be05eeb73a794163b5584cac6b33769c2abd867459cae"',
											given.aNonce,
											() => {
												Given(
													'a sender public key "38433137692948be1c05bbae686c9c850d3c8d9c52c1aebb4a7c1d5dd6d010d7"',
													given.aSenderPublicKey,
													() => {
														Given(
															'an empty options object',
															given.anEmptyOptionsObject,
															() => {
																When(
																	'the action is called with the nonce, the sender public key and the options',
																	when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions,
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
																			'the action is called with the message, the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions,
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
																			'the action is called with the message, the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions,
																			() => {
																				Then(
																					'it should get the inputs from sources using the Vorpal instance',
																					then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																				);
																				Then(
																					'it should get the inputs from sources using the passphrase source without a repeating prompt',
																					then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt,
																				);
																				Then(
																					'it should not get the inputs from sources using the message source',
																					then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource,
																				);
																				Then(
																					'it should decrypt the message using the nonce, the passphrase and the sender public key',
																					then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey,
																				);
																				Then(
																					'it should resolve to the result of decrypting the message',
																					then.itShouldResolveToTheResultOfDecryptingTheMessage,
																				);
																			},
																		);
																	},
																);
															},
														);
														Given(
															'an options object with passphrase set to "passphraseSource"',
															given.anOptionsObjectWithPassphraseSetToAndMessageSetTo,
															() => {
																Given(
																	'an error "Unknown data source type." occurs retrieving the inputs from their sources',
																	given.anErrorOccursRetrievingTheInputsFromTheirSources,
																	() => {
																		When(
																			'the action is called with the message, the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions,
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
																			'the action is called with the message, the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions,
																			() => {
																				Then(
																					'it should get the inputs from sources using the Vorpal instance',
																					then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																				);
																				Then(
																					'it should get the inputs from sources using the passphrase source without a repeating prompt',
																					then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt,
																				);
																				Then(
																					'it should not get the inputs from sources using the message source',
																					then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource,
																				);
																				Then(
																					'it should decrypt the message using the nonce, the passphrase and the sender public key',
																					then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey,
																				);
																				Then(
																					'it should resolve to the result of decrypting the message',
																					then.itShouldResolveToTheResultOfDecryptingTheMessage,
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
																			'the action is called with the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions,
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
																			'the action is called with the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions,
																			() => {
																				Then(
																					'it should get the inputs from sources using the Vorpal instance',
																					then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																				);
																				Then(
																					'it should get the inputs from sources using the passphrase source without a repeating prompt',
																					then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt,
																				);
																				Then(
																					'it should get the inputs from sources using the message source',
																					then.itShouldGetTheInputsFromSourcesWithoutARepeatingPassphrasePrompt,
																				);
																				Then(
																					'it should decrypt the message using the nonce, the passphrase and the sender public key',
																					then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey,
																				);
																				Then(
																					'it should resolve to the result of decrypting the message',
																					then.itShouldResolveToTheResultOfDecryptingTheMessage,
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
																			'the action is called with the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions,
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
																			'the action is called with the nonce, the sender public key and the options',
																			when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions,
																			() => {
																				Then(
																					'it should get the inputs from sources using the Vorpal instance',
																					then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																				);
																				Then(
																					'it should get the inputs from sources using the passphrase source without a repeating prompt',
																					then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt,
																				);
																				Then(
																					'it should get the inputs from sources using the message source',
																					then.itShouldGetTheInputsFromSourcesWithoutARepeatingPassphrasePrompt,
																				);
																				Then(
																					'it should decrypt the message using the nonce, the passphrase and the sender public key',
																					then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey,
																				);
																				Then(
																					'it should resolve to the result of decrypting the message',
																					then.itShouldResolveToTheResultOfDecryptingTheMessage,
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
				},
			);
		},
	);
});
