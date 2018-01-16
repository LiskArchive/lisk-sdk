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
import { version } from '../../package.json';
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

			it('should output the current version of LiskJS', () => {
				return cipher.should.have.property('version').which.is.equal(version);
			});

			it('should take more than 0.5 seconds @node-only', () => {
				const endTime = Date.now();
				return (endTime - startTime).should.be.above(500);
			});

			it('should take less than 2 seconds @node-only', () => {
				const endTime = Date.now();
				return (endTime - startTime).should.be.below(2e3);
			});
		});

		describe('#decryptPassphraseWithPassword', () => {
			let cipherIvSaltTagAndVersion;

			beforeEach(() => {
				cipherIvSaltTagAndVersion = {
					cipher:
						'c3b3a101f1c2a09c7ffd0ea207a7802d728e74027836de195be665e8e41c27ffe1fe1eebdf40874447c26cf8942c72db3252c2d76168137f2fc99c84b8ac353af4a64392a1',
					iv: '8be18e58b5a0ca8d56d84db439041167',
					salt: '598e2f237bf7b58ae00bc6fc006c6963',
					tag: '7498e143aba4335b942c7c5f68f90402',
					version,
				};
			});

			it('should decrypt a text with a password', () => {
				const decrypted = decryptPassphraseWithPassword(
					cipherIvSaltTagAndVersion,
					defaultPassword,
				);
				return decrypted.should.be.eql(defaultPassphrase);
			});

			it('should inform the user if the salt has been altered', () => {
				cipherIvSaltTagAndVersion.salt = `00${cipherIvSaltTagAndVersion.salt.slice(
					2,
				)}`;
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltTagAndVersion, defaultPassword)
					.should.throw('Unsupported state or unable to authenticate data');
			});

			it('should inform the user if the tag has been shortened', () => {
				cipherIvSaltTagAndVersion.tag = cipherIvSaltTagAndVersion.tag.slice(
					0,
					30,
				);
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltTagAndVersion, defaultPassword)
					.should.throw('Tag must be 16 bytes.');
			});

			it('should inform the user if the tag is not a hex string', () => {
				cipherIvSaltTagAndVersion.tag = `${cipherIvSaltTagAndVersion.tag.slice(
					0,
					30,
				)}gg`;
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltTagAndVersion, defaultPassword)
					.should.throw('Tag must be a hex string.');
			});

			it('should inform the user if the tag has been altered', () => {
				cipherIvSaltTagAndVersion.tag = `00${cipherIvSaltTagAndVersion.tag.slice(
					2,
				)}`;
				return decryptPassphraseWithPassword
					.bind(null, cipherIvSaltTagAndVersion, defaultPassword)
					.should.throw('Unsupported state or unable to authenticate data');
			});
		});

		describe('integration test', () => {
			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase @node-only', () => {
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
