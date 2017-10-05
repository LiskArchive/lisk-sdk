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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('Crypto class', () => {
	describe('Given a crypto instance', () => {
		beforeEach(given.aCryptoInstance);

		it('Then the crypto instance should have name "Crypto"', then.theCryptoInstanceShouldHaveName);
		it('Then the crypto instance should have lisk-js crypto as a property', then.theCryptoInstanceShouldHaveLiskJSAsAProperty);

		describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with private key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"', () => {
			beforeEach(given.aPassphraseWithPrivateKeyAndPublicKey);

			describe('#getKeys', () => {
				describe('When no error occurs attempting to get the keys for the passphrase', () => {
					beforeEach(when.noErrorOccursAttemptingToGetTheKeysForThePassphrase);

					it('Then lisk-js crypto should be used to get the keys for the passphrase', then.liskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase);
					it('Then the keys should be returned', then.theKeysShouldBeReturned);
				});

				describe('When an error occurs attempting to get the keys for the passphrase', () => {
					beforeEach(when.anErrorOccursAttemptingToGetTheKeysForThePassphrase);

					it('Then the error response should be handled', then.theErrorResponseShouldBeHandled);
				});
			});

			describe('Given a password "testing123"', () => {
				beforeEach(given.aPassword);

				describe('Given an encrypted passphrase "4f9ec37e5a6ff3137a89aaa1b662acc428dc33c89074e36a84b5ef5acf5efaf2107e8ee0a135aca3763f0cdee8de1d213dcd16a9b7d6feae50738ced97eddf4ba315bf49a8492e4ff065a7bd91358bde" with an IV "7bc5fe1d70faa0e5b3b88de42d26e7ec"', () => {
					beforeEach(given.anEncryptedPassphraseWithAnIV);

					describe('#encryptPassphrase', () => {
						describe('When no error occurs attempting to encrypt the passphrase with the password', () => {
							beforeEach(when.noErrorOccursAttemptingToEncryptThePassphraseWithThePassword);

							it('Then lisk-js crypto should be used to get the encrypted passphrase and IV', then.liskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV);
							it('Then the encrypted passphrase and IV should be returned', then.theEncryptedPassphraseAndIVShouldBeReturned);
						});
						describe('When an error occurs attempting to encrypt the passphrase with the password', () => {
							beforeEach(when.anErrorOccursAttemptingToEncryptThePassphraseWithThePassword);

							it('Then the error response should be handled', then.theErrorResponseShouldBeHandled);
						});
					});

					describe('#decryptPassphrase', () => {
						describe('When no error occurs attempting to decrypt the passphrase with the password', () => {
							beforeEach(when.noErrorOccursAttemptingToDecryptThePassphraseWithThePassword);

							it('Then lisk-js crypto should be used to get the decrypted passphrase', then.liskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase);
							it('Then the decrypted passphrase should be returned', then.theDecryptedPassphraseShouldBeReturned);
						});
						describe('When an error occurs attempting to decrypt the passphrase with the password', () => {
							beforeEach(when.anErrorOccursAttemptingToDecryptThePassphraseWithThePassword);

							it('Then the error response should be handled', then.theErrorResponseShouldBeHandled);
						});
					});
				});
			});

			describe('Given a message "Hello Lisker"', () => {
				beforeEach(given.aMessage);

				describe('Given a recipient passphrase "polar save winner any focus slide runway ghost finish invite regret laugh" with private key "08595f178e7470ad2cbe054b29f60311a0f808be969cde6c274819580a428dcd31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25" and public key "31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25"', () => {
					beforeEach(given.aRecipientPassphraseWithPrivateKeyAndPublicKey);

					describe('Given an encrypted message "76778326f67b338032e888c6d9482f76ae27662716778d5d6816ef4f" with a nonce "b0601b8e58302d329d9b6e7e7fc70c929a159bb12d793a48"', () => {
						beforeEach(given.anEncryptedMessageWithANonce);

						describe('#encryptMessage', () => {
							describe('When no error occurs attempting to encrypt the message for the recipient using the passphrase', () => {
								beforeEach(when.noErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase);

								it('Then lisk-js crypto should be used to get the encrypted message and nonce', then.liskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce);
								it('Then the encrypted message and nonce should be returned', then.theEncryptedMessageAndNonceShouldBeReturned);
							});

							describe('When an error occurs attempting to encrypt the message for the recipient using the passphrase', () => {
								beforeEach(when.anErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase);

								it('Then the error response should be handled', then.theErrorResponseShouldBeHandled);
							});
						});

						describe('#decryptMessage', () => {
							describe('When no error occurs attempting to decrypt the message using the recipient passphrase and sender public key', () => {
								beforeEach(when.noErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey);

								it('Then lisk-js crypto should be used to get the decrypted message', then.liskJSCryptoShouldBeUsedToGetTheDecryptedMessage);
								it('Then the decrypted message should be returned', then.theDecryptedMessageShouldBeReturned);
							});

							describe('When an error occurs attempting to decrypt the message using the recipient passphrase and sender public key', () => {
								beforeEach(when.anErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey);

								it('Then the error response should be handled', then.theErrorResponseShouldBeHandled);
							});
						});
					});
				});
			});
		});
	});
});
