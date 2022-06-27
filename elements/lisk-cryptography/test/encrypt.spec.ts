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
import { MAX_UINT32 } from '../src/constants';
import {
	EncryptedPassphraseObject,
	EncryptedMessageWithNonce,
	encryptMessageWithPassphrase,
	decryptMessageWithPassphrase,
	encryptPassphraseWithPassword,
	decryptPassphraseWithPassword,
	getKeyPairFromPhraseAndPath,
	KDF,
	Cipher,
	getBLSPrivateKeyFromPhraseAndPath,
} from '../src/encrypt';
// Require is used for stubbing
// eslint-disable-next-line
const convert = require('../src/convert');
// eslint-disable-next-line
const keys = require('../src/keys');
// eslint-disable-next-line
const hashModule = require('../src/hash');

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
			.spyOn(convert, 'convertPrivateKeyEd2Curve')
			.mockReturnValue(
				Buffer.from('d8be8cacb03fb02f34e85030f902b635f364d6c23f090c7640e9dc9c568e7d5e', 'hex'),
			);
		jest
			.spyOn(convert, 'convertPublicKeyEd2Curve')
			.mockReturnValue(
				Buffer.from('f245e78c83196d73452e55581ef924a1b792d352c142257aa3af13cded2e7905', 'hex'),
			);

		jest.spyOn(keys, 'getAddressAndPublicKeyFromPassphrase').mockImplementation(() => {
			return {
				privateKey: defaultPrivateKey,
				publicKey: defaultPublicKey,
			};
		});

		hashStub = jest
			.spyOn(hashModule, 'hash')
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

		describe('getKeyPairFromPhraseAndPath', () => {
			const passphrase =
				'target cancel solution recipe vague faint bomb convince pink vendor fresh patrol';
			it('should get keypair from valid phrase and path', async () => {
				const { publicKey, privateKey } = await getKeyPairFromPhraseAndPath(
					passphrase,
					`m/44'/134'/0'`,
				);
				expect(publicKey.toString('hex')).toBe(
					'c6bae83af23540096ac58d5121b00f33be6f02f05df785766725acdd5d48be9d',
				);
				expect(privateKey.toString('hex')).toBe(
					'c465dfb15018d3aef0d94d411df048e240e87a3ec9cd6d422cea903bfc101f61c6bae83af23540096ac58d5121b00f33be6f02f05df785766725acdd5d48be9d',
				);
			});

			it('should fail for empty string path', async () => {
				await expect(getKeyPairFromPhraseAndPath(passphrase, '')).rejects.toThrow(
					'Invalid path format',
				);
			});

			it('should fail if path does not start with "m"', async () => {
				await expect(getKeyPairFromPhraseAndPath(passphrase, `/44'/134'/0'`)).rejects.toThrow(
					'Invalid path format',
				);
			});

			it('should fail if path does not include at least one "/"', async () => {
				await expect(getKeyPairFromPhraseAndPath(passphrase, 'm441340')).rejects.toThrow(
					'Invalid path format',
				);
			});

			it('should fail for path with invalid segment', async () => {
				await expect(
					getKeyPairFromPhraseAndPath(
						passphrase,
						`m//134'/0'`, // should be number with or without ' between every back slash
					),
				).rejects.toThrow('Invalid path format');
			});

			it('should fail for path with invalid characters', async () => {
				await expect(getKeyPairFromPhraseAndPath(passphrase, `m/a'/134b'/0'`)).rejects.toThrow(
					'Invalid path format',
				);
			});

			it('should fail for path with non-sanctioned special characters', async () => {
				await expect(getKeyPairFromPhraseAndPath(passphrase, `m/4a'/#134b'/0'`)).rejects.toThrow(
					'Invalid path format',
				);
			});

			it(`should fail for path with segment greater than ${MAX_UINT32} / 2`, async () => {
				await expect(
					getKeyPairFromPhraseAndPath(passphrase, `m/44'/134'/${MAX_UINT32}'`),
				).rejects.toThrow('Invalid path format');
			});
		});

		describe('getBLSPrivateKeyFromPhraseAndPath', () => {
			const passphrase =
				'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
			it('should get keypair from valid phrase and path', async () => {
				const privateKey = await getBLSPrivateKeyFromPhraseAndPath(passphrase, `m/12381`);
				expect(privateKey.toString('hex')).toBe(
					BigInt(
						'27531519788986738912817629815232258573173656766051821145387425994698573826996',
					).toString(16),
				);
			});
		});
	});
});
