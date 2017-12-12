/*
 * Copyright © 2017 Lisk Foundation
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
	encryptMessageWithPassphrase,
	decryptMessageWithPassphrase,
	encryptPassphraseWithPassword,
	decryptPassphraseWithPassword,
} from '../../src/crypto/encrypt';

const convert = require('../../src/crypto/convert');
const keys = require('../../src/crypto/keys');
const hash = require('../../src/crypto/hash');

describe('encrypt', () => {
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

	let defaultEncryptedMessageWithNonce;

	let getPrivateAndPublicKeyBytesFromPassphraseStub;
	let hashStub;

	beforeEach(() => {
		defaultEncryptedMessageWithNonce = {
			encryptedMessage:
				'299390b9cbb92fe6a43daece2ceaecbacd01c7c03cfdba51d693b5c0e2b65c634115',
			nonce: 'df4c8b09e270d2cb3f7b3d53dfa8a6f3441ad3b14a13fb66',
		};
		sandbox
			.stub(convert, 'convertPrivateKeyEd2Curve')
			.returns(
				Buffer.from(
					'd8be8cacb03fb02f34e85030f902b635f364d6c23f090c7640e9dc9c568e7d5e',
					'hex',
				),
			);
		sandbox
			.stub(convert, 'convertPublicKeyEd2Curve')
			.returns(
				Buffer.from(
					'f245e78c83196d73452e55581ef924a1b792d352c142257aa3af13cded2e7905',
					'hex',
				),
			);

		getPrivateAndPublicKeyBytesFromPassphraseStub = sandbox.stub(
			keys,
			'getPrivateAndPublicKeyBytesFromPassphrase',
		);
		getPrivateAndPublicKeyBytesFromPassphraseStub
			.withArgs(defaultPassphrase)
			.returns({
				privateKey: Buffer.from(defaultPrivateKey, 'hex'),
				publicKey: Buffer.from(defaultPublicKey, 'hex'),
			});
		getPrivateAndPublicKeyBytesFromPassphraseStub
			.withArgs(defaultSecondPassphrase)
			.returns({
				privateKey: Buffer.from(defaultSecondPrivateKey, 'hex'),
				publicKey: Buffer.from(defaultSecondPublicKey, 'hex'),
			});

		hashStub = sandbox
			.stub(hash, 'default')
			.returns(
				Buffer.from(
					'd43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760',
					'hex',
				),
			);
	});

	describe('#encryptMessageWithPassphrase', () => {
		let encryptedMessage;

		beforeEach(() => {
			encryptedMessage = encryptMessageWithPassphrase(
				defaultMessage,
				defaultPassphrase,
				defaultPublicKey,
			);
		});

		it('should encrypt a message', () => {
			encryptedMessage.should.have
				.property('encryptedMessage')
				.be.hexString()
				.with.length(68);
		});

		it('should output the nonce', () => {
			encryptedMessage.should.have
				.property('nonce')
				.be.hexString()
				.with.length(48);
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

			decryptedMessage.should.be.equal(defaultMessage);
		});

		it('should inform the user if the nonce is the wrong length', () => {
			decryptMessageWithPassphrase
				.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultPassphrase,
					defaultPublicKey,
				)
				.should.throw('Expected 24-byte nonce but got length 1.');
		});

		it('should inform the user if something goes wrong during decryption', () => {
			decryptMessageWithPassphrase
				.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultEncryptedMessageWithNonce.nonce,
					defaultSecondPassphrase,
					defaultPublicKey,
				)
				.should.throw(
					'Something went wrong during decryption. Is this the full encrypted message?',
				);
		});
	});

	describe('encrypt and decrypt passphrase with password', () => {
		beforeEach(() => {
			hashStub.returns(
				Buffer.from(
					'e09dfc943d65d63f4f31e444c81afc6d5cf442c988fb87180165dd7119d3ae61',
					'hex',
				),
			);
		});

		describe('#encryptPassphraseWithPassword', () => {
			let cipher;

			beforeEach(() => {
				cipher = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
			});

			it('should encrypt a passphrase', () => {
				cipher.should.be
					.type('object')
					.and.have.property('cipher')
					.and.be.hexString();
			});

			it('should output the IV', () => {
				cipher.should.be
					.type('object')
					.and.have.property('iv')
					.and.be.hexString()
					.and.have.length(32);
			});

			it('should output the tag', () => {
				cipher.should.be
					.type('object')
					.and.have.property('tag')
					.and.be.hexString()
					.and.have.length(32);
			});
		});

		describe('#decryptPassphraseWithPassword', () => {
			let cipherNonceAndTag;

			beforeEach(() => {
				cipherNonceAndTag = {
					cipher:
						'331a80ab5f9cdd21e16f60c73e9b8f3c3d7f6b44dc79f60985234fde36077080726e577cb5596ab0c885bc321efc4f6cce52f5cae134b48e1b5308232563b6180858323bcb',
					iv: 'e249a35bb2c2fa529fdbe349496d30ac',
					tag: 'eb318b7feaa7a7540e599984bd1bb298',
				};
			});

			it('should decrypt a text with a password', () => {
				const decrypted = decryptPassphraseWithPassword(
					cipherNonceAndTag,
					defaultPassword,
				);
				decrypted.should.be.eql(defaultPassphrase);
			});

			it('should inform the user if the tag has been shortened', () => {
				cipherNonceAndTag.tag = cipherNonceAndTag.tag.slice(0, 30);
				decryptPassphraseWithPassword
					.bind(null, cipherNonceAndTag, defaultPassword)
					.should.throw('Tag must be 16 bytes.');
			});

			it('should inform the user if the tag is not a hex string', () => {
				cipherNonceAndTag.tag = `${cipherNonceAndTag.tag.slice(0, 30)}gg`;
				decryptPassphraseWithPassword
					.bind(null, cipherNonceAndTag, defaultPassword)
					.should.throw('Tag must be a hex string.');
			});

			it('should inform the user if the tag has been altered', () => {
				cipherNonceAndTag.tag = `00${cipherNonceAndTag.tag.slice(2)}`;
				decryptPassphraseWithPassword
					.bind(null, cipherNonceAndTag, defaultPassword)
					.should.throw('Unsupported state or unable to authenticate data');
			});
		});

		describe('integration test', () => {
			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase', () => {
				const encryptedString = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
				const decryptedString = decryptPassphraseWithPassword(
					encryptedString,
					defaultPassword,
				);
				decryptedString.should.be.eql(defaultPassphrase);
			});
		});
	});
});
