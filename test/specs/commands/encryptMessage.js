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

describe('encrypt message command', () => {
	beforeEach(() => {
		setUpInputStubs();
	});
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given a crypto instance has been initialised', () => {
			beforeEach(given.aCryptoInstanceHasBeenInitialised);
			describe('Given an action "encrypt message"', () => {
				beforeEach(given.anAction);
				describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
					beforeEach(given.aPassphrase);
					describe('Given a recipient "31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25"', () => {
						beforeEach(given.aRecipient);
						describe('Given a message "Some secret message\nthat spans multiple\n lines"', () => {
							beforeEach(given.aMessage);
							describe('Given the passphrase is provided via the prompt', () => {
								beforeEach(given.thePassphraseIsProvidedViaThePrompt);
								describe('Given an empty options object', () => {
									beforeEach(given.anEmptyOptionsObject);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should reject with message "No message was provided."', then.itShouldRejectWithMessage);
									});
									describe('When the action is called with the recipient, the message and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
										it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
										it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
										it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
										it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
										it('Then it should get the data using the message argument', then.itShouldGetTheDataUsingTheMessageArgument);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
									});
								});
								describe('Given an options object with message set to unknown source "xxx"', () => {
									beforeEach(given.anOptionsObjectWithMessageSetToUnknownSource);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should reject with message "Unknown data source type. Must be one of `file`, or `stdin`."', then.itShouldRejectWithMessage);
									});
								});
								describe('Given an options object with message set to "file:/path/to/my/message.txt"', () => {
									beforeEach(given.anOptionsObjectWithMessageSetTo);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
										it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
										it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
										it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
										it('Then it should get the data using the message source', then.itShouldGetTheDataUsingTheMessageSource);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
									});
								});
								describe('Given an options object with message set to "stdin"', () => {
									beforeEach(given.anOptionsObjectWithMessageSetTo);
									describe('Given the message is provided via stdin', () => {
										beforeEach(given.theMessageIsProvidedViaStdIn);
										describe('When the action is called with the recipient and the options', () => {
											beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
											it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
											it('Then it should get the message from stdin', then.itShouldGetTheMessageFromStdIn);
											it('Then it should get the passphrase using the vorpal instance', then.itShouldGetThePassphraseUsingTheVorpalInstance);
											it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
											it('Then it should get the data using the message from stdin', then.itShouldGetTheDataUsingTheMessageFromStdIn);
											it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
											it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
										});
									});
								});
							});
							describe('Given an options object with passphrase set to unknown source "xxx"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetToUnknownSource);
								describe('When the action is called with the recipient, the message and the options', () => {
									beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
									it('Then it should reject with message "Unknown passphrase source type. Must be one of `file`, or `stdin`."', then.itShouldRejectWithMessage);
								});
							});
							describe('Given an options object with passphrase set to "file:/path/to/my/message.txt"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetTo);
								describe('When the action is called with the recipient, the message and the options', () => {
									beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
									it('Then it should not get the passphrase from stdin', then.itShouldNotGetThePassphraseFromStdIn);
									it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
									it('Then it should get the passphrase using the passphrase source', then.itShouldGetThePassphraseUsingThePassphraseSource);
									it('Then it should get the data using the message argument', then.itShouldGetTheDataUsingTheMessageArgument);
									it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
									it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
								});
							});
							describe('Given an options object with passphrase set to "stdin"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetTo);
								describe('Given the passphrase is provided via stdin', () => {
									beforeEach(given.thePassphraseIsProvidedViaStdIn);
									describe('When the action is called with the recipient, the message and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
										it('Then it should get the passphrase from stdin', then.itShouldGetThePassphraseFromStdIn);
										it('Then it should not get the message from stdin', then.itShouldNotGetTheMessageFromStdIn);
										it('Then it should get the passphrase using the passphrase from stdin', then.itShouldGetThePassphraseUsingThePassphraseFromStdIn);
										it('Then it should get the data using the message argument', then.itShouldGetTheDataUsingTheMessageArgument);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
									});
								});
							});
							describe('Given an options object with passphrase set to "stdin" and message set to "stdin"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetToAndMessageSetTo);
								describe('Given the passphrase and the message are provided via stdin', () => {
									beforeEach(given.thePassphraseAndTheMessageAreProvidedViaStdIn);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should get the passphrase from stdin', then.itShouldGetThePassphraseFromStdIn);
										it('Then it should get the message from stdin', then.itShouldGetTheMessageFromStdIn);
										it('Then it should get the passphrase using the passphrase from stdin', then.itShouldGetThePassphraseUsingThePassphraseFromStdIn);
										it('Then it should get the data using the message from stdin', then.itShouldGetTheDataUsingTheMessageFromStdIn);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
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
