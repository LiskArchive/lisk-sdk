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
			return encryptedMessage.should.have
				.property('encryptedMessage')
				.be.hexString()
				.with.length(68);
		});

		it('should output the nonce', () => {
			return encryptedMessage.should.have
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

			return decryptedMessage.should.be.equal(defaultMessage);
		});

		it('should inform the user if the nonce is the wrong length', () => {
			return decryptMessageWithPassphrase
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
			return decryptMessageWithPassphrase
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
			let startTime;
			let cipher;

			beforeEach(() => {
				startTime = Date.now();
				cipher = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
			});

			it('should encrypt a passphrase', () => {
				return cipher.should.have.property('cipher').and.be.hexString();
			});

			it('should output the IV', () => {
				return cipher.should.have
					.property('iv')
					.and.be.hexString()
					.and.have.length(32);
			});

			it('should output the salt', () => {
				return cipher.should.have
					.property('salt')
					.and.be.hexString()
					.and.have.length(32);
			});

			it('should output the tag', () => {
				return cipher.should.have
					.property('tag')
					.and.be.hexString()
					.and.have.length(32);
			});

			it('should take more than 0.05 seconds', () => {
				const endTime = Date.now();
				return (endTime - startTime).should.be.above(50);
			});

			it('should take less than 2 seconds', () => {
				const endTime = Date.now();
				return (endTime - startTime).should.be.below(2e3);
			});
		});

		describe('#decryptPassphraseWithPassword', () => {
			let cipherIvSaltAndTag;

			beforeEach(() => {
				cipherIvSaltAndTag = {
					cipher:
						'5c1adc330adeb6c0696134a28d8e32a257211564b6a09b8a51128f34739f0a39f1d3e0de3701124084d29843f6a48bb1b23c5804a64be6e854bd875d3ac30c99228a5335f3',
					iv: '9d48f3461863c48068e725526ddec7eb',
					salt: 'cf9e6302999a3181fc3aa782183c1d69',
					tag: '77ed2c755e34cb559dcf2c1595765b03',
				};
			});

			it('should decrypt a text with a password', () => {
				const decrypted = decryptPassphraseWithPassword(
					cipherIvSaltAndTag,
					defaultPassword,
				);
				return decrypted.should.be.eql(defaultPassphrase);
			});

			it('should inform the user if the salt has been altered', () => {
				cipherIvSaltAndTag.salt = `00${cipherIvSaltAndTag.salt.slice(2)}`;
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltAndTag, defaultPassword)
					.should.throw('Unsupported state or unable to authenticate data');
			});

			it('should inform the user if the tag has been shortened', () => {
				cipherIvSaltAndTag.tag = cipherIvSaltAndTag.tag.slice(0, 30);
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltAndTag, defaultPassword)
					.should.throw('Tag must be 16 bytes.');
			});

			it('should inform the user if the tag is not a hex string', () => {
				cipherIvSaltAndTag.tag = `${cipherIvSaltAndTag.tag.slice(0, 30)}gg`;
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltAndTag, defaultPassword)
					.should.throw('Tag must be a hex string.');
			});

			it('should inform the user if the tag has been altered', () => {
				cipherIvSaltAndTag.tag = `00${cipherIvSaltAndTag.tag.slice(2)}`;
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltAndTag, defaultPassword)
					.should.throw('Unsupported state or unable to authenticate data');
			});
		});

		describe('integration test', () => {
			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase', () => {
				const cipher = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
				const decryptedString = decryptPassphraseWithPassword(
					cipher,
					defaultPassword,
				);
				return decryptedString.should.be.eql(defaultPassphrase);
			});
		});
	});
});
