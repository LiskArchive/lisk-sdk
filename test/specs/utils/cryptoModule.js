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
import {
	givenACryptoInstance,
	givenAPassphraseWithPrivateKeyAndPublicKey,
	givenAPassword,
	givenAnEncryptedPassphraseWithAnIV,
	givenAMessage,
	givenARecipientPassphraseWithPrivateKeyAndPublicKey,
	givenAnEncryptedMessageWithANonce,
} from '../../steps/1_given';

import {
	whenNoErrorOccursAttemptingToGetTheKeysForThePassphrase,
	whenAnErrorOccursAttemptingToGetTheKeysForThePassphrase,
	whenNoErrorOccursAttemptingToEncryptThePassphraseWithThePassword,
	whenAnErrorOccursAttemptingToEncryptThePassphraseWithThePassword,
	whenNoErrorOccursAttemptingToDecryptThePassphraseWithThePassword,
	whenAnErrorOccursAttemptingToDecryptThePassphraseWithThePassword,
	whenNoErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase,
	whenAnErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase,
	whenNoErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey,
	whenAnErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey,
} from '../../steps/2_when';

import {
	thenTheCryptoInstanceShouldHaveName,
	thenTheCryptoInstanceShouldHaveLiskJSAsAProperty,
	thenLiskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase,
	thenTheKeysShouldBeReturned,
	thenTheErrorResponseShouldBeHandled,
	thenLiskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV,
	thenTheEncryptedPassphraseAndIVShouldBeReturned,
	thenLiskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase,
	thenTheDecryptedPassphraseShouldBeReturned,
	thenLiskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce,
	thenTheEncryptedMessageAndNonceShouldBeReturned,
	thenLiskJSCryptoShouldBeUsedToGetTheDecryptedMessage,
	thenTheDecryptedMessageShouldBeReturned,
} from '../../steps/3_then';

describe('Crypto class', () => {
	describe('Given a crypto instance', () => {
		beforeEach(givenACryptoInstance);

		it('Then the crypto instance should have name "Crypto"', thenTheCryptoInstanceShouldHaveName);
		it('Then the crypto instance should have lisk-js crypto as a property', thenTheCryptoInstanceShouldHaveLiskJSAsAProperty);

		describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with private key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"', () => {
			beforeEach(givenAPassphraseWithPrivateKeyAndPublicKey);

			describe('#getKeys', () => {
				describe('When no error occurs attempting to get the keys for the passphrase', () => {
					beforeEach(whenNoErrorOccursAttemptingToGetTheKeysForThePassphrase);

					it('Then lisk-js crypto should be used to get the keys for the passphrase', thenLiskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase);
					it('Then the keys should be returned', thenTheKeysShouldBeReturned);
				});

				describe('When an error occurs attempting to get the keys for the passphrase', () => {
					beforeEach(whenAnErrorOccursAttemptingToGetTheKeysForThePassphrase);

					it('Then the error response should be handled', thenTheErrorResponseShouldBeHandled);
				});
			});

			describe('Given a password "testing123"', () => {
				beforeEach(givenAPassword);

				describe('Given an encrypted passphrase "4f9ec37e5a6ff3137a89aaa1b662acc428dc33c89074e36a84b5ef5acf5efaf2107e8ee0a135aca3763f0cdee8de1d213dcd16a9b7d6feae50738ced97eddf4ba315bf49a8492e4ff065a7bd91358bde" with an IV "7bc5fe1d70faa0e5b3b88de42d26e7ec"', () => {
					beforeEach(givenAnEncryptedPassphraseWithAnIV);

					describe('#encryptPassphrase', () => {
						describe('When no error occurs attempting to encrypt the passphrase with the password', () => {
							beforeEach(whenNoErrorOccursAttemptingToEncryptThePassphraseWithThePassword);

							it('Then lisk-js crypto should be used to get the encrypted passphrase and IV', thenLiskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV);
							it('Then the encrypted passphrase and IV should be returned', thenTheEncryptedPassphraseAndIVShouldBeReturned);
						});
						describe('When an error occurs attempting to encrypt the passphrase with the password', () => {
							beforeEach(whenAnErrorOccursAttemptingToEncryptThePassphraseWithThePassword);

							it('Then the error response should be handled', thenTheErrorResponseShouldBeHandled);
						});
					});

					describe('#decryptPassphrase', () => {
						describe('When no error occurs attempting to decrypt the passphrase with the password', () => {
							beforeEach(whenNoErrorOccursAttemptingToDecryptThePassphraseWithThePassword);

							it('Then lisk-js crypto should be used to get the decrypted passphrase', thenLiskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase);
							it('Then the decrypted passphrase should be returned', thenTheDecryptedPassphraseShouldBeReturned);
						});
						describe('When an error occurs attempting to decrypt the passphrase with the password', () => {
							beforeEach(whenAnErrorOccursAttemptingToDecryptThePassphraseWithThePassword);

							it('Then the error response should be handled', thenTheErrorResponseShouldBeHandled);
						});
					});
				});
			});

			describe('Given a message "Hello Lisker"', () => {
				beforeEach(givenAMessage);

				describe('Given a recipient passphrase "polar save winner any focus slide runway ghost finish invite regret laugh" with private key "08595f178e7470ad2cbe054b29f60311a0f808be969cde6c274819580a428dcd31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25" and public key "31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25"', () => {
					beforeEach(givenARecipientPassphraseWithPrivateKeyAndPublicKey);

					describe('Given an encrypted message "76778326f67b338032e888c6d9482f76ae27662716778d5d6816ef4f" with a nonce "b0601b8e58302d329d9b6e7e7fc70c929a159bb12d793a48"', () => {
						beforeEach(givenAnEncryptedMessageWithANonce);

						describe('#encryptMessage', () => {
							describe('When no error occurs attempting to encrypt the message for the recipient using the passphrase', () => {
								beforeEach(whenNoErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase);

								it('Then lisk-js crypto should be used to get the encrypted message and nonce', thenLiskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce);
								it('Then the encrypted message and nonce should be returned', thenTheEncryptedMessageAndNonceShouldBeReturned);
							});

							describe('When an error occurs attempting to encrypt the message for the recipient using the passphrase', () => {
								beforeEach(whenAnErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase);

								it('Then the error response should be handled', thenTheErrorResponseShouldBeHandled);
							});
						});

						describe('#decryptMessage', () => {
							describe('When no error occurs attempting to decrypt the message using the recipient passphrase and sender public key', () => {
								beforeEach(whenNoErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey);

								it('Then lisk-js crypto should be used to get the decrypted message', thenLiskJSCryptoShouldBeUsedToGetTheDecryptedMessage);
								it('Then the decrypted message should be returned', thenTheDecryptedMessageShouldBeReturned);
							});

							describe('When an error occurs attempting to decrypt the message using the recipient passphrase and sender public key', () => {
								beforeEach(whenAnErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey);

								it('Then the error response should be handled', thenTheErrorResponseShouldBeHandled);
							});
						});
					});
				});
			});
		});
	});
});
