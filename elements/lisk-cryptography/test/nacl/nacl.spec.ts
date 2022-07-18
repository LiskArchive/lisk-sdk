/*
 * Copyright © 2019 Lisk Foundation
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
import { Keypair } from '../../src/types';
import { makeInvalid } from '../helpers';
import { NaclInterface } from '../../src/nacl/nacl_types';
import * as fast from '../../src/nacl/fast';
import * as slow from '../../src/nacl/slow';

describe('nacl', () => {
	const defaultPublicKey = '7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultPrivateKey =
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultMessage = 'Some default text.';
	const defaultSignature =
		'68937004b6720d7e1902ef05a577e6d9f9ab2756286b1f2ae918f8a0e5153c15e4f410916076f750b708f8979be2430e4cfc7ebb523ae1905d2ea1f5d24ce700';
	const defaultEncryptedMessage =
		'a232e5ea10e18249efc5a0aa8ed68271fc494d02245c52277ee2e14cddd960144a65';
	const defaultNonce = 'df4c8b09e270d2cb3f7b3d53dfa8a6f3441ad3b14a13fb66';
	const defaultHash = '314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d97';
	const defaultDigest = 'aba8462bb7a1460f1e36c36a71f0b7f67d1606562001907c1b2dad08a8ce74ae';
	const defaultConvertedPublicKeyEd2Curve =
		'b8c0eecfd16c1cc4f057a6fc6d8dd3d46e4aa9625408d4bd0ba00e991326fe00';
	const defaultConvertedPrivateKeyEd2Curve =
		'b0e3276b64b086b381e11928e56f966d062dc677b7801cc594aeb2d4193e8d57';

	const libraries = [
		{
			name: 'fast',
			library: fast,
		},
		{
			name: 'slow',
			library: slow,
		},
	];

	interface library {
		name: string;
		library: NaclInterface;
	}

	libraries.forEach((nacl: library) => {
		describe(`${nacl.name}`, () => {
			const {
				box,
				getRandomBytes,
				getKeyPair,
				getPublicKey,
				openBox,
				signDetached,
				verifyDetached,
			}: NaclInterface = nacl.library;

			describe('#getRandomBytes', () => {
				const size = 24;
				let randomBuffer: Buffer;

				beforeEach(async () => {
					randomBuffer = getRandomBytes(size);
					return Promise.resolve();
				});

				it('should return an uint8array', () => {
					expect(Object.prototype.toString.call(randomBuffer)).toEqual('[object Uint8Array]');
				});

				it('should return an uint8array of size 24', () => {
					expect(randomBuffer).toHaveLength(24);
				});
			});

			describe('#getKeyPair', () => {
				let signedKeys: Keypair;

				beforeEach(async () => {
					signedKeys = getKeyPair(Buffer.from(defaultHash, 'hex'));
					return Promise.resolve();
				});

				it('should create a publicKey', () => {
					expect(Buffer.from(signedKeys.publicKey).toString('hex')).toEqual(defaultPublicKey);
				});

				it('should create a publicKey of type uint8array', () => {
					expect(Object.prototype.toString.call(signedKeys.publicKey)).toEqual(
						'[object Uint8Array]',
					);
				});

				it('should create a privateKey', () => {
					expect(Buffer.from(signedKeys.privateKey).toString('hex')).toEqual(defaultPrivateKey);
				});

				it('should create a privateKey of type uint8array', () => {
					expect(Object.prototype.toString.call(signedKeys.privateKey)).toEqual(
						'[object Uint8Array]',
					);
				});
			});

			describe('#getPublicKey', () => {
				let publicKey: Buffer;

				beforeEach(async () => {
					publicKey = getPublicKey(Buffer.from(defaultPrivateKey, 'hex'));

					return Promise.resolve();
				});

				it('should create a publicKey', () => {
					expect(Buffer.from(publicKey).toString('hex')).toEqual(defaultPublicKey);
				});

				it('should create a publicKey when private key is 64 bytes', () => {
					publicKey = getPublicKey(Buffer.from(defaultPrivateKey, 'hex'));
					expect(Buffer.from(publicKey).toString('hex')).toEqual(defaultPublicKey);
				});

				it('should create a publicKey of type uint8array', () => {
					expect(Object.prototype.toString.call(publicKey)).toEqual('[object Uint8Array]');
				});
			});

			describe('#signDetached', () => {
				let signatureBytes: Buffer;

				beforeEach(async () => {
					signatureBytes = signDetached(
						Buffer.from(defaultDigest, 'hex'),
						Buffer.from(defaultPrivateKey, 'hex'),
					);
					return Promise.resolve();
				});

				it('should create a signature', () => {
					expect(Buffer.from(signatureBytes).toString('hex')).toEqual(defaultSignature);
				});

				it('should create a signature of type uint8array', () => {
					expect(Object.prototype.toString.call(signatureBytes)).toEqual('[object Uint8Array]');
				});
			});

			describe('#verifyDetached', () => {
				it('should return false if the signature is invalid', () => {
					const verification = verifyDetached(
						Buffer.from(defaultDigest, 'hex'),
						makeInvalid(Buffer.from(defaultSignature, 'hex')),
						Buffer.from(defaultPublicKey, 'hex'),
					);
					expect(verification).toBe(false);
				});

				it('should return true if the signature is valid', () => {
					const verification = verifyDetached(
						Buffer.from(defaultDigest, 'hex'),
						Buffer.from(defaultSignature, 'hex'),
						Buffer.from(defaultPublicKey, 'hex'),
					);
					expect(verification).toBe(true);
				});
			});

			describe('#box', () => {
				let encryptedMessageBytes: Buffer;

				beforeEach(async () => {
					encryptedMessageBytes = box(
						Buffer.from(defaultMessage, 'utf8'),
						Buffer.from(defaultNonce, 'hex'),
						Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
						Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
					);
					return Promise.resolve();
				});

				it('should encrypt a message', () => {
					expect(Buffer.from(encryptedMessageBytes).toString('hex')).toEqual(
						defaultEncryptedMessage,
					);
				});
			});

			describe('#openBox', () => {
				let decryptedMessageBytes: Buffer;

				beforeEach(async () => {
					decryptedMessageBytes = openBox(
						Buffer.from(defaultEncryptedMessage, 'hex'),
						Buffer.from(defaultNonce, 'hex'),
						Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
						Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
					);
					return Promise.resolve();
				});

				it('should decrypt a message', () => {
					expect(Buffer.from(decryptedMessageBytes).toString('utf8')).toEqual(defaultMessage);
				});

				it('should throw an error for an invalid message', () => {
					expect(
						openBox.bind(
							null,
							Buffer.from('abcdef1234567890abcdef1234567890abcdef1234567890', 'hex'),
							Buffer.from(defaultNonce, 'hex'),
							Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
							Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
						),
					).toThrow(Error);
				});
			});

			describe('integration tests', () => {
				it('should encrypt a given message with a nonce and converted key pair, and decrypt it back to the original message', () => {
					const encryptedMessageBytes = box(
						Buffer.from(defaultMessage, 'utf8'),
						Buffer.from(defaultNonce, 'hex'),
						Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
						Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
					);
					const decryptedMessageBytes = openBox(
						encryptedMessageBytes,
						Buffer.from(defaultNonce, 'hex'),
						Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
						Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
					);
					expect(Buffer.from(decryptedMessageBytes).toString('utf8')).toBe(defaultMessage);
				});

				it('should sign a given message and verify it using the same signature', () => {
					const signatureBytes = signDetached(
						Buffer.from(defaultDigest, 'hex'),
						Buffer.from(defaultPrivateKey, 'hex'),
					);
					const verification = verifyDetached(
						Buffer.from(defaultDigest, 'hex'),
						signatureBytes,
						Buffer.from(defaultPublicKey, 'hex'),
					);
					expect(verification).toBe(true);
				});
			});
		});
	});
});
