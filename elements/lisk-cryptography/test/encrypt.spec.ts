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
import {
	EncryptedMessageObject,
	encryptMessageWithPassword,
	decryptMessageWithPassword,
	KDF,
	Cipher,
	parseEncryptedMessage,
	stringifyEncryptedMessage,
	ARGON2_MEMORY,
} from '../src/encrypt';
import * as utils from '../src/utils';

describe('encrypt', () => {
	const regHexadecimal = /[0-9A-Za-z]/g;
	const ARGON2_ITERATIONS = 1;
	const ENCRYPTION_VERSION = '1';
	const defaultPassphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPassword = 'myTotal53cr3t%&';
	const customIterations = 12;

	let hashStub: any;

	beforeEach(async () => {
		hashStub = jest
			.spyOn(utils, 'hash')
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
				expect(encryptedMessage.cipherparams.iv).toHaveLength(32);
			});

			it('should encrypt bytes', async () => {
				encryptedMessage = await encryptMessageWithPassword(utils.getRandomBytes(32), password, {
					kdf: KDF.ARGON2,
				});
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
				ciphertext:
					'f39f2312efdca66d68d7d5c38b4558fe1940fd7cb188ee5ced5fc86be794a6f3bb06c41565932707ba9dfd58b1b1bf98d4a9dc84383367af2216dd541be03693cf9eaadd28faec05aff7e09233bb5419',
				mac: '3dfc6466fce00ddbc16910afbd8c1d3f52f93d85011869323790841c6da5aa09',
				kdf: 'argon2id',
				kdfparams: {
					parallelism: 4,
					iterations: 1,
					memorySize: 2024,
					salt: 'f89fc91a5fe000db',
				},
				cipher: 'aes-128-gcm',
				cipherparams: {
					iv: '17510a4c146da61b52ac66c07cfab795',
					tag: 'ddbb6d2802f79daef42e73cb27611d7d',
				},
				version: '1',
			};

			const stringifiedEncryptedPassphrase =
				'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=f39f2312efdca66d68d7d5c38b4558fe1940fd7cb188ee5ced5fc86be794a6f3bb06c41565932707ba9dfd58b1b1bf98d4a9dc84383367af2216dd541be03693cf9eaadd28faec05aff7e09233bb5419&mac=3dfc6466fce00ddbc16910afbd8c1d3f52f93d85011869323790841c6da5aa09&salt=f89fc91a5fe000db&iv=17510a4c146da61b52ac66c07cfab795&tag=ddbb6d2802f79daef42e73cb27611d7d&iterations=1&parallelism=4&memorySize=2024';
			expect(stringifyEncryptedMessage(encryptedMessage as EncryptedMessageObject)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});

		it('should format an encrypted passphrase with custom iterations as a string', () => {
			const encryptedMessage = {
				ciphertext:
					'f39f2312efdca66d68d7d5c38b4558fe1940fd7cb188ee5ced5fc86be794a6f3bb06c41565932707ba9dfd58b1b1bf98d4a9dc84383367af2216dd541be03693cf9eaadd28faec05aff7e09233bb5419',
				mac: '3dfc6466fce00ddbc16910afbd8c1d3f52f93d85011869323790841c6da5aa09',
				kdf: 'argon2id',
				kdfparams: {
					parallelism: 4,
					iterations: 1000,
					memorySize: 2024,
					salt: 'f89fc91a5fe000db',
				},
				cipher: 'aes-128-gcm',
				cipherparams: {
					iv: '17510a4c146da61b52ac66c07cfab795',
					tag: 'ddbb6d2802f79daef42e73cb27611d7d',
				},
				version: '1',
			};
			const stringifiedEncryptedPassphrase =
				'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=f39f2312efdca66d68d7d5c38b4558fe1940fd7cb188ee5ced5fc86be794a6f3bb06c41565932707ba9dfd58b1b1bf98d4a9dc84383367af2216dd541be03693cf9eaadd28faec05aff7e09233bb5419&mac=3dfc6466fce00ddbc16910afbd8c1d3f52f93d85011869323790841c6da5aa09&salt=f89fc91a5fe000db&iv=17510a4c146da61b52ac66c07cfab795&tag=ddbb6d2802f79daef42e73cb27611d7d&iterations=1000&parallelism=4&memorySize=2024';
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
				'kdf=PBKDF2&cipher=aes-128-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15';
			const encryptedMessage = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac: 'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
					iterations: 1,
					memorySize: ARGON2_MEMORY,
					parallelism: 4,
				},
				cipher: 'aes-128-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});

		it('should parse an encrypted passphrase string with custom iterations', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=PBKDF2&cipher=aes-128-gcm&version=1&ciphertext=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&mac=ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&salt=e8c7dae4c893e458e0ebb8bff9a36d84&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&iterations=12&parallelism=&memorySize=';
			const encryptedMessage = {
				version: '1',
				ciphertext:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				mac: 'ddfgb123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				kdf: 'PBKDF2',
				kdfparams: {
					salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
					iterations: 12,
					memorySize: ARGON2_MEMORY,
					parallelism: 4,
				},
				cipher: 'aes-128-gcm',
				cipherparams: {
					iv: '1a2206e426c714091b7e48f6',
					tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				},
			};
			expect(parseEncryptedMessage(stringifiedEncryptedPassphrase)).toEqual(encryptedMessage);
		});
	});
});
