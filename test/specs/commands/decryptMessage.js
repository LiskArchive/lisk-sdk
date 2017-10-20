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
								describe('Given the passphrase is provided via the prompt', () => {
									beforeEach(given.thePassphraseIsProvidedViaThePrompt);
									describe('Given an empty options object', () => {
										beforeEach(given.anEmptyOptionsObject);
										describe('When the action is called with the nonce, the senderPublicKey and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should reject with message "No message was provided."', then.itShouldRejectWithMessage);
										});
										describe('When the action is called with the message, the nonce, the senderPublicKey and the options', () => {
											beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
											it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
											it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
											it('Then it should get the passphrase with a single prompt', then.itShouldGetThePassphraseWithASinglePrompt);
											it('Then it should get the data using the message argument', then.itShouldGetTheDataUsingTheMessageArgument);
											it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
											it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
										});
									});
									describe('Given an options object with message set to unknown source "xxx"', () => {
										beforeEach(given.anOptionsObjectWithMessageSetToUnknownSource);
										describe('When the action is called with the nonce, the senderPublicKey and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should reject with message "Unknown data source type. Must be one of `file`, or `stdin`."', then.itShouldRejectWithMessage);
										});
									});
									describe('Given an options object with message set to "file:/path/to/my/message.txt"', () => {
										beforeEach(given.anOptionsObjectWithMessageSetTo);
										describe('When the action is called with the nonce, the senderPublicKey and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
											it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
											it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
											it('Then it should get the passphrase with a single prompt', then.itShouldGetThePassphraseWithASinglePrompt);
											it('Then it should get the data using the message source', then.itShouldGetTheDataUsingTheMessageSource);
											it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
											it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
										});
									});
									describe('Given an options object with message set to "stdin"', () => {
										beforeEach(given.anOptionsObjectWithMessageSetTo);
										describe('Given the message is provided via stdin', () => {
											beforeEach(given.theMessageIsProvidedViaStdIn);
											describe('When the action is called with the nonce, the senderPublicKey and the options', () => {
												beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
												it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
												it('Then it should get the message from stdin', then.itShouldGetTheMessageFromStdIn);
												it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
												it('Then it should get the passphrase with a single prompt', then.itShouldGetThePassphraseWithASinglePrompt);
												it('Then it should get the data using the message from stdin', then.itShouldGetTheDataUsingTheMessageFromStdIn);
												it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
												it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
											});
										});
									});
								});
								describe('Given an options object with passphrase set to unknown source "xxx"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetToUnknownSource);
									describe('When the action is called with the message, the nonce, the senderPublicKey and the options', () => {
										beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
										it('Then it should reject with message "Unknown data source type. Must be one of `file`, or `stdin`."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given an options object with passphrase set to "file:/path/to/my/message.txt"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetTo);
									describe('When the action is called with the message, the nonce, the senderPublicKey and the options', () => {
										beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
										it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
										it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
										it('Then it should get the passphrase using the passphrase source', then.itShouldGetThePassphraseUsingThePassphraseSource);
										it('Then it should get the data using the message argument', then.itShouldGetTheDataUsingTheMessageArgument);
										it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
										it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
									});
								});
								describe('Given an options object with passphrase set to "stdin"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetTo);
									describe('Given the passphrase is provided via stdin', () => {
										beforeEach(given.thePassphraseIsProvidedViaStdIn);
										describe('When the action is called with the message, the nonce, the senderPublicKey and the options', () => {
											beforeEach(when.theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should get the passphrase from stdin', then.itShouldGetThePassphraseFromStdIn);
											it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
											it('Then it should get the passphrase using the passphrase from stdin', then.itShouldGetThePassphraseUsingThePassphraseFromStdIn);
											it('Then it should get the data using the message argument', then.itShouldGetTheDataUsingTheMessageArgument);
											it('Then it should decrypt the message using the nonce, the passphrase and the sender public key', then.itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey);
											it('Then it should resolve to the result of decrypting the message', then.itShouldResolveToTheResultOfDecryptingTheMessage);
										});
									});
								});
								describe('Given an options object with passphrase set to "stdin" and message set to "stdin"', () => {
									beforeEach(given.anOptionsObjectWithPassphraseSetToAndMessageSetTo);
									describe('Given the passphrase and the message are provided via stdin', () => {
										beforeEach(given.thePassphraseAndTheMessageAreProvidedViaStdIn);
										describe('When the action is called with the nonce, the senderPublicKey and the options', () => {
											beforeEach(when.theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions);
											it('Then it should get the passphrase from stdin', then.itShouldGetThePassphraseFromStdIn);
											it('Then it should get the message from stdin', then.itShouldGetTheMessageFromStdIn);
											it('Then it should get the passphrase using the passphrase from stdin', then.itShouldGetThePassphraseUsingThePassphraseFromStdIn);
											it('Then it should get the data using the message from stdin', then.itShouldGetTheDataUsingTheMessageFromStdIn);
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
