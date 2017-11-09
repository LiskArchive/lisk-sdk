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
						describe('Given an empty options object', () => {
							beforeEach(given.anEmptyOptionsObject);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the passphrase and password can be retrieved from their sources', () => {
								beforeEach(given.thePassphraseAndPasswordCanBeRetrievedFromTheirSources);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
									it('Then it should get the inputs from sources using the password source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt);
									it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
									it('Then it should resolve to the result of encrypting the passphrase', then.itShouldResolveToTheResultOfEncryptingThePassphrase);
								});
							});
						});
						describe('Given an options object with output-public-key set to boolean true', () => {
							beforeEach(given.anOptionsObjectWithOutputPublicKeySetToBoolean);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the passphrase and password can be retrieved from their sources', () => {
								beforeEach(given.thePassphraseAndPasswordCanBeRetrievedFromTheirSources);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
									it('Then it should get the inputs from sources using the password source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt);
									it('Then it should encrypt the passphrase using the password', then.itShouldEncryptThePassphraseUsingThePassword);
									it('Then it should resolve to the result of encrypting the passphrase combined with the public key', then.itShouldResolveToTheResultOfEncryptingThePassphraseCombinedWithThePublicKey);
								});
							});
						});
						describe('Given an options object with passphrase set to "passphraseSource" and password set to "passwordSource"', () => {
							beforeEach(given.anOptionsObjectWithPassphraseSetToAndPasswordSetTo);
							describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
								beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
								});
							});
							describe('Given the passphrase and password can be retrieved from their sources', () => {
								beforeEach(given.thePassphraseAndPasswordCanBeRetrievedFromTheirSources);
								describe('When the action is called with the options', () => {
									beforeEach(when.theActionIsCalledWithTheOptions);
									it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
									it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
									it('Then it should get the inputs from sources using the password source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt);
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
