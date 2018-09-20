/** Copyright © 2018 Lisk Foundation
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
} from '../src/encrypt';
// Require is used for stubbing
const convert = require('../src/convert');
const keys = require('../src/keys');
const hash = require('../src/hash');

describe('encrypt', () => {
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
		return Promise.resolve();
	});

	describe('#encryptMessageWithPassphrase', () => {
		let encryptedMessage;

		beforeEach(() => {
			encryptedMessage = encryptMessageWithPassphrase(
				defaultMessage,
				defaultPassphrase,
				defaultPublicKey,
			);
			return Promise.resolve();
		});

		it('should encrypt a message', () => {
			return expect(encryptedMessage)
				.to.have.property('encryptedMessage')
				.be.hexString.with.length(68);
		});

		it('should output the nonce', () => {
			return expect(encryptedMessage)
				.to.have.property('nonce')
				.be.hexString.with.length(48);
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

			return expect(decryptedMessage).to.be.equal(defaultMessage);
		});

		it('should inform the user if the nonce is the wrong length', () => {
			return expect(
				decryptMessageWithPassphrase.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultPassphrase,
					defaultPublicKey,
				),
			).to.throw('Nonce must be a buffer of size 24.');
		});

		it('should inform the user if something goes wrong during decryption', () => {
			return expect(
				decryptMessageWithPassphrase.bind(
					null,
					defaultEncryptedMessageWithNonce.encryptedMessage.slice(0, 2),
					defaultEncryptedMessageWithNonce.nonce,
					defaultSecondPassphrase,
					defaultPublicKey,
				),
			).to.throw(
				'Something went wrong during decryption. Is this the full encrypted message?',
			);
		});
	});

	describe('encrypt and decrypt passphrase with password', () => {
		beforeEach(() => {
			return hashStub.returns(
				Buffer.from(
					'e09dfc943d65d63f4f31e444c81afc6d5cf442c988fb87180165dd7119d3ae61',
					'hex',
				),
			);
		});

		describe('#encryptPassphraseWithPassword', () => {
			let startTime;
			let encryptedPassphrase;

			beforeEach(() => {
				startTime = Date.now();
				encryptedPassphrase = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
				return Promise.resolve();
			});

			it('should encrypt a passphrase', () => {
				return expect(encryptedPassphrase).to.have.property('cipherText').and.be
					.hexString;
			});

			it('should output the IV', () => {
				return expect(encryptedPassphrase)
					.to.have.property('iv')
					.and.be.hexString.and.have.length(24);
			});

			it('should output the salt', () => {
				return expect(encryptedPassphrase)
					.to.have.property('salt')
					.and.be.hexString.and.have.length(32);
			});

			it('should output the tag', () => {
				return expect(encryptedPassphrase)
					.to.have.property('tag')
					.and.be.hexString.and.have.length(32);
			});

			it('should output the current version of Lisk Elements', () => {
				return expect(encryptedPassphrase)
					.to.have.property('version')
					.which.is.equal(ENCRYPTION_VERSION);
			});

			it('should output the default number of iterations', () => {
				return expect(encryptedPassphrase)
					.to.have.property('iterations')
					.equal(PBKDF2_ITERATIONS);
			});

			it('should take more than 0.5 seconds @node-only', () => {
				const endTime = Date.now();
				return expect(endTime - startTime).to.be.above(500);
			});

			it('should take less than 2 seconds @node-only', () => {
				const endTime = Date.now();
				return expect(endTime - startTime).to.be.below(2e3);
			});

			it('should accept and output a custom number of iterations', () => {
				encryptedPassphrase = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					customIterations,
				);
				return expect(encryptedPassphrase)
					.to.have.property('iterations')
					.and.equal(customIterations);
			});
		});

		describe('#decryptPassphraseWithPassword', () => {
			let encryptedPassphrase;

			beforeEach(() => {
				encryptedPassphrase = {
					iterations: undefined,
					cipherText:
						'5cfd7bcc13022a482e7c8bd250cd73ef3eb7c49c849d5e761ce717608293f777cca8e0e18587ee307beab65bcc1b273caeb23d4985010b675391b354c38f8e84e342c1e7aa',
					iv: '7b820ad6936a63152d13ffa2',
					salt: 'b60036ab30da7af68c6ecf370471ce1b',
					tag: '336c68fa92d414c229e5638249847774',
					version: '1',
				};
				return Promise.resolve();
			});

			it('should decrypt a passphrase with a password', () => {
				const decrypted = decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				return expect(decrypted).to.be.equal(defaultPassphrase);
			});

			it('should inform the user if cipherText is missing', () => {
				delete encryptedPassphrase.cipherText;
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('Cipher text must be a string.');
			});

			it('should inform the user if iv is missing', () => {
				delete encryptedPassphrase.iv;
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('IV must be a string.');
			});

			it('should inform the user if salt is missing', () => {
				delete encryptedPassphrase.salt;
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('Salt must be a string.');
			});

			it('should inform the user if tag is missing', () => {
				delete encryptedPassphrase.tag;
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('Tag must be a string.');
			});

			it('should inform the user if the salt has been altered', () => {
				encryptedPassphrase.salt = `00${encryptedPassphrase.salt.slice(2)}`;
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('Unsupported state or unable to authenticate data');
			});

			it('should inform the user if the tag has been shortened', () => {
				encryptedPassphrase.tag = encryptedPassphrase.tag.slice(0, 30);
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('Tag must be 16 bytes.');
			});

			it('should inform the user if the tag is not a hex string', () => {
				encryptedPassphrase.tag = `${encryptedPassphrase.tag.slice(0, 30)}gg`;
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('Tag must be a valid hex string.');
			});

			it('should inform the user if the tag has been altered', () => {
				encryptedPassphrase.tag = `00${encryptedPassphrase.tag.slice(2)}`;
				return expect(
					decryptPassphraseWithPassword.bind(
						null,
						encryptedPassphrase,
						defaultPassword,
					),
				).to.throw('Unsupported state or unable to authenticate data');
			});

			it('should decrypt a passphrase with a password and a custom number of iterations', () => {
				encryptedPassphrase = {
					iterations: 12,
					cipherText:
						'1f06671e13c0329aee057fee995e08a516bdacd287c7ff2714a74be6099713c87bbc3e005c63d4d3d02f8ba89b42810a5854444ad2b76855007a0925fafa7d870875beb010',
					iv: '3a583b21bbac609c7df3e7e0',
					salt: '245c6859a96339a7735a6cac78ccf625',
					tag: '63653f1d4e8d422a42d98b25d3844792',
					version: '1',
				};
				const decrypted = decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				return expect(decrypted).to.be.equal(defaultPassphrase);
			});
		});

		describe('integration test', () => {
			it('should encrypt a given passphrase with a password and decrypt it back to the original passphrase @node-only', () => {
				const encryptedPassphrase = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
				);
				const decryptedString = decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				return expect(decryptedString).to.be.equal(defaultPassphrase);
			});

			it('should encrypt a given passphrase with a password and custom number of iterations and decrypt it back to the original passphrase @node-only', () => {
				const encryptedPassphrase = encryptPassphraseWithPassword(
					defaultPassphrase,
					defaultPassword,
					customIterations,
				);
				const decryptedString = decryptPassphraseWithPassword(
					encryptedPassphrase,
					defaultPassword,
				);
				return expect(decryptedString).to.equal(defaultPassphrase);
			});
		});
	});
});
