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
	getRawPrivateAndPublicKeyFromSecret,
} from '../../src/crypto/keys';
import {
	bufferToHex,
} from '../../src/crypto/convert';

describe('sign', () => {
	const secretPassphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const secretMessage = 'secret message';
	const notSecretMessage = 'not secret message';
	const defaultSignature = '5fd698d33c009fc358f2085f66465ae50ac3774d1a5c36d5167fbd7f9bac6b648b26bb2976d360b6286fea1c367dd128dad7f0cc241a0301fbcfff4ca77b9e0b6e6f7420736563726574206d657373616765';
	const defaultTwoSignSignature = 'bd47944ce96f5137b786f99d54d007553f81b6d93aaa44925fbfc9a03a7189d4875dc43c1d7800ba0b5f253961eb8286b89e36de0f9e310496222c024f853d005fd698d33c009fc358f2085f66465ae50ac3774d1a5c36d5167fbd7f9bac6b648b26bb2976d360b6286fea1c367dd128dad7f0cc241a0301fbcfff4ca77b9e0b6e6f7420736563726574206d657373616765';
	const defaultSecret = 'secret';
	const defaultSecondSecret = 'second secret';
	const defaultPublicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultSecondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultSignatureFirstSecret = '123';
	const defaultPassword = 'myTotal53cr3t%&';

	describe.only('#signMessageWithSecret', () => {
		const signedMessage = signMessageWithSecret(notSecretMessage, defaultSecret);

		it.skip('should signTransaction the message correctly', () => {
			(signedMessage).should.have.property('message').be.equal(notSecretMessage);
			(signedMessage).should.have.property('signature').be.equal(defaultSignature);
			(signedMessage).should.have.property('publicKey').be.equal(defaultPublicKey);
		});
	});
/*
	describe('#verifyMessageWithPublicKey', () => {
		const signedMessage = signMessageWithSecret(notSecretMessage, defaultSecret);
		const verifyMessage = verifyMessageWithPublicKey(signedMessage, defaultPublicKey);

		it('should output the original signed message', () => {
			(verifyMessage).should.be.equal(notSecretMessage);
		});

		it('should detect invalid publicKeys', () => {
			const invalidPublicKey = `${defaultPublicKey}ERROR`;
			(verifyMessageWithPublicKey.bind(null, signedMessage, invalidPublicKey)).should.throw('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect not verifiable signature', () => {
			const invalidSignedMessage = `${signMessageWithSecret(notSecretMessage, defaultSecret)}ERROR`;
			(verifyMessageWithPublicKey.bind(null, invalidSignedMessage, defaultPublicKey)).should.throw('Invalid signature publicKey combination, cannot verify message');
		});
	});

	describe('signTransaction and print messages', () => {
		const signedMessageExample = `
-----BEGIN LISK SIGNED MESSAGE-----
-----MESSAGE-----
not secret message
-----PUBLIC KEY-----
${defaultPublicKey}
-----SIGNATURE-----
${defaultSignature}
-----END LISK SIGNED MESSAGE-----
`.trim();

		it('#printSignedMessage should wrap the signed message into a printed Lisk template', () => {
			const signedMessage = signMessageWithSecret(notSecretMessage, defaultSecret);
			const printedMessage = printSignedMessage(notSecretMessage, signedMessage, defaultPublicKey);

			(printedMessage).should.be.equal(signedMessageExample);
		});

		it('#signAndPrintMessage should wrap the signed message into a printed Lisk template', () => {
			const signedAndPrintedMessage = signAndPrintMessage(notSecretMessage, defaultSecret);
			(signedAndPrintedMessage).should.be.equal(signedMessageExample);
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

	describe('#signMessageWithTwoSecrets', () => {
		it('should signTransaction a message using two secrets', () => {
			const signature = signMessageWithTwoSecrets(
				notSecretMessage, defaultSecret, defaultSecondSecret,
			);

			(signature).should.be.equal(defaultTwoSignSignature);
		});
	});

	describe('#verifyMessageWithTwoPublicKeys', () => {
		const publicKey1 = defaultPublicKey;
		const publicKey2 = defaultSecondPublicKey;
		const invalidPublicKey1 = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96fe';
		const invalidPublicKey2 = 'caf0f4c00cf9240771975e42b6672c88a832f98f01825dda6e001e2aab0bc';
		it('should verify a message using two publicKeys', () => {
			const verified = verifyMessageWithTwoPublicKeys(
				defaultTwoSignSignature, publicKey1, publicKey2,
			);

			(verified).should.be.equal(notSecretMessage);
		});

		it('should throw on invalid first publicKey', () => {
			(verifyMessageWithTwoPublicKeys.bind(null, defaultTwoSignSignature, invalidPublicKey1, publicKey2)).should.throw('Invalid first publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid second publicKey', () => {
			(verifyMessageWithTwoPublicKeys.bind(null, defaultTwoSignSignature, publicKey1, invalidPublicKey2)).should.throw('Invalid second publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid primary signature', () => {
			const invalidTwoSignSignature = defaultTwoSignSignature.slice(0, 20);
			(verifyMessageWithTwoPublicKeys.bind(null, invalidTwoSignSignature, publicKey1, publicKey2)).should.throw('Invalid signature second publicKey, cannot verify message');
		});

		it('should throw on invalid secondary signature', () => {
			const msgBytes = naclInstance.encode_utf8(notSecretMessage);
			const firstKeys = getRawPrivateAndPublicKeyFromSecret(defaultSecret);
			const secondKeys = getRawPrivateAndPublicKeyFromSecret(defaultSecondSecret);
			const signedMessage = naclInstance.crypto_sign(msgBytes, firstKeys.privateKey).slice(0, 20);
			const doubleSignedMessage = bufferToHex(naclInstance.crypto_sign(
				signedMessage, secondKeys.privateKey,
			));
			(verifyMessageWithTwoPublicKeys.bind(null, doubleSignedMessage, publicKey1, publicKey2)).should.throw('Invalid signature first publicKey, cannot verify message');
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
			const alterTransaction = {
				type: 0,
				amount: '100',
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				id: '13987348420913138422',
				senderPublicKey: keys.publicKey,
			};
			const signature = signTransaction(transaction, defaultSignatureFirstSecret);
			const alterSignature = signTransaction(alterTransaction, defaultSignatureFirstSecret);
			it('should sign a transaction', () => {
				(signature).should.be.equal(expectedSignature);
			});

			it('should not be equal signing a different transaction', () => {
				(alterSignature).should.not.be.eql(signature);
			});
		});

		describe('#verify', () => {
			const transactionForVerifyTwoSignatures = {
				type: 0,
				amount: '10',
				fee: 10000000,
				recipientId: '13356260975429434553L',
				senderPublicKey: '215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				senderSecondPublicKey: '922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
				timestamp: 39541109,
				asset: {},
				signature: 'e7027dbe9bb8ebcc1738c560fe0a09161d781d9bfc5df4e9b4ccba2d7a1febcd25ba663938c8d22d4902d37435be149cfb0fd69e7a59daf53469abe8f6509e0c',
				signSignature: 'e88b4bd56a80de3b15220bdf0d1df0aa024a7a127ef07b8dc36a4e12d50e8eb338bc61ebe510ab15839e23f073cffda2a8c8b3d1fc1f0db5eed114230ecffe0a',
				id: '6950565552966532158',
			};

			const transactionForVerifyOneSignature = {
				type: 0,
				amount: '10',
				fee: 10000000,
				recipientId: '13356260975429434553L',
				senderPublicKey: '215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				timestamp: 39541109,
				asset: {},
				signature: 'e7027dbe9bb8ebcc1738c560fe0a09161d781d9bfc5df4e9b4ccba2d7a1febcd25ba663938c8d22d4902d37435be149cfb0fd69e7a59daf53469abe8f6509e0c',
				id: '6950565552966532158',
			};
			it('should verify a single signed transaction', () => {
				const verification = verifyTransaction(transactionForVerifyOneSignature);
				(verification).should.be.true();
			});
			it('should verify a second signed transaction', () => {
				const verification = verifyTransaction(
					transactionForVerifyTwoSignatures,
					'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
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
	*/
});
