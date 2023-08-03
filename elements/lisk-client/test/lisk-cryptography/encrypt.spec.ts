/** Copyright © 2020 Lisk Foundation
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
import * as cryptography from '@liskhq/lisk-cryptography';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

const {
	encrypt: {
		encryptMessageWithPassword,
		decryptMessageWithPassword,
		stringifyEncryptedMessage,
		parseEncryptedMessage,
		KDF,
		Cipher,
	},
} = cryptography;

describe('encrypt', () => {
	const regHexadecimal = /[0-9A-Za-z]/g;
	const PBKDF2_ITERATIONS = 1e6;
	const ENCRYPTION_VERSION = '1';
	const defaultPassphrase =
		'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol';
	const defaultPrivateKey = Buffer.from(
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
		'hex',
	);
	const defaultPublicKey = Buffer.from(
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
		'hex',
	);
	const defaultPassword = 'testpassword';
	const customIterations = 12;

	beforeEach(async () => {
		jest
			.spyOn(cryptography.legacy, 'getPrivateAndPublicKeyFromPassphrase')
			.mockImplementation(() => {
				return {
					privateKey: defaultPrivateKey,
					publicKey: defaultPublicKey,
				};
			});

		return Promise.resolve();
	});

	describe('encrypt and decrypt passphrase with password', () => {
		describe('#encryptMessageWithPassword', () => {
			let encryptedMessage: cryptography.encrypt.EncryptedMessageObject;

			beforeEach(async () => {
				encryptedMessage = await encryptMessageWithPassword(defaultPassphrase, defaultPassword, {
					kdf: KDF.PBKDF2,
				});
				return Promise.resolve();
			});

			it('should encrypt a passphrase', () => {
				expect(encryptedMessage).toHaveProperty('ciphertext');
				expect(regHexadecimal.test(encryptedMessage.cipherparams.iv)).toBe(true);
				expect(encryptedMessage.cipherparams.iv).toHaveLength(32);
			});

			it('should output the IV', () => {
				expect(encryptedMessage.cipherparams).toHaveProperty('iv');
				expect(encryptedMessage.cipherparams.iv).toHaveLength(32);
			});

			it('should output the salt', () => {
				expect(encryptedMessage.kdfparams).toHaveProperty('salt');
				expect(encryptedMessage.kdfparams.salt).toHaveLength(16);
			});

			it('should output the tag', () => {
				expect(encryptedMessage.cipherparams).toHaveProperty('tag');
				expect(encryptedMessage.cipherparams.tag).toHaveLength(32);
			});

			it('should output the current version of Lisk Elements', () => {
				expect(encryptedMessage).toHaveProperty('version', ENCRYPTION_VERSION);
			});

			it('should output the default number of iterations', () => {
				expect(encryptedMessage.kdfparams).toHaveProperty('iterations', PBKDF2_ITERATIONS);
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
			let encryptedMessage: cryptography.encrypt.EncryptedMessageObject;

			beforeEach(() => {
				encryptedMessage = {
					ciphertext:
						'fc17353ac21dbdaa8b2c8a09d1ee7ded3e64559922d679e7fd382ac403247bd41389d32c7bc98bfa8f74a141b3946549b0d4ecdc995f130b321274484784f7bc4ac383491cb1010ead36abf91f0cf8be',
					mac: '61792857203a0860c12ff9ed8dcb70db7240f1dfb28d6ddb8c7478e23c1fe029',
					kdf: KDF.ARGON2,
					kdfparams: {
						parallelism: 4,
						iterations: 1,
						memorySize: 2097023,
						salt: '35e8e6305e6577f0',
					},
					cipher: Cipher.AES128GCM,
					cipherparams: {
						iv: 'bc47f1c691d2e60e59ba6e54a78442fe',
						tag: '965a1c13309a5272d1bdf84090736f9e',
					},
					version: '1',
				};
			});

			it('should decrypt a passphrase with a password', async () => {
				const decrypted = await decryptMessageWithPassword(
					encryptedMessage,
					defaultPassword,
					'utf-8',
				);
				expect(decrypted).toBe(defaultPassphrase);
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

			it('should decrypt a passphrase with a password and a custom number of iterations', async () => {
				const encryptedMessageWithIterations = await encryptMessageWithPassword(
					defaultPassphrase,
					defaultPassword,
					{ kdf: KDF.ARGON2, kdfparams: { iterations: 12 } },
				);
				const decrypted = await decryptMessageWithPassword(
					encryptedMessageWithIterations,
					defaultPassword,
					'utf-8',
				);
				expect(decrypted).toBe(defaultPassphrase);
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
				ciphertext:
					'fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4',
				mac: '997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d',
				kdf: 'argon2id',
				kdfparams: {
					parallelism: 4,
					iterations: 1,
					memorySize: 2024,
					salt: 'd3228c53c27a44cbd9d88ea0919bdade',
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: 'b5c86483366f4698708e6985',
					tag: '5d6c0f628ba12930111c33ef678b2319',
				},
				version: '1',
			};
			const stringifiedEncryptedPassphrase =
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=1&parallelism=4&memorySize=2024';
			expect(stringifyEncryptedMessage(encryptedMessage as any)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});

		it('should format an encrypted passphrase with custom iterations as a string', () => {
			const encryptedMessage = {
				ciphertext:
					'fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4',
				mac: '997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d',
				kdf: 'argon2id',
				kdfparams: {
					parallelism: 4,
					iterations: 10000,
					memorySize: 2024,
					salt: 'd3228c53c27a44cbd9d88ea0919bdade',
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: 'b5c86483366f4698708e6985',
					tag: '5d6c0f628ba12930111c33ef678b2319',
				},
				version: '1',
			};
			const stringifiedEncryptedPassphrase =
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=10000&parallelism=4&memorySize=2024';
			expect(stringifyEncryptedMessage(encryptedMessage as any)).toBe(
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
				'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=1&parallelism=4&memorySize=2024';
			const encryptedMessage = {
				ciphertext:
					'fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4',
				mac: '997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d',
				kdf: 'argon2id',
				kdfparams: {
					parallelism: 4,
					iterations: 1,
					memorySize: 2024,
					salt: 'd3228c53c27a44cbd9d88ea0919bdade',
				},
				cipher: 'aes-128-gcm',
				cipherparams: {
					iv: 'b5c86483366f4698708e6985',
					tag: '5d6c0f628ba12930111c33ef678b2319',
				},
				version: '1',
			};
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});

		it('should parse an encrypted passphrase string with custom iterations', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=10000&parallelism=4&memorySize=2024';
			const encryptedMessage = {
				ciphertext:
					'fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4',
				mac: '997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d',
				kdf: 'argon2id',
				kdfparams: {
					parallelism: 4,
					iterations: 10000,
					memorySize: 2024,
					salt: 'd3228c53c27a44cbd9d88ea0919bdade',
				},
				cipher: 'aes-128-gcm',
				cipherparams: {
					iv: 'b5c86483366f4698708e6985',
					tag: '5d6c0f628ba12930111c33ef678b2319',
				},
				version: '1',
			};
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});
	});
});
