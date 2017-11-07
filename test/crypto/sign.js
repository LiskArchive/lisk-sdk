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
	signMessageWithSecret,
	signMessageWithTwoSecrets,
	verifyMessageWithPublicKey,
	verifyMessageWithTwoPublicKeys,
	printSignedMessage,
	signAndPrintMessage,
	encryptMessageWithSecret,
	decryptMessageWithSecret,
	signData,
	verifyData,
	encryptPassphraseWithPassword,
	decryptPassphraseWithPassword,
} from '../../src/crypto/sign';

const convert = require('../../src/crypto/convert');
const keys = require('../../src/crypto/keys');
const hash = require('../../src/crypto/hash');

const makeInvalid = str => {
	const char = str[0] === '0' ? '1' : '0';
	return `${char}${str.slice(1)}`;
};

const changeLength = str => `00${str}`;

describe('sign', () => {
	const defaultSecret =
		'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPrivateKey =
		'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultPublicKey =
		'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultSecondSecret = 'second secret';
	const defaultSecondPrivateKey =
		'9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultSecondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultMessage = 'Some default text.';
	const defaultSignature =
		'l07qwsfn2dpCqic8jKro5ut2b6KaMbN3MvIubS5h6EAhBoSeYeNVH/cNfTWRcKYZhmnhBhtrSqYZl+Jrh+OnBA==';
	const defaultSecondSignature =
		'/ZOPadM9cMlAu5lFeeEfTl7hjnFWNJl6uXUzBdXsDQMa7gP22owcJZwf3sNLTvVG5inAe7PHekvO6dsBfayIDQ==';
	const defaultPrintedMessage = `
-----BEGIN LISK SIGNED MESSAGE-----
-----MESSAGE-----
${defaultMessage}
-----PUBLIC KEY-----
${defaultPublicKey}
-----SIGNATURE-----
${defaultSignature}
-----END LISK SIGNED MESSAGE-----
`.trim();
	const defaultSecondSignedPrintedMessage = `
-----BEGIN LISK SIGNED MESSAGE-----
-----MESSAGE-----
${defaultMessage}
-----PUBLIC KEY-----
${defaultPublicKey}
-----SECOND PUBLIC KEY-----
${defaultSecondPublicKey}
-----SIGNATURE-----
${defaultSignature}
-----SECOND SIGNATURE-----
${defaultSecondSignature}
-----END LISK SIGNED MESSAGE-----
`.trim();
	const defaultData = Buffer.from('This is some data');
	const defaultDataSignature =
		'b8704e11c4d9fad9960c7b6a69dcf48c1bede5b74ed8974cd005d9a407deef618dd800fe69ceed1fd52bb1e0881e71aec137c35b90eda9afe93716a5652ee009';
	const defaultPassword = 'myTotal53cr3t%&';

	let defaultSignedMessage;
	let defaultDoubleSignedMessage;
	let defaultEncryptedMessageWithNonce;

	let getPrivateAndPublicKeyBytesFromSecretStub;
	let hashStub;

	beforeEach(() => {
		defaultSignedMessage = {
			message: defaultMessage,
			publicKey: defaultPublicKey,
			signature: defaultSignature,
		};
		defaultDoubleSignedMessage = {
			message: defaultMessage,
			publicKey: defaultPublicKey,
			secondPublicKey: defaultSecondPublicKey,
			signature: defaultSignature,
			secondSignature: defaultSecondSignature,
		};
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

		getPrivateAndPublicKeyBytesFromSecretStub = sandbox.stub(
			keys,
			'getPrivateAndPublicKeyBytesFromSecret',
		);
		getPrivateAndPublicKeyBytesFromSecretStub.withArgs(defaultSecret).returns({
			privateKey: Buffer.from(defaultPrivateKey, 'hex'),
			publicKey: Buffer.from(defaultPublicKey, 'hex'),
		});
		getPrivateAndPublicKeyBytesFromSecretStub
			.withArgs(defaultSecondSecret)
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

	describe('#signMessageWithSecret', () => {
		it('should create a signed message using a secret passphrase', () => {
			const signedMessage = signMessageWithSecret(
				defaultMessage,
				defaultSecret,
			);
			signedMessage.should.be.eql(defaultSignedMessage);
		});
	});

	describe('#verifyMessageWithPublicKey', () => {
		it('should detect invalid publicKeys', () => {
			verifyMessageWithPublicKey
				.bind(null, {
					message: defaultMessage,
					signature: defaultSignature,
					publicKey: changeLength(defaultPublicKey),
				})
				.should.throw('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect invalid signatures', () => {
			verifyMessageWithPublicKey
				.bind(null, {
					message: defaultMessage,
					signature: changeLength(defaultSignature),
					publicKey: defaultPublicKey,
				})
				.should.throw('Invalid signature length, expected 64-byte signature');
		});

		it('should return false if the signature is invalid', () => {
			const verification = verifyMessageWithPublicKey({
				message: defaultMessage,
				signature: makeInvalid(defaultSignature),
				publicKey: defaultPublicKey,
			});
			verification.should.be.false();
		});

		it('should return true if the signature is valid', () => {
			const verification = verifyMessageWithPublicKey(defaultSignedMessage);
			verification.should.be.true();
		});
	});

	describe('#signMessageWithTwoSecrets', () => {
		it('should create a message signed by two secret passphrases', () => {
			const signature = signMessageWithTwoSecrets(
				defaultMessage,
				defaultSecret,
				defaultSecondSecret,
			);

			signature.should.be.eql(defaultDoubleSignedMessage);
		});
	});

	describe('#verifyMessageWithTwoPublicKeys', () => {
		it('should throw on invalid first publicKey length', () => {
			verifyMessageWithTwoPublicKeys
				.bind(
					null,
					Object.assign({}, defaultDoubleSignedMessage, {
						publicKey: changeLength(defaultPublicKey),
					}),
				)
				.should.throw('Invalid first publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid second publicKey length', () => {
			verifyMessageWithTwoPublicKeys
				.bind(
					null,
					Object.assign({}, defaultDoubleSignedMessage, {
						secondPublicKey: changeLength(defaultSecondPublicKey),
					}),
				)
				.should.throw('Invalid second publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid primary signature length', () => {
			verifyMessageWithTwoPublicKeys
				.bind(
					null,
					Object.assign({}, defaultDoubleSignedMessage, {
						signature: changeLength(defaultSignature),
					}),
				)
				.should.throw(
					'Invalid first signature length, expected 64-byte signature',
				);
		});

		it('should throw on invalid secondary signature length', () => {
			verifyMessageWithTwoPublicKeys
				.bind(
					null,
					Object.assign({}, defaultDoubleSignedMessage, {
						secondSignature: changeLength(defaultSecondSignature),
					}),
				)
				.should.throw(
					'Invalid second signature length, expected 64-byte signature',
				);
		});

		it('should return false for incorrect first signature', () => {
			const verified = verifyMessageWithTwoPublicKeys(
				Object.assign({}, defaultDoubleSignedMessage, {
					signature: makeInvalid(defaultSignature),
				}),
			);
			verified.should.be.false();
		});

		it('should return false for incorrect second signature', () => {
			const verified = verifyMessageWithTwoPublicKeys(
				Object.assign({}, defaultDoubleSignedMessage, {
					secondSignature: makeInvalid(defaultSecondSignature),
				}),
			);
			verified.should.be.false();
		});

		it('should return true for two valid signatures', () => {
			const verified = verifyMessageWithTwoPublicKeys(
				defaultDoubleSignedMessage,
			);
			verified.should.be.true();
		});
	});

	describe('#printSignedMessage', () => {
		it('should wrap a single signed message into a printed Lisk template', () => {
			const printedMessage = printSignedMessage({
				message: defaultMessage,
				signature: defaultSignature,
				publicKey: defaultPublicKey,
			});
			printedMessage.should.be.equal(defaultPrintedMessage);
		});

		it('should wrap a second signed message into a printed Lisk template', () => {
			const printedMessage = printSignedMessage({
				message: defaultMessage,
				signature: defaultSignature,
				publicKey: defaultPublicKey,
				secondSignature: defaultSecondSignature,
				secondPublicKey: defaultSecondPublicKey,
			});
			printedMessage.should.be.equal(defaultSecondSignedPrintedMessage);
		});
	});

	describe('#signAndPrintMessage', () => {
		it('should sign the message once and wrap it into a printed Lisk template', () => {
			const signedAndPrintedMessage = signAndPrintMessage(
				defaultMessage,
				defaultSecret,
			);
			signedAndPrintedMessage.should.be.equal(defaultPrintedMessage);
		});

		it('should sign the message twice and wrap it into a printed Lisk template', () => {
			const signedAndPrintedMessage = signAndPrintMessage(
				defaultMessage,
				defaultSecret,
				defaultSecondSecret,
			);
			signedAndPrintedMessage.should.be.equal(
				defaultSecondSignedPrintedMessage,
			);
		});
	});

	describe('#signData', () => {
		let signature;

		beforeEach(() => {
			signature = signData(defaultData, defaultSecret);
		});

		it('should sign a transaction', () => {
			signature.should.be.equal(defaultDataSignature);
		});
	});

	describe('#verifyData', () => {
		it('should return false for an invalid signature', () => {
			const verification = verifyData(
				defaultData,
				makeInvalid(defaultDataSignature),
				defaultPublicKey,
			);
			verification.should.be.false();
		});

		it('should return true for a valid signature', () => {
			const verification = verifyData(
				defaultData,
				defaultDataSignature,
				defaultPublicKey,
			);
			verification.should.be.true();
		});
	});

	describe('#encryptMessageWithSecret', () => {
		let encryptedMessage;

		beforeEach(() => {
			encryptedMessage = encryptMessageWithSecret(
				defaultMessage,
				defaultSecret,
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

	describe('#decryptMessageWithSecret', () => {
		it('should be able to decrypt the message correctly using the receiver’s secret passphrase', () => {
			const decryptedMessage = decryptMessageWithSecret(
				defaultEncryptedMessageWithNonce.encryptedMessage,
				defaultEncryptedMessageWithNonce.nonce,
				defaultSecret,
				defaultPublicKey,
			);

			decryptedMessage.should.be.equal(defaultMessage);
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
				cipher = encryptPassphraseWithPassword(defaultSecret, defaultPassword);
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
		});

		describe('#decryptPassphraseWithPassword', () => {
			it('should decrypt a text with a password', () => {
				const cipherAndNonce = {
					cipher:
						'1c527b9408e77ae79e2ceb1ad5907ec523cd957d30c6a08dc922686e62ed98271910ca5b605f95aec98c438b6214fa7e83e3689f3fba89bfcaee937b35a3d931640afe79c353499a500f14c35bd3fd08',
					iv: '89d0fa0b955219a0e6239339fbb8239f',
				};
				const decrypted = decryptPassphraseWithPassword(
					cipherAndNonce,
					defaultPassword,
				);
				decrypted.should.be.eql(defaultSecret);
			});
		});

		describe('integration test', () => {
			it('should encrypt a given secret with a password and decrypt it back to the original passphrase', () => {
				const encryptedString = encryptPassphraseWithPassword(
					defaultSecret,
					defaultPassword,
				);
				const decryptedString = decryptPassphraseWithPassword(
					encryptedString,
					defaultPassword,
				);
				decryptedString.should.be.eql(defaultSecret);
			});
		});
	});
});
