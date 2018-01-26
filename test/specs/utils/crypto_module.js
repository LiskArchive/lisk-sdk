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
import { setUpUtilCrypto } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('Crypto class', () => {
	beforeEach(setUpUtilCrypto);
	Given('a crypto instance', given.aCryptoInstance, () => {
		Then(
			'the crypto instance should have name "Crypto"',
			then.theCryptoInstanceShouldHaveName,
		);
		Then(
			'the crypto instance should have lisk-js crypto as a property',
			then.theCryptoInstanceShouldHaveLiskJSAsAProperty,
		);
		Given(
			'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with private key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and address "2167422481642255385L"',
			given.aPassphraseWithPrivateKeyAndPublicKeyAndAddress,
			() => {
				describe('#getKeys', () => {
					When(
						'no error occurs attempting to get the keys for the passphrase',
						when.noErrorOccursAttemptingToGetTheKeysForThePassphrase,
						() => {
							Then(
								'lisk-js crypto should be used to get the keys for the passphrase',
								then.liskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase,
							);
							Then('the keys should be returned', then.theKeysShouldBeReturned);
						},
					);
					When(
						'an error occurs attempting to get the keys for the passphrase',
						when.anErrorOccursAttemptingToGetTheKeysForThePassphrase,
						() => {
							Then(
								'the error response should be handled',
								then.theErrorResponseShouldBeHandled,
							);
						},
					);
				});
				describe('#getAddressFromPublicKey', () => {
					When(
						'no error occurs attempting to get the address from the public key',
						when.noErrorOccursAttemptingToGetTheAddressFromThePublicKey,
						() => {
							Then(
								'lisk-js crypto should be used to get the address from the public key',
								then.liskJSCryptoShouldBeUsedToGetTheAddressFromThePublicKey,
							);
							Then(
								'it should return an object with the address',
								then.itShouldReturnAnObjectWithTheAddress,
							);
						},
					);
					When(
						'an error occurs attempting to get the address from the public key',
						when.anErrorOccursAttemptingToGetTheAddressFromThePublicKey,
						() => {
							Then(
								'lisk-js crypto should be used to get the address from the public key',
								then.liskJSCryptoShouldBeUsedToGetTheAddressFromThePublicKey,
							);
							Then(
								'the error response should be handled',
								then.theErrorResponseShouldBeHandled,
							);
						},
					);
				});
				Given('a password "testing123"', given.aPassword, () => {
					Given(
						'an encrypted passphrase "4f9ec37e5a6ff3137a89aaa1b662acc428dc33c89074e36a84b5ef5acf5efaf2107e8ee0a135aca3763f0cdee8de1d213dcd16a9b7d6feae50738ced97eddf4ba315bf49a8492e4ff065a7bd91358bde" with an IV "7bc5fe1d70faa0e5b3b88de42d26e7ec"',
						given.anEncryptedPassphraseWithAnIV,
						() => {
							describe('#encryptPassphrase', () => {
								When(
									'no error occurs attempting to encrypt the passphrase with the password',
									when.noErrorOccursAttemptingToEncryptThePassphraseWithThePassword,
									() => {
										Then(
											'lisk-js crypto should be used to get the encrypted passphrase and IV',
											then.liskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV,
										);
										Then(
											'the encrypted passphrase and IV should be returned',
											then.theEncryptedPassphraseAndIVShouldBeReturned,
										);
									},
								);
								When(
									'an error occurs attempting to encrypt the passphrase with the password',
									when.anErrorOccursAttemptingToEncryptThePassphraseWithThePassword,
									() => {
										Then(
											'the error response should be handled',
											then.theErrorResponseShouldBeHandled,
										);
									},
								);
							});
							describe('#decryptPassphrase', () => {
								When(
									'no error occurs attempting to decrypt the passphrase with the password',
									when.noErrorOccursAttemptingToDecryptThePassphraseWithThePassword,
									() => {
										Then(
											'lisk-js crypto should be used to get the decrypted passphrase',
											then.liskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase,
										);
										Then(
											'the decrypted passphrase should be returned',
											then.theDecryptedPassphraseShouldBeReturned,
										);
									},
								);
								When(
									'an error occurs attempting to decrypt the passphrase with the password',
									when.anErrorOccursAttemptingToDecryptThePassphraseWithThePassword,
									() => {
										Then(
											'the error response should be handled',
											then.theErrorResponseShouldBeHandled,
										);
									},
								);
							});
						},
					);
				});
				Given('a message "Hello Lisker"', given.aMessage, () => {
					describe('#signMessage', () => {
						describe('Given the message under the passphrase has signature "H+9koLx4AZoEupc1z5TBQDaDkI9KQu1QDPXWXxzVvhaXGDi/2BD0qypVJu596CrZ+XHuUAdx2wLZgyN/ZfqfAQ=="', () => {
							beforeEach(given.theMessageUnderThePassphraseHasSignature);
							describe('When no error occurs attempting to sign the message using the passphrase', () => {
								beforeEach(
									when.noErrorOccursAttemptingToSignTheMessageUsingThePassphrase,
								);
								it(
									'Then lisk-js crypto should be used to sign the message',
									then.liskJSCryptoShouldBeUsedToSignTheMessage,
								);
								it(
									'Then the signature should be returned',
									then.theSignatureShouldBeReturned,
								);
							});
							describe('When an error occurs attempting to sign the message using the passphrase', () => {
								beforeEach(
									when.anErrorOccursAttemptingToSignTheMessageUsingThePassphrase,
								);
								it(
									'Then the error response should be handled',
									then.theErrorResponseShouldBeHandled,
								);
							});
						});
					});
					Given(
						'a recipient passphrase "polar save winner any focus slide runway ghost finish invite regret laugh" with private key "08595f178e7470ad2cbe054b29f60311a0f808be969cde6c274819580a428dcd31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25" and public key "31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25"',
						given.aRecipientPassphraseWithPrivateKeyAndPublicKey,
						() => {
							Given(
								'an encrypted message "76778326f67b338032e888c6d9482f76ae27662716778d5d6816ef4f" with a nonce "b0601b8e58302d329d9b6e7e7fc70c929a159bb12d793a48"',
								given.anEncryptedMessageWithANonce,
								() => {
									describe('#encryptMessage', () => {
										When(
											'no error occurs attempting to encrypt the message for the recipient using the passphrase',
											when.noErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase,
											() => {
												Then(
													'lisk-js crypto should be used to get the encrypted message and nonce',
													then.liskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce,
												);
												Then(
													'the encrypted message and nonce should be returned',
													then.theEncryptedMessageAndNonceShouldBeReturned,
												);
											},
										);
										When(
											'an error occurs attempting to encrypt the message for the recipient using the passphrase',
											when.anErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase,
											() => {
												Then(
													'the error response should be handled',
													then.theErrorResponseShouldBeHandled,
												);
											},
										);
									});
									describe('#decryptMessage', () => {
										When(
											'no error occurs attempting to decrypt the message using the recipient passphrase and sender public key',
											when.noErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey,
											() => {
												Then(
													'lisk-js crypto should be used to get the decrypted message',
													then.liskJSCryptoShouldBeUsedToGetTheDecryptedMessage,
												);
												Then(
													'the decrypted message should be returned',
													then.theDecryptedMessageShouldBeReturned,
												);
											},
										);
										When(
											'an error occurs attempting to decrypt the message using the recipient passphrase and sender public key',
											when.anErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey,
											() => {
												Then(
													'the error response should be handled',
													then.theErrorResponseShouldBeHandled,
												);
											},
										);
									});
								},
							);
						},
					);
				});
			},
		);
		Given(
			'a message "Hello World" with a public key "647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6" and a signature "KjyhJ+/Peyv2KsjDsfWs9pl8q2K6n941Z9GI7cusvF3IF3+4jQOoaRzgM0j1abEhvKnno8Q79cBWOC81/4Q8CQ=="',
			given.aMessageWithAPublicKeyAndASignature,
			() => {
				When(
					'no error occurs attempting to verify the message using the public key and the signature',
					when.noErrorOccursAttemptingToVerifyTheMessageUsingThePublicKeyAndTheSignature,
					() => {
						Then(
							'lisk-js crypto should be used to verify the message',
							then.liskJSCryptoShouldBeUsedToVerifyTheMessage,
						);
						Then(
							'the verified message should be returned',
							then.theVerifiedMessageShouldBeReturned,
						);
					},
				);
				When(
					'an error occurs attempting to verify the message using the public key and the signature',
					when.anErrorOccursAttemptingToVerifyTheMessageUsingThePublicKeyAndTheSignature,
					() => {
						Then(
							'the error response should be handled',
							then.theErrorResponseShouldBeHandled,
						);
					},
				);
			},
		);
	});
});
