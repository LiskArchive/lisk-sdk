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
	EncryptedMessageObject,
	EncryptedMessageWithNonce,
	encryptMessageWithPrivateKey,
	decryptMessageWithPrivateKey,
	encryptMessageWithPassword,
	decryptMessageWithPassword,
	KDF,
	Cipher,
	parseEncryptedMessage,
	stringifyEncryptedMessage,
} from '../src/encrypt';
import * as utils from '../src/utils';

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

		hashStub = jest
			.spyOn(utils, 'hash')
			.mockReturnValue(
				Buffer.from('d43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760', 'hex'),
			);
		return Promise.resolve();
	});

	describe('#encryptMessageWithPrivateKey', () => {
		let encryptedMessage: EncryptedMessageWithNonce;

		beforeEach(async () => {
			encryptedMessage = encryptMessageWithPrivateKey(
				defaultMessage,
				defaultPrivateKey,
				defaultPublicKey,
			);
			return Promise.resolve();
		});

		it('should encrypt a message', () => {
			expect(encryptedMessage).toHaveProperty('encryptedMessage');
			expect(regHexadecimal.test(encryptedMessage.encryptedMessage)).toBe(true);
		});

		it('should output the nonce', () => {
			expect(encryptedMessage).toBeDefined();
			expect(encryptedMessage).toHaveProperty('nonce');
			expect(regHexadecimal.test(encryptedMessage.nonce)).toBe(true);
		});
	});

	describe('#decryptMessageWithPrivateKey', () => {
		it('should be able to decrypt the message correctly using the receiver’s secret passphrase', () => {
			const decryptedMessage = decryptMessageWithPrivateKey(
				defaultEncryptedMessageWithNonce.encryptedMessage,
				defaultEncryptedMessageWithNonce.nonce,
				defaultPrivateKey,
				defaultPublicKey,
			);

			expect(decryptedMessage).toBe(defaultMessage);
		});

		it('should inform the user if the nonce is the wrong length', () => {
			expect(
				decryptMessageWithPrivateKey.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultPrivateKey,
					defaultPublicKey,
				),
			).toThrow('Expected nonce to be 24 bytes.');
		});

		it('should inform the user if something goes wrong during decryption', () => {
			expect(
				decryptMessageWithPrivateKey.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultEncryptedMessageWithNonce.nonce,
					defaultPrivateKey,
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

		describe('#encryptMessageWithPassword', () => {
			let encryptedMessage: EncryptedMessageObject;
			const passphrase =
				'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol';
			const password = 'testpassword';

			beforeEach(async () => {
				encryptedMessage = await encryptMessageWithPassword(passphrase, password, {
					kdf: KDF.ARGON2,
				});
				return Promise.resolve();
			});

			it('should encrypt a passphrase', () => {
				expect(encryptedMessage).toHaveProperty('ciphertext');
				expect(regHexadecimal.test(encryptedMessage.cipherparams.iv)).toBe(true);
				expect(encryptedMessage.cipherparams.iv).toHaveLength(24);
			});

			it('should encrypt bytes', async () => {
				encryptedMessage = await encryptMessageWithPassword(utils.getRandomBytes(32), password, {
					kdf: KDF.ARGON2,
				});
				expect(encryptedMessage).toHaveProperty('ciphertext');
				expect(regHexadecimal.test(encryptedMessage.cipherparams.iv)).toBe(true);
				expect(encryptedMessage.cipherparams.iv).toHaveLength(24);
			});

			it('should output the IV', () => {
				expect(encryptedMessage.cipherparams).toHaveProperty('iv');
				expect(encryptedMessage.cipherparams.iv).toHaveLength(24);
			});

			it('should output the salt', () => {
				expect(encryptedMessage.kdfparams).toHaveProperty('salt');
				expect(encryptedMessage.kdfparams.salt).toHaveLength(32);
			});

			it('should output the tag', () => {
				expect(encryptedMessage.cipherparams).toHaveProperty('tag');
				expect(encryptedMessage.cipherparams.tag).toHaveLength(32);
			});

			it('should output the current version of Lisk Elements', () => {
				expect(encryptedMessage).toHaveProperty('version', ENCRYPTION_VERSION);
			});

			it('should output the default number of iterations', () => {
				expect(encryptedMessage.kdfparams).toHaveProperty('iterations', ARGON2_ITERATIONS);
			});

			it('should accept and output a custom number of iterations', async () => {
				encryptedMessage = await encryptMessageWithPassword(defaultPassphrase, defaultPassword, {
					kdf: KDF.PBKDF2,
					kdfparams: { iterations: customIterations },
				});

				expect(encryptedMessage.kdfparams.iterations).toBe(customIterations);
			});
		});

		describe('#decryptMessageWithPassword', () => {
			let encryptedMessage: EncryptedMessageObject;
			const passphrase =
				'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol';
			const password = 'testpassword';

			beforeEach(() => {
				encryptedMessage = {
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

			it('should reject if decrypt a passphrase with a invalid password', async () => {
				await expect(
					decryptMessageWithPassword(encryptedMessage, 'invalid', 'utf-8'),
				).rejects.toThrow('Unsupported state or unable to authenticate data');
			});

			it('should decrypt a passphrase with a password', async () => {
				const decrypted = await decryptMessageWithPassword(encryptedMessage, password, 'utf-8');
				expect(decrypted).toBe(passphrase);
			});

			it('should decrypt bytes with a password', async () => {
				const message = utils.getRandomBytes(32);
				encryptedMessage = await encryptMessageWithPassword(message, password);
				const decrypted = await decryptMessageWithPassword(encryptedMessage, password);
				expect(decrypted).toEqual(message);
			});

			it('should inform the user if cipherText is missing', async () => {
				const { ciphertext, ...encryptedMessageWithoutCipherText } = encryptedMessage;

				await expect(
					decryptMessageWithPassword(
						encryptedMessageWithoutCipherText as any,
						defaultPassword,
						'utf-8',
					),
				).rejects.toThrow('Cipher text must be a string.');
			});

			it('should inform the user if iv is missing', async () => {
				encryptedMessage.cipherparams.iv = undefined as any;

				await expect(
					decryptMessageWithPassword(encryptedMessage, defaultPassword, 'utf-8'),
				).rejects.toThrow('IV must be a string.');
			});

			it('should inform the user if salt is missing', async () => {
				encryptedMessage.kdfparams.salt = undefined as any;
				await expect(
					decryptMessageWithPassword(encryptedMessage, defaultPassword, 'utf-8'),
				).rejects.toThrow('Salt must be a string.');
			});

			it('should inform the user if tag is missing', async () => {
				encryptedMessage.cipherparams.tag = undefined as any;
				await expect(
					decryptMessageWithPassword(encryptedMessage, defaultPassword, 'utf-8'),
				).rejects.toThrow('Tag must be a string.');
			});

			it('should inform the user if the salt has been altered', async () => {
				encryptedMessage.kdfparams.salt = `00${encryptedMessage.kdfparams.salt.slice(2)}`;
				await expect(
					decryptMessageWithPassword(encryptedMessage, defaultPassword, 'utf-8'),
				).rejects.toThrow('Unsupported state or unable to authenticate data');
			});

			it('should inform the user if the tag has been shortened', async () => {
				encryptedMessage.cipherparams.tag = encryptedMessage.cipherparams.tag.slice(0, 30);
				await expect(
					decryptMessageWithPassword(encryptedMessage, defaultPassword, 'utf-8'),
				).rejects.toThrow('Tag must be 16 bytes.');
			});

			it('should inform the user if the tag is not a hex string', async () => {
				encryptedMessage.cipherparams.tag = `${encryptedMessage.cipherparams.tag.slice(0, 30)}gg`;
				await expect(
					decryptMessageWithPassword(encryptedMessage, defaultPassword, 'utf-8'),
				).rejects.toThrow('Tag must be a valid hex string.');
			});

			it('should inform the user if the tag has been altered', async () => {
				encryptedMessage.cipherparams.tag = `00${encryptedMessage.cipherparams.tag.slice(2)}`;
				await expect(
					decryptMessageWithPassword(encryptedMessage, defaultPassword, 'utf-8'),
				).rejects.toThrow('Unsupported state or unable to authenticate data');
			});
		});

		describe('integration test', () => {
			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase with PBKDF2 @node-only', async () => {
				const encryptedMessage = await encryptMessageWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.PBKDF2 },
				);

				const decryptedString = await decryptMessageWithPassword(
					encryptedMessage,
					defaultPassword,
					'utf-8',
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});

			it('should encrypt a given passphrase with a password and custom number of iterations and decrypt it back to the original passphrase with PBKDF2 @node-only', async () => {
				const encryptedMessage = await encryptMessageWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.PBKDF2, kdfparams: { iterations: customIterations } },
				);
				const decryptedString = await decryptMessageWithPassword(
					encryptedMessage,
					defaultPassword,
					'utf-8',
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});

			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase with ARGON2 @node-only', async () => {
				const encryptedMessage = await encryptMessageWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.ARGON2 },
				);

				const decryptedString = await decryptMessageWithPassword(
					encryptedMessage,
					defaultPassword,
					'utf-8',
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});

			it('should encrypt a given passphrase with a password and custom number of iterations and decrypt it back to the original passphrase with ARGON2 @node-only', async () => {
				const encryptedMessage = await encryptMessageWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.ARGON2, kdfparams: { iterations: customIterations } },
				);
				const decryptedString = await decryptMessageWithPassword(
					encryptedMessage,
					defaultPassword,
					'utf-8',
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});
		});
	});

	describe('#stringifyEncryptedMessage', () => {
		it('should throw an error if encrypted passphrase is not an object', () => {
			const encryptedMessage =
				'salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(stringifyEncryptedMessage.bind(null, encryptedMessage as any)).toThrow(
				'Encrypted message to stringify must be an object.',
			);
		});

		it('should format an encrypted passphrase as a string', () => {
			const encryptedMessage = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac: 'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
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
			expect(stringifyEncryptedMessage(encryptedMessage as EncryptedMessageObject)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});

		it('should format an encrypted passphrase with custom iterations as a string', () => {
			const encryptedMessage = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac: 'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
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
			expect(stringifyEncryptedMessage(encryptedMessage as EncryptedMessageObject)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});
	});

	describe('#parseEncryptedMessage', () => {
		it('should throw an error if encrypted passphrase is not a string', () => {
			const stringifiedEncryptedPassphrase = { abc: 'def' };
			expect(parseEncryptedMessage.bind(null, stringifiedEncryptedPassphrase as any)).toThrow(
				'Encrypted message to parse must be a string.',
			);
		});

		it('should throw an error if iterations is present but not a valid number', () => {
			const stringifiedEncryptedPassphrase =
				'iterations=null&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(parseEncryptedMessage.bind(null, stringifiedEncryptedPassphrase)).toThrow(
				'Encrypted message to parse must have only one value per key.',
			);
		});

		it('should throw an error if multiple values are in a key', () => {
			const stringifiedEncryptedPassphrase =
				'salt=xxx&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(parseEncryptedMessage.bind(null, stringifiedEncryptedPassphrase)).toThrow(
				'Encrypted message to parse must have only one value per key.',
			);
		});

		it('should parse an encrypted passphrase string', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=PBKDF2&cipher=aes-256-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15';
			const encryptedMessage = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac: 'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
					iterations: 1,
					memorySize: 2024,
					parallelism: 4,
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});

		it('should parse an encrypted passphrase string with custom iterations', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=PBKDF2&cipher=aes-256-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&iterations=12&parallelism=&memorySize=';
			const encryptedMessage = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac: 'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
					iterations: 12,
					memorySize: 2024,
					parallelism: 4,
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});
	});
});
