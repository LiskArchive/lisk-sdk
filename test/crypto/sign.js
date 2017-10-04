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
	decryptPassphraseWithPassword,
	encryptPassphraseWithPassword,
} from '../../src/crypto/sign';
import {
	getKeys,
} from '../../src/crypto/keys';

describe('sign', () => {
	const secretPassphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const secretMessage = 'secret message';
	const notSecretMessage = 'not secret message';
	const defaultSignature = 'X9aY0zwAn8NY8ghfZkZa5QrDd00aXDbVFn+9f5usa2SLJrspdtNgtihv6hw2fdEo2tfwzCQaAwH7z/9Mp3ueCw==';
	const defaultSecondSignature = 'nGWmc3+0RXyLFGX51ony9hfDn44Q4mhtA/vTiwkl7rnl13eYX6KEzKardnflUjnWG0Kbj9wfshKGsZuQRW5/Ag==';
	const defaultWrongSignature = 'E2gerxJlGhgaPcY+Az90YL272HanGOE+za/DdEy011UvReN5V1UBBJXzuHhX3QoX2IhunJ2DRf+wvXBuZrz7Cw==';
	const defaultSecret = 'secret';
	const defaultSecondSecret = 'second secret';
	const defaultPublicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultSecondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultSignatureFirstSecret = '123';
	const defaultPassword = 'myTotal53cr3t%&';

	describe('#signMessageWithSecret', () => {
		const signedMessage = signMessageWithSecret(notSecretMessage, defaultSecret);
		it('should signTransaction the message correctly', () => {
			const expectedSignedMessage = {
				message: notSecretMessage,
				publicKey: defaultPublicKey,
				signature: defaultSignature,
			};
			(signedMessage).should.be.eql(expectedSignedMessage);
		});
	});

	describe('#verifyMessageWithPublicKey', () => {
		let signedMessage;
		beforeEach(() => {
			signedMessage = {
				message: notSecretMessage,
				publicKey: defaultPublicKey,
				signature: defaultSignature,
			};
		});
		it('should return true on valid signature verification', () => {
			(verifyMessageWithPublicKey(signedMessage)).should.be.true();
		});

		it('should throw on invalid publicKey length', () => {
			signedMessage.publicKey = `${defaultPublicKey}AA`;
			(verifyMessageWithPublicKey.bind(null, signedMessage)).should.throw('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid signature length', () => {
			signedMessage.signature = `WM${defaultSignature}`;
			(verifyMessageWithPublicKey.bind(null, signedMessage)).should.throw('Invalid signature length, expected 64-byte signature');
		});

		it('should return false on wrong signature', () => {
			signedMessage.signature = defaultWrongSignature;
			(verifyMessageWithPublicKey(signedMessage)).should.be.false();
		});
	});

	describe('signTransaction and print messages', () => {
		const signedMessageExample = `
-----BEGIN LISK SIGNED MESSAGE-----
-----MESSAGE-----
${notSecretMessage}
-----PUBLIC KEY-----
${defaultPublicKey}
-----SIGNATURE-----
${defaultSignature}
-----END LISK SIGNED MESSAGE-----
`.trim();

		it('#printSignedMessage should wrap the signed message into a printed Lisk template', () => {
			const signedMessage = {
				message: notSecretMessage,
				publicKey: defaultPublicKey,
				signature: defaultSignature,
			};
			const printedMessage = printSignedMessage(signedMessage);

			(printedMessage).should.be.equal(signedMessageExample);
		});

		it('#signAndPrintMessage should wrap the signed message into a printed Lisk template', () => {
			const signedAndPrintedMessage = signAndPrintMessage(notSecretMessage, defaultSecret);
			(signedAndPrintedMessage).should.be.equal(signedMessageExample);
		});
	});

	describe('signTransaction and print messages with two secrets', () => {
		const signedMessageWithTwoSecretsExample = `
-----BEGIN LISK SIGNED MESSAGE-----
-----MESSAGE-----
${notSecretMessage}
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
		it('#signMessageWithTwoSecrets should signTransaction using two secrets', () => {
			const signedMessage = signMessageWithTwoSecrets(
				notSecretMessage, defaultSecret, defaultSecondSecret,
			);
			const expectedSignedMessage = {
				message: notSecretMessage,
				publicKey: defaultPublicKey,
				secondPublicKey: defaultSecondPublicKey,
				signature: defaultSignature,
				secondSignature: defaultSecondSignature,
			};

			(signedMessage).should.be.eql(expectedSignedMessage);
		});

		it('#printSignedMessage should wrap the signed message into a printed Lisk template', () => {
			const signedMessage = {
				message: notSecretMessage,
				publicKey: defaultPublicKey,
				secondPublicKey: defaultSecondPublicKey,
				signature: defaultSignature,
				secondSignature: defaultSecondSignature,
			};
			const printedMessage = printSignedMessage(signedMessage);

			(printedMessage).should.be.equal(signedMessageWithTwoSecretsExample);
		});

		it('#signAndPrintMessage should wrap the signed message into a printed Lisk template', () => {
			const signedAndPrintedMessage =
				signAndPrintMessage(notSecretMessage, defaultSecret, defaultSecondSecret);
			(signedAndPrintedMessage).should.be.equal(signedMessageWithTwoSecretsExample);
		});
	});

	describe('#verifyMessageWithTwoPublicKeys', () => {
		let signedMessage;
		beforeEach(() => {
			signedMessage = {
				message: notSecretMessage,
				publicKey: defaultPublicKey,
				secondPublicKey: defaultSecondPublicKey,
				signature: defaultSignature,
				secondSignature: defaultSecondSignature,
			};
		});

		it('should verify both signatures when given two publicKeys', () => {
			(verifyMessageWithTwoPublicKeys(signedMessage)).should.be.true();
		});

		it('should throw on invalid first publicKey length', () => {
			signedMessage.publicKey = `${defaultPublicKey}AA`;
			(verifyMessageWithTwoPublicKeys.bind(null, signedMessage)).should.throw('Invalid first publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid second publicKey length', () => {
			signedMessage.secondPublicKey = `${defaultSecondPublicKey}AA`;
			(verifyMessageWithTwoPublicKeys.bind(null, signedMessage)).should.throw('Invalid second publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid primary signature length', () => {
			signedMessage.signature = `WM${defaultSignature}`;
			(verifyMessageWithTwoPublicKeys.bind(null, signedMessage)).should.throw('Invalid first signature length, expected 64-byte signature');
		});

		it('should throw on invalid secondary signature length', () => {
			signedMessage.secondSignature = `WM${defaultSecondSignature}`;
			(verifyMessageWithTwoPublicKeys.bind(null, signedMessage)).should.throw('Invalid second signature length, expected 64-byte signature');
		});

		it('should return false on wrong signature', () => {
			signedMessage.signature = defaultWrongSignature;
			(verifyMessageWithTwoPublicKeys(signedMessage)).should.be.false();
		});

		it('should return false on wrong second signature', () => {
			signedMessage.secondSignature = defaultWrongSignature;
			(verifyMessageWithTwoPublicKeys(signedMessage)).should.be.false();
		});
	});

	describe('#encryptMessageWithSecret', () => {
		const encryptedMessage = encryptMessageWithSecret(
			secretMessage, defaultSecret, defaultPublicKey,
		);

		it('should encrypt a message and not throw with expected parameters', () => {
			(encryptedMessage).should.be.ok().and.type('object');
		});

		it('encrypted message should have nonce and encrypted message hex', () => {
			(encryptedMessage).should.have.property('nonce');
			(encryptedMessage).should.have.property('encryptedMessage');
		});
	});

	describe('#decryptMessageWithSecret', () => {
		const encryptedMessage = encryptMessageWithSecret(
			secretMessage, defaultSecret, defaultPublicKey,
		);

		it('should be able to decrypt the message correctly with given receiver secret', () => {
			const decryptedMessage = decryptMessageWithSecret(
				encryptedMessage.encryptedMessage, encryptedMessage.nonce, defaultSecret, defaultPublicKey,
			);

			(decryptedMessage).should.be.ok();
			(decryptedMessage).should.be.equal(secretMessage);
		});
	});

	describe('signTransaction and verify', () => {
		describe('#signTransaction', () => {
			const keys = getKeys(defaultSignatureFirstSecret);
			const expectedSignature = '05383e756598172785843f5f165a8bef3632d6a0f6b7a3429201f83e5d60a5b57faa1fa383c4f33bb85d5804848e5313aa7b0cf1058873bc8576d206bdb9c804';
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				id: '13987348420913138422',
				senderPublicKey: keys.publicKey,
			};
			const alteredTransaction = Object.assign({}, transaction, { amount: '100' });
			const signature = signTransaction(
				transaction, defaultSignatureFirstSecret,
			);
			const alteredTransactionSignature = signTransaction(
				alteredTransaction, defaultSignatureFirstSecret,
			);
			it('should sign a transaction', () => {
				(signature).should.be.equal(expectedSignature);
			});

			it('should not be equal signing a different transaction', () => {
				(alteredTransactionSignature).should.not.be.eql(signature);
			});
		});

		describe('#verify', () => {
			const recipientId = '13356260975429434553L';
			const type = 0;
			const amount = '10';
			const fee = '10000000';
			const senderPublicKey = '215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca';
			const senderSecondPublicKey = '922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa';
			const signature = 'e7027dbe9bb8ebcc1738c560fe0a09161d781d9bfc5df4e9b4ccba2d7a1febcd25ba663938c8d22d4902d37435be149cfb0fd69e7a59daf53469abe8f6509e0c';
			const signSignature = 'e88b4bd56a80de3b15220bdf0d1df0aa024a7a127ef07b8dc36a4e12d50e8eb338bc61ebe510ab15839e23f073cffda2a8c8b3d1fc1f0db5eed114230ecffe0a';
			const id = '6950565552966532158';
			const timestamp = 39541109;
			const asset = {};
			let transactionForVerifyOneSignature;
			let transactionForVerifyTwoSignatures;

			beforeEach(() => {
				transactionForVerifyOneSignature = {
					type, amount, fee, recipientId, senderPublicKey, timestamp, asset, signature, id,
				};
				transactionForVerifyTwoSignatures = Object.assign(
					{}, transactionForVerifyOneSignature, { signSignature, senderSecondPublicKey },
				);
			});

			it('should verify a single signed transaction', () => {
				const verification = verifyTransaction(transactionForVerifyOneSignature);
				(verification).should.be.true();
			});
			it('should verify a second signed transaction', () => {
				const verification = verifyTransaction(
					transactionForVerifyTwoSignatures,
					senderSecondPublicKey,
				);
				(verification).should.be.true();
			});
			it('should not verify a single signed tampered transaction', () => {
				transactionForVerifyOneSignature.amount = 20;
				const verification = verifyTransaction(transactionForVerifyOneSignature);
				(verification).should.be.false();
			});
			it('should not verify a second signed tampered transaction', () => {
				transactionForVerifyTwoSignatures.asset.data = '123';
				const verification = verifyTransaction(
					transactionForVerifyTwoSignatures,
					'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
				);
				(verification).should.be.false();
			});
			it('should throw if try to verify a second sign transaction without secondPublicKey', () => {
				(verifyTransaction.bind(null, transactionForVerifyTwoSignatures)).should.throw('Cannot verify signSignature without secondPublicKey.');
			});
		});
	});

	describe('#multiSignTransaction', () => {
		it('should signTransaction a multisignature transaction', () => {
			const expectedMultiSignature = '9eb6ea53f0fd5079b956625a4f1c09e3638ab3378b0e7847cfcae9dde5a67121dfc49b5e51333296002d70166d0a93d2f4b5eef9eae4e040b83251644bb49409';
			const multiSigtransaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			const multiSignature = multiSignTransaction(multiSigtransaction, defaultSignatureFirstSecret);
			(multiSignature).should.be.eql(expectedMultiSignature);
		});
	});

	describe('#encryptPassphraseWithPassword', () => {
		it('should encrypt a text with a password', () => {
			const cipher = encryptPassphraseWithPassword(secretPassphrase, defaultPassword);
			(cipher).should.be.type('object').and.have.property('cipher').and.be.hexString();
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
			(decrypted).should.be.eql(secretPassphrase);
		});
	});

	describe('encrypting passphrase integration test', () => {
		it('should encrypt a given secret with a password and decrypt it back to the original passphrase', () => {
			const encryptedString = encryptPassphraseWithPassword(secretPassphrase, defaultPassword);
			const decryptedString = decryptPassphraseWithPassword(encryptedString, defaultPassword);
			(decryptedString).should.be.eql(secretPassphrase);
		});
	});
});
