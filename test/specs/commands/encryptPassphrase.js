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

describe('encrypt passphrase command', () => {
	beforeEach(() => {
		setUpInputStubs();
	});
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given a crypto instance has been initialised', () => {
			beforeEach(given.aCryptoInstanceHasBeenInitialised);
			describe('Given an action "encrypt passphrase"', () => {
				beforeEach(given.anAction);
				describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"', () => {
					beforeEach(given.aPassphraseWithPublicKey);
					describe('Given a password "testing123"', () => {
						beforeEach(given.aPassword);
						describe('Given the passphrase is provided via the prompt', () => {
							beforeEach(given.thePassphraseIsProvidedViaThePrompt);
							describe('Given the password is provided via the prompt', () => {
								beforeEach(given.thePasswordIsProvidedViaThePrompt);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('When the action is called with the options', () => {
										beforeEach(when.theActionIsCalledWithTheOptions);
										it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
										it('Then it should not get the password from stdin', then.itShouldNotGetThePasswordFromStdIn);
										it('Then it should get the passphrase using the Vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
										it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
										it('Then it should get the password using the Vorpal instance', then.itShouldGetThePasswordUsingTheVorpalInstance);
										it('Then it should get the password with a repeated prompt', then.itShouldGetThePasswordWithARepeatedPrompt);
										it('Then it should not get the keys for the passphrase', then.itShouldNotGetTheKeysForThePassphrase);
										it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
										it('Then it should resolve to the result of encrypting the passphrase', then.itShouldResolveToTheResultOfEncryptingThePassphrase);
									});
								});
								describe('Given an options object with output-public-key set to boolean true', () => {
									beforeEach(given.anOptionsObjectWithOutputPublicKeySetToBoolean);
									describe('When the action is called with the options', () => {
										beforeEach(when.theActionIsCalledWithTheOptions);
										it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
										it('Then it should not get the password from stdin', then.itShouldNotGetThePasswordFromStdIn);
										it('Then it should get the passphrase using the Vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
										it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
										it('Then it should get the password using the Vorpal instance', then.itShouldGetThePasswordUsingTheVorpalInstance);
										it('Then it should get the password with a repeated prompt', then.itShouldGetThePasswordWithARepeatedPrompt);
										it('Then it should get the keys for the passphrase', then.itShouldGetTheKeysForThePassphrase);
										it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
										it('Then it should resolve to the result of encrypting the passphrase combined with the public key', then.itShouldResolveToTheResultOfEncryptingThePassphraseCombinedWithThePublicKey);
									});
								});
							});
							describe('Given an options object with password set to unknown source "xxx"', () => {
								beforeEach(given.anOptionsObjectWithPasswordSetToUnknownSource);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should reject with message "Unknown data source type. Must be one of `file`, or `stdin`."', then.itShouldRejectWithMessage);
								});
							});
							describe('Given an options object with password set to "file:/path/to/my/password.txt"', () => {
								beforeEach(given.anOptionsObjectWithPasswordSetTo);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
									it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
									it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
									it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
									it('Then it should get the password using the password source', then.itShouldGetThePasswordUsingThePasswordSource);
									it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
									it('Then it should resolve to the result of encrypting the passphrase', then.itShouldResolveToTheResultOfEncryptingThePassphrase);
								});
							});
							describe('Given an options object with password set to "stdin"', () => {
								beforeEach(given.anOptionsObjectWithPasswordSetTo);
								describe('Given the password is provided via stdin', () => {
									beforeEach(given.thePasswordIsProvidedViaStdIn);
									describe('When the action is called with the options', () => {
										beforeEach(when.theActionIsCalledWithTheOptions);
										it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
										it('Then it should get the password from stdin', then.itShouldGetThePasswordFromStdIn);
										it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
										it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
										it('Then it should get the password using the password from stdin', then.itShouldGetThePasswordUsingThePasswordFromStdIn);
										it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
										it('Then it should resolve to the result of encrypting the passphrase', then.itShouldResolveToTheResultOfEncryptingThePassphrase);
									});
								});
							});
						});
						describe('Given the password is provided via the prompt', () => {
							beforeEach(given.thePasswordIsProvidedViaThePrompt);
							describe('Given an options object with passphrase set to unknown source "xxx"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetToUnknownSource);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should reject with message "Unknown data source type. Must be one of `file`, or `stdin`."', then.itShouldRejectWithMessage);
								});
							});
							describe('Given an options object with passphrase set to "file:/path/to/my/message.txt"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetTo);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
									it('Then it should not get the password from stdin', then.itShouldNotGetThePasswordFromStdIn);
									it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
									it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
									it('Then it should get the password using the Vorpal instance', then.itShouldGetThePasswordUsingTheVorpalInstance);
									it('Then it should get the password with a repeated prompt', then.itShouldGetThePasswordWithARepeatedPrompt);
									it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
									it('Then it should resolve to the result of encrypting the passphrase', then.itShouldResolveToTheResultOfEncryptingThePassphrase);
								});
							});
							describe('Given an options object with passphrase set to "stdin"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetTo);
								describe('Given the passphrase is provided via stdin', () => {
									beforeEach(given.thePassphraseIsProvidedViaStdIn);
									describe('When the action is called with the options', () => {
										beforeEach(when.theActionIsCalledWithTheOptions);
										it('Then it should get the passphrase from stdin', then.itShouldGetThePassphraseFromStdIn);
										it('Then it should not get the password from stdin', then.itShouldNotGetThePasswordFromStdIn);
										it('Then it should get the passphrase using the passphrase from stdin', then.itShouldGetThePassphraseUsingThePassphraseFromStdIn);
										it('Then it should get the password using the Vorpal instance', then.itShouldGetThePasswordUsingTheVorpalInstance);
										it('Then it should get the password with a repeated prompt', then.itShouldGetThePasswordWithARepeatedPrompt);
										it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
										it('Then it should resolve to the result of encrypting the passphrase', then.itShouldResolveToTheResultOfEncryptingThePassphrase);
									});
								});
							});
						});
						describe('Given an options object with passphrase set to "stdin" and password set to "stdin"', () => {
							beforeEach(given.anOptionsObjectWithPassphraseSetToAndPasswordSetTo);
							describe('Given the passphrase and the password are provided via stdin', () => {
								beforeEach(given.thePassphraseAndThePasswordAreProvidedViaStdIn);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should get the passphrase from stdin', then.itShouldGetThePassphraseFromStdIn);
									it('Then it should get the password from stdin', then.itShouldGetThePasswordFromStdIn);
									it('Then it should get the passphrase using the passphrase from stdin', then.itShouldGetThePassphraseUsingThePassphraseFromStdIn);
									it('Then it should get the password using the password from stdin', then.itShouldGetThePasswordUsingThePasswordFromStdIn);
									it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
									it('Then it should resolve to the result of encrypting the passphrase', then.itShouldResolveToTheResultOfEncryptingThePassphrase);
								});
							});
						});
					});
				});
			});
		});
	});
});
