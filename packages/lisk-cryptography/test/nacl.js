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
// Require is used for stubbing
const hash = require('../src/hash');
const sign = require('../src/sign');
const convert = require('../src/convert');
const nacl = require('../src/nacl/nacl');

const {
	randombytes,
	signKeyPair,
	signDetached,
	detachedVerify,
	box,
	boxOpen,
} = nacl;

const makeInvalid = str => {
	const char = str[0] === '0' ? '1' : '0';
	return `${char}${str.slice(1)}`;
};

describe('nacl', () => {
	const CRYPTO_SIGN_PUBLICKEYBYTES = 32;
	const CRYPTO_SIGN_PRIVATEKEYBYTES = 64;
	const CRYPTO_SIGN_BYTES = 64;
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

	let hashStub;
	let digestMessageStub;
	let convertPublicKeyEd2CurveStub;
	let convertPrivateKeyEd2CurveStub;

	beforeEach(() => {
		hashStub = sandbox
			.stub(hash, 'default')
			.returns(
				Buffer.from(
					'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d97',
					'hex',
				),
			);
		digestMessageStub = sandbox
			.stub(sign, 'digestMessage')
			.withArgs(defaultMessage)
			.returns(
				Buffer.from(
					'aba8462bb7a1460f1e36c36a71f0b7f67d1606562001907c1b2dad08a8ce74ae',
					'hex',
				),
			);
		convertPublicKeyEd2CurveStub = sandbox
			.stub(convert, 'convertPublicKeyEd2Curve')
			.returns(
				Buffer.from(
					'b8c0eecfd16c1cc4f057a6fc6d8dd3d46e4aa9625408d4bd0ba00e991326fe00',
					'hex',
				),
			);
		convertPrivateKeyEd2CurveStub = sandbox
			.stub(convert, 'convertPrivateKeyEd2Curve')
			.returns(
				Buffer.from(
					'b0e3276b64b086b381e11928e56f966d062dc677b7801cc594aeb2d4193e8d57',
					'hex',
				),
			);
		return Promise.resolve();
	});

	describe('#randombytes', () => {
		const size = 24;
		let randomBuffer;
		beforeEach(() => {
			randomBuffer = randombytes(size);
			return Promise.resolve();
		});

		it('should return a buffer', () => {
			return expect(Buffer.from(randomBuffer)).to.be.instanceOf(Buffer);
		});
	});

	describe('#signKeyPair', () => {
		let hashedSeed;
		let signedKeys;
		beforeEach(() => {
			hashedSeed = hashStub();
			signedKeys = signKeyPair(Buffer.from(hashedSeed));
			return Promise.resolve();
		});

		it('should create a buffer publicKey', () => {
			return expect(
				Buffer.from(signedKeys.publicKeyBytes).toString('hex'),
			).to.be.eql(defaultPublicKey);
		});

		it('should create a buffer privateKey', () => {
			return expect(
				Buffer.from(signedKeys.privateKeyBytes).toString('hex'),
			).to.be.eql(defaultPrivateKey);
		});

		it('should return publicKeyBytes with buffer of length 32', () => {
			return expect(signedKeys.publicKeyBytes.length).to.be.eql(
				CRYPTO_SIGN_PUBLICKEYBYTES,
			);
		});

		it('should return privateKeyBytes with buffer of length 64', () => {
			return expect(signedKeys.privateKeyBytes.length).to.be.eql(
				CRYPTO_SIGN_PRIVATEKEYBYTES,
			);
		});
	});

	describe('#signDetached', () => {
		let msgBytes;
		let signatureBytes;
		beforeEach(() => {
			msgBytes = digestMessageStub();
			signatureBytes = signDetached(
				msgBytes,
				Buffer.from(defaultPrivateKey, 'hex'),
			);
			return Promise.resolve();
		});

		it('should create a buffer signature', () => {
			return expect(Buffer.from(signatureBytes).toString('hex')).to.be.eql(
				defaultSignature,
			);
		});

		it('should return signatureBytes with buffer of length 64', () => {
			return expect(signatureBytes.length).to.be.eql(CRYPTO_SIGN_BYTES);
		});
	});

	describe('#detachedVerify', () => {
		let msgBytes;
		beforeEach(() => {
			msgBytes = digestMessageStub();
			return Promise.resolve();
		});

		it('should return false if the signature is invalid', () => {
			const verification = detachedVerify(
				msgBytes,
				Buffer.from(makeInvalid(defaultSignature), 'hex'),
				Buffer.from(defaultPublicKey, 'hex'),
			);
			return expect(verification).to.be.false;
		});

		it('should return true if the signature is valid', () => {
			const verification = detachedVerify(
				msgBytes,
				Buffer.from(defaultSignature, 'hex'),
				Buffer.from(defaultPublicKey, 'hex'),
			);
			return expect(verification).to.be.true;
		});
	});

	describe('encrypt and decrypt message with converted key pair and nonce', () => {
		let convertedPublicKey;
		let convertedPrivateKey;

		beforeEach(() => {
			convertedPublicKey = convertPublicKeyEd2CurveStub();
			convertedPrivateKey = convertPrivateKeyEd2CurveStub();
			return Promise.resolve();
		});

		describe('#box', () => {
			let encryptedMessageBytes;

			beforeEach(() => {
				encryptedMessageBytes = box(
					Buffer.from(defaultMessage, 'utf8'),
					Buffer.from(defaultNonce, 'hex'),
					convertedPublicKey,
					convertedPrivateKey,
				);
				return Promise.resolve();
			});

			it('should encrypt a message', () => {
				return expect(
					Buffer.from(encryptedMessageBytes).toString('hex'),
				).to.be.eql(defaultEncryptedMessage);
			});
		});

		describe('#boxOpen', () => {
			let decryptedMessageBytes;

			beforeEach(() => {
				decryptedMessageBytes = boxOpen(
					Buffer.from(defaultEncryptedMessage, 'hex'),
					Buffer.from(defaultNonce, 'hex'),
					Buffer.from(convertedPublicKey, 'hex'),
					Buffer.from(convertedPrivateKey, 'hex'),
				);
				return Promise.resolve();
			});

			it('should decrypt a message', () => {
				return expect(
					Buffer.from(decryptedMessageBytes).toString('utf8'),
				).to.be.eql(defaultMessage);
			});
		});
	});
});
