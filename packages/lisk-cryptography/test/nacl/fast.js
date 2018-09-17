/*
 * Copyright © 2018 Lisk Foundation
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
import { makeInvalid } from '../helpers';
import {
	box,
	boxOpen,
	detachedSign,
	detachedVerify,
	getRandomBytes,
	signKeyPair,
} from '../../src/nacl/fast';

describe('sodium', () => {
	const defaultPublicKey =
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultPrivateKey =
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultMessage = 'Some default text.';
	const defaultSignature =
		'68937004b6720d7e1902ef05a577e6d9f9ab2756286b1f2ae918f8a0e5153c15e4f410916076f750b708f8979be2430e4cfc7ebb523ae1905d2ea1f5d24ce700';
	const defaultEncryptedMessage =
		'a232e5ea10e18249efc5a0aa8ed68271fc494d02245c52277ee2e14cddd960144a65';
	const defaultNonce = 'df4c8b09e270d2cb3f7b3d53dfa8a6f3441ad3b14a13fb66';
	const defaultHash =
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d97';
	const defaultDigest =
		'aba8462bb7a1460f1e36c36a71f0b7f67d1606562001907c1b2dad08a8ce74ae';
	const defaultConvertedPublicKeyEd2Curve =
		'b8c0eecfd16c1cc4f057a6fc6d8dd3d46e4aa9625408d4bd0ba00e991326fe00';
	const defaultConvertedPrivateKeyEd2Curve =
		'b0e3276b64b086b381e11928e56f966d062dc677b7801cc594aeb2d4193e8d57';

	describe('#getRandomBytes', () => {
		const size = 24;
		let randomBuffer;
		beforeEach(() => {
			randomBuffer = getRandomBytes(size);
			return Promise.resolve();
		});

		it('should return a buffer', () => {
			return expect(randomBuffer).to.be.instanceOf(Buffer);
		});
	});

	describe('#signKeyPair', () => {
		let signedKeys;
		beforeEach(() => {
			signedKeys = signKeyPair(Buffer.from(defaultHash, 'hex'));
			return Promise.resolve();
		});

		it('should create a publicKey', () => {
			return expect(signedKeys.publicKeyBytes.toString('hex')).to.be.eql(
				defaultPublicKey,
			);
		});
		it('should create a publicKey of type buffer', () => {
			return expect(signedKeys.privateKeyBytes).to.be.instanceOf(Buffer);
		});
		it('should create a privateKey', () => {
			return expect(signedKeys.privateKeyBytes.toString('hex')).to.be.eql(
				defaultPrivateKey,
			);
		});
		it('should create a privateKey of type buffer', () => {
			return expect(signedKeys.privateKeyBytes).to.be.instanceOf(Buffer);
		});
	});

	describe('#detachedSign', () => {
		let signatureBytes;
		beforeEach(() => {
			signatureBytes = detachedSign(
				Buffer.from(defaultDigest, 'hex'),
				Buffer.from(defaultPrivateKey, 'hex'),
			);
			return Promise.resolve();
		});

		it('should create a signature', () => {
			return expect(signatureBytes.toString('hex')).to.be.eql(defaultSignature);
		});
		it('should create a signature of type buffer', () => {
			return expect(signatureBytes).to.be.instanceOf(Buffer);
		});
	});

	describe('#detachedVerify', () => {
		it('should return false if the signature is invalid', () => {
			const verification = detachedVerify(
				Buffer.from(defaultDigest, 'hex'),
				Buffer.from(makeInvalid(defaultSignature), 'hex'),
				Buffer.from(defaultPublicKey, 'hex'),
			);
			return expect(verification).to.be.false;
		});
		it('should return true if the signature is valid', () => {
			const verification = detachedVerify(
				Buffer.from(defaultDigest, 'hex'),
				Buffer.from(defaultSignature, 'hex'),
				Buffer.from(defaultPublicKey, 'hex'),
			);
			return expect(verification).to.be.true;
		});
	});

	describe('encrypt and decrypt message with converted key pair and nonce', () => {
		describe('#box', () => {
			let encryptedMessageBytes;
			beforeEach(() => {
				encryptedMessageBytes = box(
					Buffer.from(defaultMessage, 'utf8'),
					Buffer.from(defaultNonce, 'hex'),
					Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
					Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
				);
				return Promise.resolve();
			});

			it('should encrypt a message', () => {
				return expect(encryptedMessageBytes.toString('hex')).to.be.eql(
					defaultEncryptedMessage,
				);
			});
		});

		describe('#boxOpen', () => {
			let decryptedMessageBytes;
			beforeEach(() => {
				decryptedMessageBytes = boxOpen(
					Buffer.from(defaultEncryptedMessage, 'hex'),
					Buffer.from(defaultNonce, 'hex'),
					Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
					Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
				);
				return Promise.resolve();
			});

			it('should decrypt a message', () => {
				return expect(decryptedMessageBytes.toString('utf8')).to.be.eql(
					defaultMessage,
				);
			});
		});

		describe('integration test', () => {
			it('should encrypt a given message with a nonce and converted key pair, and decrypt it back to the original message', () => {
				const encryptedMessageBytes = box(
					Buffer.from(defaultMessage, 'utf8'),
					Buffer.from(defaultNonce, 'hex'),
					Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
					Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
				);
				const decryptedMessageBytes = boxOpen(
					encryptedMessageBytes,
					Buffer.from(defaultNonce, 'hex'),
					Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
					Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
				);
				return expect(decryptedMessageBytes.toString('utf8')).to.equal(
					defaultMessage,
				);
			});
			it('should sign a given message and verify it using the same signature', () => {
				const signatureBytes = detachedSign(
					Buffer.from(defaultDigest, 'hex'),
					Buffer.from(defaultPrivateKey, 'hex'),
				);
				const verification = detachedVerify(
					Buffer.from(defaultDigest, 'hex'),
					signatureBytes,
					Buffer.from(defaultPublicKey, 'hex'),
				);
				return expect(verification).to.be.true;
			});
		});
	});
});
