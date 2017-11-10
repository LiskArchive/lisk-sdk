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

describe('decrypt passphrase command', () => {
	beforeEach(() => {
		setUpInputStubs();
	});
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given a crypto instance has been initialised', () => {
			beforeEach(given.aCryptoInstanceHasBeenInitialised);
			describe('Given an action "decrypt passphrase"', () => {
				beforeEach(given.anAction);
				describe('Given an encrypted passphrase "4f9ec37e5a6ff3137a89aaa1b662acc428dc33c89074e36a84b5ef5acf5efaf2107e8ee0a135aca3763f0cdee8de1d213dcd16a9b7d6feae50738ced97eddf4ba315bf49a8492e4ff065a7bd91358bde" with an IV "7bc5fe1d70faa0e5b3b88de42d26e7ec"', () => {
					beforeEach(given.anEncryptedPassphraseWithAnIV);
					describe('Given a password "testing123"', () => {
						beforeEach(given.aPassword);
						describe('Given an empty options object', () => {
							beforeEach(given.anEmptyOptionsObject);
							describe('When the action is called with the IV and the options', () => {
								beforeEach(when.theActionIsCalledWithTheIVAndTheOptions);
								it('Then it should reject with message "No encrypted passphrase was provided."', then.itShouldRejectWithMessage);
							});
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the IV, the encrypted passphrase and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVTheEncryptedPassphraseAndTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the password can be retrieved from its source', () => {
								beforeEach(given.thePasswordCanBeRetrievedFromItsSource);
								describe('When the action is called with the IV, the encrypted passphrase and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVTheEncryptedPassphraseAndTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the password source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt);
									it('Then it should not get the inputs from sources using the encrypted passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheEncryptedPassphraseSource);
									it('Then it should decrypt the passphrase using the IV and the password', then.itShouldDecryptThePassphraseUsingTheIVAndThePassword);
									it('Then it should resolve to the result of decrypting the passphrase', then.itShouldResolveToTheResultOfDecryptingThePassphrase);
								});
							});
						});
						describe('Given an options object with password set to "passwordSource"', () => {
							beforeEach(given.anOptionsObjectWithPasswordSetTo);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the IV, the encrypted passphrase and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVTheEncryptedPassphraseAndTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the password can be retrieved from its source', () => {
								beforeEach(given.thePasswordCanBeRetrievedFromItsSource);
								describe('When the action is called with the IV, the encrypted passphrase and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVTheEncryptedPassphraseAndTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the password source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt);
									it('Then it should not get the inputs from sources using the encrypted passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheEncryptedPassphraseSource);
									it('Then it should decrypt the passphrase using the IV and the password', then.itShouldDecryptThePassphraseUsingTheIVAndThePassword);
									it('Then it should resolve to the result of decrypting the passphrase', then.itShouldResolveToTheResultOfDecryptingThePassphrase);
								});
							});
						});
						describe('Given an options object with passphrase set to "passphraseSource"', () => {
							beforeEach(given.anOptionsObjectWithPassphraseSetTo);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the IV, the encrypted passphrase and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVTheEncryptedPassphraseAndTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the password and encrypted passphrase can be retrieved from their sources', () => {
								beforeEach(given.thePasswordAndEncryptedPassphraseCanBeRetrievedFromTheirSources);
								describe('When the action is called with the IV and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVAndTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the password source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt);
									it('Then it should get the inputs from sources using the encrypted passphrase source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheEncryptedPassphraseSourceWithoutARepeatingPrompt);
									it('Then it should decrypt the passphrase using the IV and the password', then.itShouldDecryptThePassphraseUsingTheIVAndThePassword);
									it('Then it should resolve to the result of decrypting the passphrase', then.itShouldResolveToTheResultOfDecryptingThePassphrase);
								});
							});
						});
						describe('Given an options object with passphrase set to "passphraseSource" and password set to "passwordSource"', () => {
							beforeEach(given.anOptionsObjectWithPassphraseSetToAndPasswordSetTo);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the IV, the encrypted passphrase and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVTheEncryptedPassphraseAndTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the password and encrypted passphrase can be retrieved from their sources', () => {
								beforeEach(given.thePasswordAndEncryptedPassphraseCanBeRetrievedFromTheirSources);
								describe('When the action is called with the IV and the options', () => {
									beforeEach(when.theActionIsCalledWithTheIVAndTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the password source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt);
									it('Then it should get the inputs from sources using the encrypted passphrase source without a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheEncryptedPassphraseSourceWithoutARepeatingPrompt);
									it('Then it should decrypt the passphrase using the IV and the password', then.itShouldDecryptThePassphraseUsingTheIVAndThePassword);
									it('Then it should resolve to the result of decrypting the passphrase', then.itShouldResolveToTheResultOfDecryptingThePassphrase);
								});
							});
						});
					});
				});
			});
		});
	});
});
