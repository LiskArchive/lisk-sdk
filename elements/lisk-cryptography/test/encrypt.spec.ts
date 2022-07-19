/** Copyright © 2019 Lisk Foundation
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
import * as ed2curve from 'ed2curve';
import {
	EncryptedPassphraseObject,
	EncryptedMessageWithNonce,
	encryptMessageWithPassphrase,
	decryptMessageWithPassphrase,
	encryptPassphraseWithPassword,
	decryptPassphraseWithPassword,
	KDF,
	Cipher,
	parseEncryptedPassphrase,
	stringifyEncryptedPassphrase,
} from '../src/encrypt';
import * as utils from '../src/utils';
import * as address from '../src/address';

describe('encrypt', () => {
	const regHexadecimal = /[0-9A-Za-z]/g;
	const ARGON2_ITERATIONS = 1;
	const ENCRYPTION_VERSION = '1';
	const defaultPassphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPrivateKey = Buffer.from(
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
		'hex',
	);
	const defaultPublicKey = Buffer.from(
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
		'hex',
	);
	const defaultMessage = 'Some default text.';
	const defaultPassword = 'myTotal53cr3t%&';
	const customIterations = 12;

	let defaultEncryptedMessageWithNonce: EncryptedMessageWithNonce;

	let hashStub: any;

	beforeEach(async () => {
		defaultEncryptedMessageWithNonce = {
			encryptedMessage: '299390b9cbb92fe6a43daece2ceaecbacd01c7c03cfdba51d693b5c0e2b65c634115',
			nonce: 'df4c8b09e270d2cb3f7b3d53dfa8a6f3441ad3b14a13fb66',
		};
		jest
			.spyOn(ed2curve, 'convertSecretKey')
			.mockReturnValue(
				Buffer.from('d8be8cacb03fb02f34e85030f902b635f364d6c23f090c7640e9dc9c568e7d5e', 'hex'),
			);
		jest
			.spyOn(ed2curve, 'convertPublicKey')
			.mockReturnValue(
				Buffer.from('f245e78c83196d73452e55581ef924a1b792d352c142257aa3af13cded2e7905', 'hex'),
			);

		jest.spyOn(address, 'getAddressAndPublicKeyFromPassphrase').mockImplementation(() => {
			return {
				address: address.getAddressFromPublicKey(defaultPublicKey),
				privateKey: defaultPrivateKey,
				publicKey: defaultPublicKey,
			};
		});

		hashStub = jest
			.spyOn(utils, 'hash')
			.mockReturnValue(
				Buffer.from('d43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760', 'hex'),
			);
		return Promise.resolve();
	});

	describe('#encryptMessageWithPassphrase', () => {
		let encryptedMessage: EncryptedMessageWithNonce;

		beforeEach(async () => {
			encryptedMessage = encryptMessageWithPassphrase(
				defaultMessage,
				defaultPassphrase,
				defaultPublicKey,
			);
			return Promise.resolve();
		});

		it('should encrypt a message', () => {
			expect(encryptedMessage).toHaveProperty('encryptedMessage');
			expect(regHexadecimal.test(encryptedMessage.encryptedMessage)).toBe(true);
		});

		it('should output the nonce', () => {
			expect(encryptedMessage).not.toBeUndefined();
			expect(encryptedMessage).toHaveProperty('nonce');
			expect(regHexadecimal.test(encryptedMessage.nonce)).toBe(true);
		});
	});

	describe('#decryptMessageWithPassphrase', () => {
		it('should be able to decrypt the message correctly using the receiver’s secret passphrase', () => {
			const decryptedMessage = decryptMessageWithPassphrase(
				defaultEncryptedMessageWithNonce.encryptedMessage,
				defaultEncryptedMessageWithNonce.nonce,
				defaultPassphrase,
				defaultPublicKey,
			);

			expect(decryptedMessage).toBe(defaultMessage);
		});

		it('should inform the user if the nonce is the wrong length', () => {
			expect(
				decryptMessageWithPassphrase.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultPassphrase,
					defaultPublicKey,
				),
			).toThrow('Expected nonce to be 24 bytes.');
		});

		it('should inform the user if something goes wrong during decryption', () => {
			expect(
				decryptMessageWithPassphrase.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultEncryptedMessageWithNonce.nonce,
					defaultPassphrase,
					defaultPublicKey,
				),
			).toThrow('Something went wrong during decryption. Is this the full encrypted message?');
		});
	});

	describe('encrypt and decrypt passphrase with password', () => {
		beforeEach(() => {
			hashStub.mockReturnValue(
				Buffer.from('e09dfc943d65d63f4f31e444c81afc6d5cf442c988fb87180165dd7119d3ae61', 'hex'),
			);
		});

		describe('#encryptPassphraseWithPassword', () => {
			let encryptedPassphrase: EncryptedPassphraseObject;
			const passphrase =
				'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol';
			const password = 'testpassword';

			beforeEach(async () => {
				encryptedPassphrase = await encryptPassphraseWithPassword(passphrase, password, {
					kdf: KDF.ARGON2,
				});
				return Promise.resolve();
			});

			it('should encrypt a passphrase', () => {
				expect(encryptedPassphrase).toHaveProperty('ciphertext');
				expect(regHexadecimal.test(encryptedPassphrase.cipherparams.iv)).toBe(true);
				expect(encryptedPassphrase.cipherparams.iv).toHaveLength(24);
			});

			it('should output the IV', () => {
				expect(encryptedPassphrase.cipherparams).toHaveProperty('iv');
				expect(encryptedPassphrase.cipherparams.iv).toHaveLength(24);
			});

			it('should output the salt', () => {
				expect(encryptedPassphrase.kdfparams).toHaveProperty('salt');
				expect(encryptedPassphrase.kdfparams.salt).toHaveLength(32);
			});

			it('should output the tag', () => {
				expect(encryptedPassphrase.cipherparams).toHaveProperty('tag');
				expect(encryptedPassphrase.cipherparams.tag).toHaveLength(32);
			});

			it('should output the current version of Lisk Elements', () => {
				expect(encryptedPassphrase).toHaveProperty('version', ENCRYPTION_VERSION);
			});

			it('should output the default number of iterations', () => {
				expect(encryptedPassphrase.kdfparams).toHaveProperty('iterations', ARGON2_ITERATIONS);
			});

			it('should accept and output a custom number of iterations', async () => {
				encryptedPassphrase = await encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.PBKDF2, kdfparams: { iterations: customIterations } },
				);

				expect(encryptedPassphrase.kdfparams.iterations).toBe(customIterations);
			});
		});

		describe('#decryptPassphraseWithPassword', () => {
			let encryptedPassphrase: EncryptedPassphraseObject;
			const passphrase =
				'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol';
			const password = 'testpassword';

			beforeEach(() => {
				encryptedPassphrase = {
					version: '1',
					ciphertext:
						'866c6f1cab3ef67514bdc54cf0143b8b824ebe7c045efb97707c158c81d313cd1a6399b7aa3002248984d39ea2604b0263fe7bdbd8cb04286a9cbd2d353fc79908daab9af04b2528bf4f06a82d79483c',
					mac: 'a476979ca68fe90f3c96f8a5f3f0a9fe33aef8b091d1169861e44a11a680aae9',
					cipher: Cipher.AES256GCM,
					cipherparams: {
						iv: 'da7a74acbf34d20ffd3658f9',
						tag: 'f4282899ed6cb0193e2981dca0d2ae8e',
					},
					kdf: KDF.ARGON2,
					kdfparams: {
						parallelism: 4,
						iterations: 1,
						memorySize: 2024,
						salt: '2d4d7f0b7c68ccd977eae30ee10726f3',
					},
				};
			});

			it('should decrypt a passphrase with a password', async () => {
				const decrypted = await decryptPassphraseWithPassword(encryptedPassphrase, password);
				expect(decrypted).toBe(passphrase);
			});

			it('should inform the user if cipherText is missing', async () => {
				const { ciphertext, ...encryptedPassphraseWithoutCipherText } = encryptedPassphrase;

				await expect(
					decryptPassphraseWithPassword(
						encryptedPassphraseWithoutCipherText as any,
						defaultPassword,
					),
				).rejects.toThrow('Cipher text must be a string.');
			});

			it('should inform the user if iv is missing', async () => {
				encryptedPassphrase.cipherparams.iv = undefined as any;

				await expect(
					decryptPassphraseWithPassword(encryptedPassphrase, defaultPassword),
				).rejects.toThrow('IV must be a string.');
			});

			it('should inform the user if salt is missing', async () => {
				encryptedPassphrase.kdfparams.salt = undefined as any;
				await expect(
					decryptPassphraseWithPassword(encryptedPassphrase, defaultPassword),
				).rejects.toThrow('Salt must be a string.');
			});

			it('should inform the user if tag is missing', async () => {
				encryptedPassphrase.cipherparams.tag = undefined as any;
				await expect(
					decryptPassphraseWithPassword(encryptedPassphrase, defaultPassword),
				).rejects.toThrow('Tag must be a string.');
			});

			it('should inform the user if the salt has been altered', async () => {
				encryptedPassphrase.kdfparams.salt = `00${encryptedPassphrase.kdfparams.salt.slice(2)}`;
				await expect(
					decryptPassphraseWithPassword(encryptedPassphrase, defaultPassword),
				).rejects.toThrow('Unsupported state or unable to authenticate data');
			});

			it('should inform the user if the tag has been shortened', async () => {
				encryptedPassphrase.cipherparams.tag = encryptedPassphrase.cipherparams.tag.slice(0, 30);
				await expect(
					decryptPassphraseWithPassword(encryptedPassphrase, defaultPassword),
				).rejects.toThrow('Tag must be 16 bytes.');
			});

			it('should inform the user if the tag is not a hex string', async () => {
				encryptedPassphrase.cipherparams.tag = `${encryptedPassphrase.cipherparams.tag.slice(
					0,
					30,
				)}gg`;
				await expect(
					decryptPassphraseWithPassword(encryptedPassphrase, defaultPassword),
				).rejects.toThrow('Tag must be a valid hex string.');
			});

			it('should inform the user if the tag has been altered', async () => {
				encryptedPassphrase.cipherparams.tag = `00${encryptedPassphrase.cipherparams.tag.slice(2)}`;
				await expect(
					decryptPassphraseWithPassword(encryptedPassphrase, defaultPassword),
				).rejects.toThrow('Unsupported state or unable to authenticate data');
			});
		});

		describe('integration test', () => {
			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase with PBKDF2 @node-only', async () => {
				const encryptedPassphrase = await encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.PBKDF2 },
				);

				const decryptedString = await decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});

			it('should encrypt a given passphrase with a password and custom number of iterations and decrypt it back to the original passphrase with PBKDF2 @node-only', async () => {
				const encryptedPassphrase = await encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.PBKDF2, kdfparams: { iterations: customIterations } },
				);
				const decryptedString = await decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});

			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase with ARGON2 @node-only', async () => {
				const encryptedPassphrase = await encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.ARGON2 },
				);

				const decryptedString = await decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});

			it('should encrypt a given passphrase with a password and custom number of iterations and decrypt it back to the original passphrase with ARGON2 @node-only', async () => {
				const encryptedPassphrase = await encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.ARGON2, kdfparams: { iterations: customIterations } },
				);
				const decryptedString = await decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});
		});
	});

	describe('#stringifyEncryptedPassphrase', () => {
		it('should throw an error if encrypted passphrase is not an object', () => {
			const encryptedPassphrase =
				'salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(stringifyEncryptedPassphrase.bind(null, encryptedPassphrase as any)).toThrow(
				'Encrypted passphrase to stringify must be an object.',
			);
		});

		it('should format an encrypted passphrase as a string', () => {
			const encryptedPassphrase = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac:
					'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			const stringifiedEncryptedPassphrase =
				'kdf=PBKDF2&cipher=aes-256-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&iterations=&parallelism=&memorySize=';
			expect(stringifyEncryptedPassphrase(encryptedPassphrase as EncryptedPassphraseObject)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});

		it('should format an encrypted passphrase with custom iterations as a string', () => {
			const encryptedPassphrase = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac:
					'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
					iterations: 12,
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			const stringifiedEncryptedPassphrase =
				'kdf=PBKDF2&cipher=aes-256-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&iterations=12&parallelism=&memorySize=';
			expect(stringifyEncryptedPassphrase(encryptedPassphrase as EncryptedPassphraseObject)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});
	});

	describe('#parseEncryptedPassphrase', () => {
		it('should throw an error if encrypted passphrase is not a string', () => {
			const stringifiedEncryptedPassphrase = { abc: 'def' };
			expect(parseEncryptedPassphrase.bind(null, stringifiedEncryptedPassphrase as any)).toThrow(
				'Encrypted passphrase to parse must be a string.',
			);
		});

		it('should throw an error if iterations is present but not a valid number', () => {
			const stringifiedEncryptedPassphrase =
				'iterations=null&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(parseEncryptedPassphrase.bind(null, stringifiedEncryptedPassphrase)).toThrow(
				'Encrypted passphrase to parse must have only one value per key.',
			);
		});

		it('should throw an error if multiple values are in a key', () => {
			const stringifiedEncryptedPassphrase =
				'salt=xxx&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(parseEncryptedPassphrase.bind(null, stringifiedEncryptedPassphrase)).toThrow(
				'Encrypted passphrase to parse must have only one value per key.',
			);
		});

		it('should parse an encrypted passphrase string', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=PBKDF2&cipher=aes-256-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15';
			const encryptedPassphrase = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac:
					'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			expect(parseEncryptedPassphrase(stringifiedEncryptedPassphrase)).toEqual(encryptedPassphrase);
		});

		it('should parse an encrypted passphrase string with custom iterations', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=PBKDF2&cipher=aes-256-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&iterations=12&parallelism=&memorySize=';
			const encryptedPassphrase = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac:
					'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
					iterations: 12,
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			expect(parseEncryptedPassphrase(stringifiedEncryptedPassphrase)).toEqual(encryptedPassphrase);
		});
	});
});
