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
	const defaultPassphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPrivateKey = Buffer.from(
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
		'hex',
	);
	const defaultPublicKey = Buffer.from(
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588',
		'hex',
	);
	const defaultPassword = 'myTotal53cr3t%&';
	const customIterations = 12;

	let hashStub: any;

	beforeEach(async () => {
		jest
			.spyOn(cryptography.legacy, 'getPrivateAndPublicKeyFromPassphrase')
			.mockImplementation(() => {
				return {
					privateKey: defaultPrivateKey,
					publicKey: defaultPublicKey,
				};
			});

		hashStub = jest
			.spyOn(cryptography.utils, 'hash')
			.mockReturnValue(
				Buffer.from('d43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760', 'hex'),
			);
		return Promise.resolve();
	});

	describe('encrypt and decrypt passphrase with password', () => {
		beforeEach(() => {
			hashStub.mockReturnValue(
				Buffer.from('e09dfc943d65d63f4f31e444c81afc6d5cf442c988fb87180165dd7119d3ae61', 'hex'),
			);
		});

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
						'35e25c6278eaf16891e8bd436615eb5fcd7d94a5bbd553535287a4175c0f8b27a67ee3767c4a7d07d0eaa515679f6c9267c34a3c55c2e921b1ede893e7f6f570de6bbf3bea',
					mac: '0ad2a34f25fe791dcb72f5e0f9b1689566f834efcddcf7f490f4e0962756b5f2',
					kdf: KDF.PBKDF2,
					kdfparams: {
						parallelism: 4,
						iterations: 1000000,
						memorySize: 2024,
						salt: 'c2561895bbfdb396cd70c8c1dd3da6c8',
					},
					cipher: Cipher.AES128GCM,
					cipherparams: {
						iv: 'abd164afd834b9da47ba5d17',
						tag: '457b33c03e2f138b6c334c9cf12195b0',
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
				encryptedMessage = {
					...encryptedMessage,
					kdfparams: {
						...encryptedMessage.kdfparams,
						iterations: 12,
						salt: '245c6859a96339a7735a6cac78ccf625',
					},
					ciphertext:
						'1f06671e13c0329aee057fee995e08a516bdacd287c7ff2714a74be6099713c87bbc3e005c63d4d3d02f8ba89b42810a5854444ad2b76855007a0925fafa7d870875beb010',
					cipherparams: { iv: '3a583b21bbac609c7df3e7e0', tag: '63653f1d4e8d422a42d98b25d3844792' },
				};
				const decrypted = await decryptMessageWithPassword(
					encryptedMessage,
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
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=1&parallelism=4&memorySize=2024';
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
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});

		it('should parse an encrypted passphrase string with custom iterations', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=10000&parallelism=4&memorySize=2024';
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
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});
	});
});
