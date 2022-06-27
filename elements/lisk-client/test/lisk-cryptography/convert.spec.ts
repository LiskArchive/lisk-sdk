/*
 * Copyright © 2020 Lisk Foundation
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

import { cryptography } from '../../src';

const {
	getFirstEightBytesReversed,
	convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve,
	stringifyEncryptedPassphrase,
	parseEncryptedPassphrase,
} = cryptography;

describe('convert', () => {
	// keys for passphrase 'secret';
	const defaultPrivateKey =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKey = Buffer.from(
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		'hex',
	);
	const defaultPrivateKeyCurve = Buffer.from(
		'68b211b2c01cc88690ba76a07895a5b4805e1c11fdd3af4c863e6d4efeb14378',
		'hex',
	);
	const defaultPublicKeyCurve = Buffer.from(
		'6f9d780305bda43dd47a291d897f2d8845a06160632d82fb1f209fdd46ed3c1e',
		'hex',
	);
	const defaultStringWithMoreThanEightCharacters = '0123456789';
	const defaultFirstEightCharactersReversed = '76543210';

	describe('#getFirstEightBytesReversed', () => {
		it('should get the first eight bytes reversed from a Buffer', () => {
			const bufferEntry = Buffer.from(defaultStringWithMoreThanEightCharacters);
			const reversedAndCut = getFirstEightBytesReversed(bufferEntry);
			expect(reversedAndCut).toEqual(Buffer.from(defaultFirstEightCharactersReversed));
		});

		it('should get the first eight bytes reversed from a string', () => {
			const reversedAndCut = getFirstEightBytesReversed(defaultStringWithMoreThanEightCharacters);
			expect(reversedAndCut).toEqual(Buffer.from(defaultFirstEightCharactersReversed));
		});
	});

	describe('#convertPublicKeyEd2Curve', () => {
		it('should convert publicKey ED25519 to Curve25519 key', () => {
			const result = convertPublicKeyEd2Curve(defaultPublicKey);
			expect(result).not.toBeNull();
			const curveRepresentation = result as Buffer;
			expect(defaultPublicKeyCurve.equals(Buffer.from(curveRepresentation))).toBe(true);
		});
	});

	describe('#convertPrivateKeyEd2Curve', () => {
		it('should convert privateKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPrivateKeyEd2Curve(Buffer.from(defaultPrivateKey, 'hex'));
			expect(defaultPrivateKeyCurve.equals(Buffer.from(curveRepresentation))).toBe(true);
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
			expect(stringifyEncryptedPassphrase(encryptedPassphrase as any)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});

		it('should format an encrypted passphrase with custom iterations as a string', () => {
			const encryptedPassphrase = {
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
			expect(stringifyEncryptedPassphrase(encryptedPassphrase as any)).toBe(
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
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=1&parallelism=4&memorySize=2024';
			const encryptedPassphrase = {
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
			expect(parseEncryptedPassphrase(stringifiedEncryptedPassphrase)).toEqual(encryptedPassphrase);
		});

		it('should parse an encrypted passphrase string with custom iterations', () => {
			const stringifiedEncryptedPassphrase =
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=fc8cdb068314590fa7e3156c60bf4a6b1f908f91bb81c79319e858cead7fba581101167c12a4f63acf86908b5c2d7dad96246cd9cd25bc8adca61d7301925869e8bf5cf2a573ae9e5a84e4&mac=997afad0b38f2d47f347648994a65e8d7ec46feec92720ab629a77cc11875c4d&salt=d3228c53c27a44cbd9d88ea0919bdade&iv=b5c86483366f4698708e6985&tag=5d6c0f628ba12930111c33ef678b2319&iterations=10000&parallelism=4&memorySize=2024';
			const encryptedPassphrase = {
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
			expect(parseEncryptedPassphrase(stringifiedEncryptedPassphrase)).toEqual(encryptedPassphrase);
		});
	});
});
