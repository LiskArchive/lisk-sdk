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
	EncryptedPassphraseObject,
	EncryptedMessageWithNonce,
	encryptMessageWithPassphrase,
	decryptMessageWithPassphrase,
	encryptPassphraseWithPassword,
	decryptPassphraseWithPassword,
} from '../src/encrypt';
// Require is used for stubbing
const convert = require('../src/convert');
const keys = require('../src/keys');
const hashModule = require('../src/hash');

describe('encrypt', () => {
	const regHexadecimal: RegExp = /[0-9A-Za-z]/g;
	const PBKDF2_ITERATIONS = 1e6;
	const ENCRYPTION_VERSION = '1';
	const defaultPassphrase =
		'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPrivateKey =
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultPublicKey =
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultSecondPassphrase = 'second secret';
	const defaultSecondPrivateKey =
		'9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultSecondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultMessage = 'Some default text.';
	const defaultPassword = 'myTotal53cr3t%&';
	const customIterations = 12;

	let defaultEncryptedMessageWithNonce: EncryptedMessageWithNonce;

	let hashStub: any;

	beforeEach(() => {
		defaultEncryptedMessageWithNonce = {
			encryptedMessage:
				'299390b9cbb92fe6a43daece2ceaecbacd01c7c03cfdba51d693b5c0e2b65c634115',
			nonce: 'df4c8b09e270d2cb3f7b3d53dfa8a6f3441ad3b14a13fb66',
		};
		jest
			.spyOn(convert, 'convertPrivateKeyEd2Curve')
			.mockReturnValue(
				Buffer.from(
					'd8be8cacb03fb02f34e85030f902b635f364d6c23f090c7640e9dc9c568e7d5e',
					'hex',
				),
			);
		jest
			.spyOn(convert, 'convertPublicKeyEd2Curve')
			.mockReturnValue(
				Buffer.from(
					'f245e78c83196d73452e55581ef924a1b792d352c142257aa3af13cded2e7905',
					'hex',
				),
			);

		jest
			.spyOn(keys, 'getPrivateAndPublicKeyBytesFromPassphrase')
			.mockImplementation((passphrase: any) => {
				if (passphrase === defaultPassphrase) {
					return {
						privateKey: Buffer.from(defaultPrivateKey, 'hex'),
						publicKey: Buffer.from(defaultPublicKey, 'hex'),
					};
				}

				return {
					privateKey: Buffer.from(defaultSecondPrivateKey, 'hex'),
					publicKey: Buffer.from(defaultSecondPublicKey, 'hex'),
				};
			});

		hashStub = jest
			.spyOn(hashModule, 'hash')
			.mockReturnValue(
				Buffer.from(
					'd43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760',
					'hex',
				),
			);
		return Promise.resolve();
	});

	describe('#encryptMessageWithPassphrase', () => {
		let encryptedMessage: EncryptedMessageWithNonce;

		beforeEach(() => {
			encryptedMessage = encryptMessageWithPassphrase(
				defaultMessage,
				defaultPassphrase,
				defaultPublicKey,
			);
			return Promise.resolve();
		});

		test('should encrypt a message', () => {
			// TODO: Add Hex string assertion check
			expect(encryptedMessage).toHaveProperty('encryptedMessage');
			expect(regHexadecimal.test(encryptedMessage.encryptedMessage)).toBe(true);
		});

		test('should output the nonce', () => {
			// TODO: Add Hex string assertion check
			expect(encryptedMessage);
			expect(encryptedMessage).toHaveProperty('nonce');
			expect(regHexadecimal.test(encryptedMessage.nonce)).toBe(true);
		});
	});

	describe('#decryptMessageWithPassphrase', () => {
		test('should be able to decrypt the message correctly using the receiver’s secret passphrase', () => {
			const decryptedMessage = decryptMessageWithPassphrase(
				defaultEncryptedMessageWithNonce.encryptedMessage,
				defaultEncryptedMessageWithNonce.nonce,
				defaultPassphrase,
				defaultPublicKey,
			);

			expect(decryptedMessage).toBe(defaultMessage);
		});

		test('should inform the user if the nonce is the wrong length', () => {
			expect(
				decryptMessageWithPassphrase.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultPassphrase,
					defaultPublicKey,
				),
			).toThrowError('Expected nonce to be 24 bytes.');
		});

		test('should inform the user if something goes wrong during decryption', () => {
			expect(
				decryptMessageWithPassphrase.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultEncryptedMessageWithNonce.nonce,
					defaultSecondPassphrase,
					defaultPublicKey,
				),
			).toThrowError(
				'Something went wrong during decryption. Is this the full encrypted message?',
			);
		});
	});

	describe('encrypt and decrypt passphrase with password', () => {
		beforeEach(() => {
			hashStub.mockReturnValue(
				Buffer.from(
					'e09dfc943d65d63f4f31e444c81afc6d5cf442c988fb87180165dd7119d3ae61',
					'hex',
				),
			);
		});

		describe('#encryptPassphraseWithPassword', () => {
			let startTime: number;
			let encryptedPassphrase: EncryptedPassphraseObject;

			beforeEach(() => {
				startTime = Date.now();
				encryptedPassphrase = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
				return Promise.resolve();
			});

			test('should encrypt a passphrase', () => {
				// TODO: Add Hex string assertion check
				expect(encryptedPassphrase).toMatchObject({
					cipherText: expect.any(String),
				});
				expect(encryptedPassphrase).toHaveProperty('cipherText');
				expect(regHexadecimal.test(encryptedPassphrase.iv)).toBe(true);
				expect(encryptedPassphrase.iv).toHaveLength(24);
			});

			test('should output the IV', () => {
				expect(encryptedPassphrase).toHaveProperty('iv');
				expect(encryptedPassphrase.iv).toHaveLength(24);
			});

			test('should output the salt', () => {
				expect(encryptedPassphrase).toHaveProperty('salt');
				expect(encryptedPassphrase.salt).toHaveLength(32);
			});

			test('should output the tag', () => {
				expect(encryptedPassphrase).toHaveProperty('tag');
				expect(encryptedPassphrase.tag).toHaveLength(32);
			});

			test('should output the current version of Lisk Elements', () => {
				expect(encryptedPassphrase).toHaveProperty(
					'version',
					ENCRYPTION_VERSION,
				);
			});

			test('should output the default number of iterations', () => {
				expect(encryptedPassphrase).toHaveProperty(
					'iterations',
					PBKDF2_ITERATIONS,
				);
			});

			test('should take more than 0.25 seconds @node-only', () => {
				const endTime = Date.now();
				expect(endTime - startTime).toBeGreaterThan(250);
			});

			test('should take less than 2 seconds @node-only', () => {
				const endTime = Date.now();
				expect(endTime - startTime).toBeLessThan(2e3);
			});

			test('should accept and output a custom number of iterations', () => {
				const encryptedPassphraseWithIterations = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					customIterations,
				);

				expect(encryptedPassphraseWithIterations).toMatchObject({
					iterations: customIterations,
				});
			});
		});

		describe('#decryptPassphraseWithPassword', () => {
			let encryptedPassphrase = {
				iterations: undefined,
				cipherText:
					'5cfd7bcc13022a482e7c8bd250cd73ef3eb7c49c849d5e761ce717608293f777cca8e0e18587ee307beab65bcc1b273caeb23d4985010b675391b354c38f8e84e342c1e7aa',
				iv: '7b820ad6936a63152d13ffa2',
				salt: 'b60036ab30da7af68c6ecf370471ce1b',
				tag: '336c68fa92d414c229e5638249847774',
				version: '1',
			};

			test('should decrypt a passphrase with a password', () => {
				const decrypted = decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				expect(decrypted).toBe(defaultPassphrase);
			});

			test('should inform the user if cipherText is missing', () => {
				const {
					cipherText,
					...encryptedPassphraseWithoutCipherText
				} = encryptedPassphrase;
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithoutCipherText as any,
						defaultPassword,
					),
				).toThrowError('Cipher text must be a string.');
			});

			test('should inform the user if iv is missing', () => {
				const { iv, ...encryptedPassphraseWithoutIv } = encryptedPassphrase;
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithoutIv as any,
						defaultPassword,
					),
				).toThrowError('IV must be a string.');
			});

			test('should inform the user if salt is missing', () => {
				const { salt, ...encryptedPassphraseWithoutSalt } = encryptedPassphrase;
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithoutSalt as any,
						defaultPassword,
					),
				).toThrowError('Salt must be a string.');
			});

			test('should inform the user if tag is missing', () => {
				const { tag, ...encryptedPassphraseWithoutTag } = encryptedPassphrase;
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithoutTag as any,
						defaultPassword,
					),
				).toThrowError('Tag must be a string.');
			});

			test('should inform the user if the salt has been altered', () => {
				const { salt, ...encryptedPassphraseWithoutSalt } = encryptedPassphrase;
				const encryptedPassphraseWithAlteredSalt = {
					salt: `00${encryptedPassphrase.salt.slice(2)}`,
					...encryptedPassphraseWithoutSalt,
				};
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithAlteredSalt,
						defaultPassword,
					),
				).toThrowError('Unsupported state or unable to authenticate data');
			});

			test('should inform the user if the tag has been shortened', () => {
				const { tag, ...encryptedPassphraseWithoutTag } = encryptedPassphrase;
				const encryptedPassphraseWithAlteredTag = {
					tag: encryptedPassphrase.tag.slice(0, 30),
					...encryptedPassphraseWithoutTag,
				};
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithAlteredTag,
						defaultPassword,
					),
				).toThrowError('Tag must be 16 bytes.');
			});

			test('should inform the user if the tag is not a hex string', () => {
				const { tag, ...encryptedPassphraseWithoutTag } = encryptedPassphrase;
				const encryptedPassphraseWithAlteredTag = {
					tag: `${encryptedPassphrase.tag.slice(0, 30)}gg`,
					...encryptedPassphraseWithoutTag,
				};
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithAlteredTag,
						defaultPassword,
					),
				).toThrowError('Tag must be a valid hex string.');
			});

			test('should inform the user if the tag has been altered', () => {
				const { tag, ...encryptedPassphraseWithoutTag } = encryptedPassphrase;
				const encryptedPassphraseWithAlteredTag = {
					tag: `00${encryptedPassphrase.tag.slice(2)}`,
					...encryptedPassphraseWithoutTag,
				};
				expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphraseWithAlteredTag,
						defaultPassword,
					),
				).toThrowError('Unsupported state or unable to authenticate data');
			});

			test('should decrypt a passphrase with a password and a custom number of iterations', () => {
				const encryptedPassphraseWithCustomIterations = {
					iterations: 12,
					cipherText:
						'1f06671e13c0329aee057fee995e08a516bdacd287c7ff2714a74be6099713c87bbc3e005c63d4d3d02f8ba89b42810a5854444ad2b76855007a0925fafa7d870875beb010',
					iv: '3a583b21bbac609c7df3e7e0',
					salt: '245c6859a96339a7735a6cac78ccf625',
					tag: '63653f1d4e8d422a42d98b25d3844792',
					version: '1',
				};
				const decrypted = decryptPassphraseWithPassword(
					encryptedPassphraseWithCustomIterations,
					defaultPassword,
				);
				expect(decrypted).toBe(defaultPassphrase);
			});
		});

		describe('integration test', () => {
			test('should encrypt a given passphrase with a password and decrypt it back to the original passphrase @node-only', () => {
				const encryptedPassphrase = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
				const decryptedString = decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});

			test('should encrypt a given passphrase with a password and custom number of iterations and decrypt it back to the original passphrase @node-only', () => {
				const encryptedPassphrase = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					customIterations,
				);
				const decryptedString = decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				expect(decryptedString).toBe(defaultPassphrase);
			});
		});
	});
});
