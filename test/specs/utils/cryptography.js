/*
 * LiskHQ/lisk-commander
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
			'the crypto instance should have lisk-elements cryptography as a property',
			then.theCryptoInstanceShouldHaveLiskElementsCryptographyAsAProperty,
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
								'lisk-elements crypto should be used to get the keys for the passphrase',
								then.liskElementsCryptoShouldBeUsedToGetTheKeysForThePassphrase,
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
								'lisk-elements crypto should be used to get the address from the public key',
								then.liskElementsCryptoShouldBeUsedToGetTheAddressFromThePublicKey,
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
								'lisk-elements crypto should be used to get the address from the public key',
								then.liskElementsCryptoShouldBeUsedToGetTheAddressFromThePublicKey,
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
						'an encrypted passphrase "iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1"',
						given.anEncryptedPassphrase,
						() => {
							describe('#encryptPassphrase', () => {
								When(
									'no error occurs attempting to encrypt the passphrase with the password',
									when.noErrorOccursAttemptingToEncryptThePassphraseWithThePassword,
									() => {
										Then(
											'lisk-elements crypto should be used to get the encrypted passphrase',
											then.liskElementsCryptoShouldBeUsedToGetTheEncryptedPassphrase,
										);
										Then(
											'lisk-elements crypto should be used to stringify the encrypted passphrase',
											then.liskElementsCryptoShouldBeUsedToStringifyTheEncryptedPassphrase,
										);
										Then(
											'the encrypted passphrase should be returned',
											then.theEncryptedPassphraseShouldBeReturned,
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
											'lisk-elements crypto should be used to parse the encrypted passphrase',
											then.liskElementsCryptoShouldBeUsedToParseTheEncryptedPassphrase,
										);
										Then(
											'lisk-elements crypto should be used to get the decrypted passphrase',
											then.liskElementsCryptoShouldBeUsedToGetTheDecryptedPassphrase,
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
						Given(
							'the message under the passphrase has signature "1fef64a0bc78019a04ba9735cf94c1403683908f4a42ed500cf5d65f1cd5be16971838bfd810f4ab2a5526ee7de82ad9f971ee500771db02d983237f65fa9f01"',
							given.theMessageUnderThePassphraseHasSignature,
							() => {
								When(
									'no error occurs attempting to sign the message using the passphrase',
									when.noErrorOccursAttemptingToSignTheMessageUsingThePassphrase,
									() => {
										it(
											'Then lisk-elements crypto should be used to sign the message',
											then.liskElementsCryptoShouldBeUsedToSignTheMessage,
										);
										it(
											'Then the signature should be returned',
											then.theSignatureShouldBeReturned,
										);
									},
								);
								When(
									'an error occurs attempting to sign the message using the passphrase',
									when.anErrorOccursAttemptingToSignTheMessageUsingThePassphrase,
									() => {
										it(
											'Then the error response should be handled',
											then.theErrorResponseShouldBeHandled,
										);
									},
								);
							},
						);
					});
					describe('#verifyMessage', () => {
						Given(
							'the message under the passphrase has signature "1fef64a0bc78019a04ba9735cf94c1403683908f4a42ed500cf5d65f1cd5be16971838bfd810f4ab2a5526ee7de82ad9f971ee500771db02d983237f65fa9f01"',
							given.theMessageUnderThePassphraseHasSignature,
							() => {
								When(
									'no error occurs attempting to verify the message using the public key and the signature',
									when.noErrorOccursAttemptingToVerifyTheMessageUsingThePublicKeyAndTheSignature,
									() => {
										Then(
											'lisk-elements crypto should be used to verify the message',
											then.liskElementsCryptoShouldBeUsedToVerifyTheMessage,
										);
										Then(
											'the the message verification should be returned',
											then.theMessageVerificationShouldBeReturned,
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
												'lisk-elements crypto should be used to get the encrypted message and nonce',
												then.liskElementsCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce,
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
												'lisk-elements crypto should be used to get the decrypted message',
												then.liskElementsCryptoShouldBeUsedToGetTheDecryptedMessage,
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
			},
		);
	});
});
