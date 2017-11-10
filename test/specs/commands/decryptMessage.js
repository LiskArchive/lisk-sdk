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
import { setUpInputStubs } from '../../steps/utils';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('decrypt message command', () => {
	beforeEach(() => {
		setUpInputStubs();
	});
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given a crypto instance has been initialised', () => {
			beforeEach(given.aCryptoInstanceHasBeenInitialised);
			describe('Given an action "decrypt message"', () => {
				beforeEach(given.anAction);
				describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
					beforeEach(given.aPassphrase);
					describe('Given an encrypted message "4728715ed4463a37d8e90720a27377f04a84911b95520c2582a8b6da"', () => {
						beforeEach(given.anEncryptedMessage);
						describe('Given a nonce "682be05eeb73a794163b5584cac6b33769c2abd867459cae"', () => {
							beforeEach(given.aNonce);
							describe('Given a sender public key "38433137692948be1c05bbae686c9c850d3c8d9c52c1aebb4a7c1d5dd6d010d7"', () => {
								beforeEach(given.aSenderPublicKey);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('When the action is called with the nonce, the sender public key and the options', () => {
										beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
										it('Then it should reject with message "No message was provided."', then.itShouldRejectWithMessage);
									});
									describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
										beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
										describe('When the action is called with the message, the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
									describe('Given the passphrase can be retrieved from its source', () => {
										beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
										describe('When the action is called with the message, the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											it('Then it should get the inputs from sources using the passphrase source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt);
											it('Then it should not get the inputs from sources using the message source', then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource);
											it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
											it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
										});
									});
								});
								describe('Given an options object with passphrase set to "passphraseSource"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetToAndMessageSetTo);
									describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
										beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
										describe('When the action is called with the message, the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
									describe('Given the passphrase can be retrieved from its source', () => {
										beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
										describe('When the action is called with the message, the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											it('Then it should get the inputs from sources using the passphrase source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt);
											it('Then it should not get the inputs from sources using the message source', then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource);
											it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
											it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
										});
									});
								});
								describe('Given an options object with message set to "messageSource"', () => {
									beforeEach(given.anOptionsObjectWithMessageSetTo);
									describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
										beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
										describe('When the action is called with the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
									describe('Given the passphrase and message can be retrieved from their sources', () => {
										beforeEach(given.thePassphraseAndMessageCanBeRetrievedFromTheirSources);
										describe('When the action is called with the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											it('Then it should get the inputs from sources using the passphrase source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt);
											it('Then it should get the inputs from sources using the message source', then.itShouldGetTheInputsFromSourcesWithoutARepeatingPassphrasePrompt);
											it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
											it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
										});
									});
								});
								describe('Given an options object with passphrase set to "passphraseSource" and message set to "messageSource"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetToAndMessageSetTo);
									describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
										beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
										describe('When the action is called with the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
									describe('Given the passphrase and message can be retrieved from their sources', () => {
										beforeEach(given.thePassphraseAndMessageCanBeRetrievedFromTheirSources);
										describe('When the action is called with the nonce, the sender public key and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											it('Then it should get the inputs from sources using the passphrase source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt);
											it('Then it should get the inputs from sources using the message source', then.itShouldGetTheInputsFromSourcesWithoutARepeatingPassphrasePrompt);
											it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
											it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
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
