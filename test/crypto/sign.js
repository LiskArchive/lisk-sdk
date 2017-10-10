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
	signTransaction,
	multiSignTransaction,
	verifyTransaction,
	encryptPassphraseWithPassword,
	decryptPassphraseWithPassword,
} from '../../src/crypto/sign';

const convert = require('../../src/crypto/convert');
const keys = require('../../src/crypto/keys');
const hash = require('../../src/crypto/hash');

const makeInvalid = (str) => {
	const char = str[0] === '0' ? '1' : '0';
	return `${char}${str.slice(1)}`;
};

const changeLength = str => `00${str}`;

describe('sign', () => {
	const defaultSecret = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const defaultPrivateKey = '314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultPublicKey = '7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
	const defaultSecondSecret = 'second secret';
	const defaultSecondPrivateKey = '9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultSecondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultMessage = 'Some default text.';
	const defaultSignature = 'l07qwsfn2dpCqic8jKro5ut2b6KaMbN3MvIubS5h6EAhBoSeYeNVH/cNfTWRcKYZhmnhBhtrSqYZl+Jrh+OnBA==';
	const defaultSecondSignature = '/ZOPadM9cMlAu5lFeeEfTl7hjnFWNJl6uXUzBdXsDQMa7gP22owcJZwf3sNLTvVG5inAe7PHekvO6dsBfayIDQ==';
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
	const defaultTransactionSignature = 'bb3f2d12d098c59a0af03bb1157eeb7bc7141b21cea57861c4eac72a7c55f122b5befb1391c3f8509b562fa748fdc7359f6e6051526d979915157c5bcba34e01';
	const defaultPassword = 'myTotal53cr3t%&';

	let defaultSignedMessage;
	let defaultDoubleSignedMessage;
	let defaultEncryptedMessageWithNonce;
	let defaultTransaction;

	let getRawPrivateAndPublicKeyFromSecretStub;
	let getTransactionHashStub;
	let getSha256HashStub;

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
			encryptedMessage: '299390b9cbb92fe6a43daece2ceaecbacd01c7c03cfdba51d693b5c0e2b65c634115',
			nonce: 'df4c8b09e270d2cb3f7b3d53dfa8a6f3441ad3b14a13fb66',
		};
		defaultTransaction = {
			type: 0,
			amount: 1000,
			recipientId: '58191285901858109L',
			timestamp: 141738,
			asset: {},
			id: '13987348420913138422',
			senderPublicKey: defaultPublicKey,
		};
		sandbox
			.stub(convert, 'convertPrivateKeyEd2Curve')
			.returns(Buffer.from('d8be8cacb03fb02f34e85030f902b635f364d6c23f090c7640e9dc9c568e7d5e', 'hex'));
		sandbox
			.stub(convert, 'convertPublicKeyEd2Curve')
			.returns(Buffer.from('f245e78c83196d73452e55581ef924a1b792d352c142257aa3af13cded2e7905', 'hex'));

		getRawPrivateAndPublicKeyFromSecretStub = sandbox.stub(keys, 'getRawPrivateAndPublicKeyFromSecret');
		getRawPrivateAndPublicKeyFromSecretStub
			.withArgs(defaultSecret)
			.returns({
				privateKey: Buffer.from(defaultPrivateKey, 'hex'),
				publicKey: Buffer.from(defaultPublicKey, 'hex'),
			});
		getRawPrivateAndPublicKeyFromSecretStub
			.withArgs(defaultSecondSecret)
			.returns({
				privateKey: Buffer.from(defaultSecondPrivateKey, 'hex'),
				publicKey: Buffer.from(defaultSecondPublicKey, 'hex'),
			});

		getTransactionHashStub = sandbox.stub(hash, 'getTransactionHash')
			.returns(Buffer.from('c62214460d66eeb1d9db3fb708e31040d2629fbdb6c93887c5eb0f3243912f91', 'hex'));
		getSha256HashStub = sandbox.stub(hash, 'getSha256Hash')
			.returns(Buffer.from('d43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760', 'hex'));
	});

	describe('#signMessageWithSecret', () => {
		it('should create a signed message using a secret passphrase', () => {
			const signedMessage = signMessageWithSecret(defaultMessage, defaultSecret);
			(signedMessage).should.be.eql(defaultSignedMessage);
		});
	});

	describe('#verifyMessageWithPublicKey', () => {
		it('should detect invalid publicKeys', () => {
			(verifyMessageWithPublicKey.bind(null, {
				message: defaultMessage,
				signature: defaultSignature,
				publicKey: changeLength(defaultPublicKey),
			}))
				.should.throw('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect invalid signatures', () => {
			(verifyMessageWithPublicKey.bind(null, {
				message: defaultMessage,
				signature: changeLength(defaultSignature),
				publicKey: defaultPublicKey,
			}))
				.should.throw('Invalid signature length, expected 64-byte signature');
		});

		it('should return false if the signature is invalid', () => {
			const verification = verifyMessageWithPublicKey({
				message: defaultMessage,
				signature: makeInvalid(defaultSignature),
				publicKey: defaultPublicKey,
			});
			(verification).should.be.false();
		});

		it('should return true if the signature is valid', () => {
			const verification = verifyMessageWithPublicKey(defaultSignedMessage);
			(verification).should.be.true();
		});
	});

	describe('#signMessageWithTwoSecrets', () => {
		it('should create a message signed by two secret passphrases', () => {
			const signature = signMessageWithTwoSecrets(
				defaultMessage, defaultSecret, defaultSecondSecret,
			);

			(signature).should.be.eql(defaultDoubleSignedMessage);
		});
	});

	describe('#verifyMessageWithTwoPublicKeys', () => {
		it('should throw on invalid first publicKey length', () => {
			(verifyMessageWithTwoPublicKeys.bind(null, Object.assign({}, defaultDoubleSignedMessage, {
				publicKey: changeLength(defaultPublicKey),
			})))
				.should.throw('Invalid first publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid second publicKey length', () => {
			(verifyMessageWithTwoPublicKeys.bind(null, Object.assign({}, defaultDoubleSignedMessage, {
				secondPublicKey: changeLength(defaultSecondPublicKey),
			})))
				.should.throw('Invalid second publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid primary signature length', () => {
			(verifyMessageWithTwoPublicKeys.bind(null, Object.assign({}, defaultDoubleSignedMessage, {
				signature: changeLength(defaultSignature),
			})))
				.should.throw('Invalid first signature length, expected 64-byte signature');
		});

		it('should throw on invalid secondary signature length', () => {
			(verifyMessageWithTwoPublicKeys.bind(null, Object.assign({}, defaultDoubleSignedMessage, {
				secondSignature: changeLength(defaultSecondSignature),
			})))
				.should.throw('Invalid second signature length, expected 64-byte signature');
		});

		it('should return false for incorrect first signature', () => {
			const verified = verifyMessageWithTwoPublicKeys(Object.assign({},
				defaultDoubleSignedMessage, {
					signature: makeInvalid(defaultSignature),
				}),
			);
			(verified).should.be.false();
		});

		it('should return false for incorrect second signature', () => {
			const verified = verifyMessageWithTwoPublicKeys(Object.assign({},
				defaultDoubleSignedMessage, {
					secondSignature: makeInvalid(defaultSecondSignature),
				}),
			);
			(verified).should.be.false();
		});

		it('should return true for two valid signatures', () => {
			const verified = verifyMessageWithTwoPublicKeys(defaultDoubleSignedMessage);
			(verified).should.be.true();
		});
	});

	describe('#printSignedMessage', () => {
		it('should wrap a single signed message into a printed Lisk template', () => {
			const printedMessage = printSignedMessage({
				message: defaultMessage,
				signature: defaultSignature,
				publicKey: defaultPublicKey,
			});
			(printedMessage).should.be.equal(defaultPrintedMessage);
		});

		it('should wrap a second signed message into a printed Lisk template', () => {
			const printedMessage = printSignedMessage({
				message: defaultMessage,
				signature: defaultSignature,
				publicKey: defaultPublicKey,
				secondSignature: defaultSecondSignature,
				secondPublicKey: defaultSecondPublicKey,
			});
			(printedMessage).should.be.equal(defaultSecondSignedPrintedMessage);
		});
	});

	describe('#signAndPrintMessage', () => {
		it('should sign the message once and wrap it into a printed Lisk template', () => {
			const signedAndPrintedMessage = signAndPrintMessage(defaultMessage, defaultSecret);
			(signedAndPrintedMessage).should.be.equal(defaultPrintedMessage);
		});

		it('should sign the message twice and wrap it into a printed Lisk template', () => {
			const signedAndPrintedMessage = signAndPrintMessage(
				defaultMessage, defaultSecret, defaultSecondSecret,
			);
			(signedAndPrintedMessage).should.be.equal(defaultSecondSignedPrintedMessage);
		});
	});

	describe('#signTransaction', () => {
		let transaction;
		let signature;

		beforeEach(() => {
			transaction = Object.assign({}, defaultTransaction);
			signature = signTransaction(transaction, defaultSecret);
		});

		it('should sign a transaction', () => {
			(signature).should.be.equal(defaultTransactionSignature);
		});
	});

	describe('#multiSignTransaction', () => {
		let multiSignatureTransaction;
		let multiSignature;

		beforeEach(() => {
			multiSignatureTransaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				signSignature: '508a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};
			getTransactionHashStub.returns(Buffer.from('d43eed9049dd8f35106c720669a1148b2c6288d9ea517b936c33a1d84117a760', 'hex'));
			multiSignature = multiSignTransaction(multiSignatureTransaction, defaultSecret);
		});

		it('should remove the signature and second signature before getting transaction bytes', () => {
			(getTransactionHashStub.args[0]).should.not.have.property('signature');
			(getTransactionHashStub.args[0]).should.not.have.property('signSignature');
		});

		it('should signTransaction a multisignature transaction', () => {
			const expectedMultiSignature = '4b3b6041de1aa1727861f319fcd427561953268cf6f90d577ef38b872ad3dafb3215e734c2c957eff96de58c20b14ae00708487f229ceb2776cc7e85a1623e05';
			(multiSignature).should.be.eql(expectedMultiSignature);
		});
	});

	describe('#verifyTransaction', () => {
		let transaction;

		describe('with a single signed transaction', () => {
			beforeEach(() => {
				transaction = Object.assign({}, defaultTransaction, {
					signature: 'bb3f2d12d098c59a0af03bb1157eeb7bc7141b21cea57861c4eac72a7c55f122b5befb1391c3f8509b562fa748fdc7359f6e6051526d979915157c5bcba34e01',
				});
			});

			it('should remove the signature before getting transaction hash', () => {
				verifyTransaction(transaction);
				(getTransactionHashStub.args[0]).should.not.have.property('signature');
			});

			it('should return false for an invalid signature', () => {
				transaction.amount = 20;
				getTransactionHashStub.returns(Buffer.from('9027723fef54358948e47094002f1e9890fb3455dd85724c147a5065d5fd8f59', 'hex'));
				const verification = verifyTransaction(transaction);
				(verification).should.be.false();
			});

			it('should return true for a valid signature', () => {
				const verification = verifyTransaction(transaction);
				(verification).should.be.true();
			});
		});

		describe('with a second signed transaction', () => {
			beforeEach(() => {
				transaction = Object.assign({}, defaultTransaction, {
					signature: 'bb3f2d12d098c59a0af03bb1157eeb7bc7141b21cea57861c4eac72a7c55f122b5befb1391c3f8509b562fa748fdc7359f6e6051526d979915157c5bcba34e01',
					signSignature: '897090248c0ecdad749d869ddeae59e5029bdbe4806da92d82d6eb7142b624011f4302941db184a2e70bd29a6adac5ce0b4cf780af893db2f504375bdef6850b',
				});
				getTransactionHashStub.onFirstCall().returns(Buffer.from('951bb4580dcb6a412de28844e0e06439c5c51dfea2a16730fd94ff20e355f1bd', 'hex'));
			});

			it('should throw if attempting to verify without a secondPublicKey', () => {
				(verifyTransaction.bind(null, transaction)).should.throw('Cannot verify signSignature without secondPublicKey.');
			});

			it('should remove the second signature before getting the first transaction hash', () => {
				verifyTransaction(transaction, defaultSecondPublicKey);
				(getTransactionHashStub.args[0]).should.not.have.property('signSignature');
			});

			it('should remove the first signature before getting the second transaction hash', () => {
				verifyTransaction(transaction, defaultSecondPublicKey);
				(getTransactionHashStub.args[1]).should.not.have.property('signature');
			});

			it('should return false for an invalid second signature', () => {
				transaction.signSignature = makeInvalid(transaction.signSignature);
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				(verification).should.be.false();
			});

			it('should return false for an invalid first signature', () => {
				transaction.signature = makeInvalid(transaction.signature);
				getTransactionHashStub.onFirstCall().returns(Buffer.from('aef147521619556572f204585332aac247dc2b024cb975518d847e4587bab756', 'hex'));
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				(verification).should.be.false();
			});

			it('should return true for a valid signature', () => {
				const verification = verifyTransaction(
					transaction,
					defaultSecondPublicKey,
				);
				(verification).should.be.true();
			});
		});
	});

	describe('#encryptMessageWithSecret', () => {
		let encryptedMessage;

		beforeEach(() => {
			encryptedMessage = encryptMessageWithSecret(
				defaultMessage, defaultSecret, defaultPublicKey,
			);
		});

		it('should encrypt a message', () => {
			(encryptedMessage).should.have.property('encryptedMessage').be.hexString().with.length(68);
		});

		it('should output the nonce', () => {
			(encryptedMessage).should.have.property('nonce').be.hexString().with.length(48);
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

			(decryptedMessage).should.be.equal(defaultMessage);
		});
	});

	describe('encrypt and decrypt passphrase with password', () => {
		beforeEach(() => {
			getSha256HashStub.returns(Buffer.from('e09dfc943d65d63f4f31e444c81afc6d5cf442c988fb87180165dd7119d3ae61', 'hex'));
		});

		describe('#encryptPassphraseWithPassword', () => {
			let cipher;

			beforeEach(() => {
				cipher = encryptPassphraseWithPassword(defaultSecret, defaultPassword);
			});

			it('should encrypt a passphrase', () => {
				(cipher).should.be.type('object').and.have.property('cipher').and.be.hexString();
			});

			it('should output the IV', () => {
				(cipher).should.be.type('object').and.have.property('iv').and.be.hexString().and.have.length(32);
			});
		});

		describe('#decryptPassphraseWithPassword', () => {
			it('should decrypt a text with a password', () => {
				const cipherAndNonce = {
					cipher: '1c527b9408e77ae79e2ceb1ad5907ec523cd957d30c6a08dc922686e62ed98271910ca5b605f95aec98c438b6214fa7e83e3689f3fba89bfcaee937b35a3d931640afe79c353499a500f14c35bd3fd08',
					iv: '89d0fa0b955219a0e6239339fbb8239f',
				};
				const decrypted = decryptPassphraseWithPassword(cipherAndNonce, defaultPassword);
				(decrypted).should.be.eql(defaultSecret);
			});
		});

		describe('integration test', () => {
			it('should encrypt a given secret with a password and decrypt it back to the original passphrase', () => {
				const encryptedString = encryptPassphraseWithPassword(defaultSecret, defaultPassword);
				const decryptedString = decryptPassphraseWithPassword(encryptedString, defaultPassword);
				(decryptedString).should.be.eql(defaultSecret);
			});
		});
	});
});
