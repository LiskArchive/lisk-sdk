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
} from '../../src/crypto/sign';
import {
	getKeys,
	getRawPrivateAndPublicKeyFromSecret
} from '../../src/crypto/keys';
import {
	bufferToHex
} from '../../src/crypto/convert';

describe('sign', () => {
	const secretMessage = 'secret message';
	const notSecretMessage = 'not secret message';
	const defaultSignature = '5fd698d33c009fc358f2085f66465ae50ac3774d1a5c36d5167fbd7f9bac6b648b26bb2976d360b6286fea1c367dd128dad7f0cc241a0301fbcfff4ca77b9e0b6e6f7420736563726574206d657373616765';
	const defaultTwoSignSignature = 'bd47944ce96f5137b786f99d54d007553f81b6d93aaa44925fbfc9a03a7189d4875dc43c1d7800ba0b5f253961eb8286b89e36de0f9e310496222c024f853d005fd698d33c009fc358f2085f66465ae50ac3774d1a5c36d5167fbd7f9bac6b648b26bb2976d360b6286fea1c367dd128dad7f0cc241a0301fbcfff4ca77b9e0b6e6f7420736563726574206d657373616765';
	const defaultSecret = 'secret';
	const defaultSecondSecret = 'second secret';
	const defaultPublicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultSecondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';

	describe('#signMessageWithSecret', () => {
		const signedMessage = signMessageWithSecret(notSecretMessage, defaultSecret);

		it('should signTransaction a message with message and secret provided', () => {
			(signedMessage).should.be.ok();
		});

		it('should signTransaction the message correctly', () => {
			(signedMessage).should.be.equal(defaultSignature);
		});
	});

	describe('#verifyMessageWithPublicKey', () => {
		const signedMessage = signMessageWithSecret(notSecretMessage, defaultSecret);
		const verifyMessage = verifyMessageWithPublicKey(signedMessage, defaultPublicKey);

		it('should verify the message correctly', () => {
			(verifyMessage).should.be.ok();
		});

		it('should output the original signed message', () => {
			(verifyMessage).should.be.equal(notSecretMessage);
		});

		it('should detect invalid publicKeys', () => {
			const invalidPublicKey = `${defaultPublicKey}ERROR`;
			(function verifyMessageWithInvalidPublicKey() {
				verifyMessageWithPublicKey(signedMessage, invalidPublicKey);
			}).should.throw('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect not verifiable signature', () => {
			const invalidSignedMessage = `${signMessageWithSecret(notSecretMessage, defaultSecret)}ERROR`;
			(function verifyInvalidMessageWithPublicKey() {
				verifyMessageWithPublicKey(invalidSignedMessage, defaultPublicKey);
			}).should.throw('Invalid signature publicKey combination, cannot verify message');
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
			const printSignedMessage = signAndPrintMessage(notSecretMessage, defaultSecret);
			(printSignedMessage).should.be.equal(signedMessageExample);
		});
	});
	describe('#encryptMessageWithSecret', () => {
		const encryptedMessage = encryptMessageWithSecret(
			secretMessage, defaultSecret, defaultPublicKey,
		);

		it('should encrypt a message', () => {
			(encryptedMessage).should.be.ok();
			(encryptedMessage).should.be.type('object');
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
			(function verifyMessageWithFirstInvalidPublicKey() {
				verifyMessageWithTwoPublicKeys(
					defaultTwoSignSignature, invalidPublicKey1, publicKey2,
				);
			}).should.throw('Invalid first publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid second publicKey', () => {
			(function verifyMessageWithSecondInvalidPublicKey() {
				verifyMessageWithTwoPublicKeys(
					defaultTwoSignSignature, publicKey1, invalidPublicKey2,
				);
			}).should.throw('Invalid second publicKey, expected 32-byte publicKey');
		});

		it('should throw on invalid primary signature', () => {
			(function verifyMessageWithSecondInvalidPublicKey() {
				const invalidTwoSignSignature = defaultTwoSignSignature.slice(0, 20);
				verifyMessageWithTwoPublicKeys(
					invalidTwoSignSignature, publicKey1, publicKey2,
				);
			}).should.throw('Invalid signature second publicKey, cannot verify message');
		});

		it('should throw on invalid secondary signature', () => {
			(function verifyMessageWithSecondInvalidPublicKey() {
				const msgBytes = naclInstance.encode_utf8(notSecretMessage);
				const firstKeys = getRawPrivateAndPublicKeyFromSecret(defaultSecret);
				const secondKeys = getRawPrivateAndPublicKeyFromSecret(defaultSecondSecret);
				const signedMessage = naclInstance.crypto_sign(msgBytes, firstKeys.privateKey).slice(0, 20);
				const doubleSignedMessage = bufferToHex(naclInstance.crypto_sign(
					signedMessage, secondKeys.privateKey,
				));
				verifyMessageWithTwoPublicKeys(doubleSignedMessage, publicKey1, publicKey2);
			}).should.throw('Invalid signature first publicKey, cannot verify message');
		});
	});

	describe('signTransaction and verify', () => {
		const keys = getKeys('123');
		const secondKeys = getKeys('345');
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
		const transactionToVerify = Object.assign({}, transaction, {
			signature: signTransaction(transaction, keys),
		});
		const transactionToSecondVerify = Object.assign({}, transactionToVerify, {
			signSignature: signTransaction(transactionToVerify, secondKeys),
		});

		describe('#signTransaction', () => {
			const signature = signTransaction(transaction, keys);
			const alterSignature = signTransaction(alterTransaction, keys);
			it('should be ok', () => {
				(signTransaction).should.be.ok();
			});

			it('should be a function', () => {
				(signTransaction).should.be.type('function');
			});

			it('should signTransaction a transaction', () => {
				(signature).should.be.equal(expectedSignature);
			});

			it('should not be equal signing a different transaction', () => {
				(alterSignature).should.not.be.eql(signature);
			});
		});

		describe('#verify', () => {
			it('should be ok', () => {
				(verifyTransaction).should.be.ok();
			});

			it('should be function', () => {
				(verifyTransaction).should.be.type('function');
			});

			it('should verify a transaction', () => {
				const verification = verifyTransaction(transactionToVerify);
				(verification).should.be.true();
			});
		});

		describe.skip('#verifySecondSignature', () => {
			it('should be ok', () => {
				(verifySecondSignature).should.be.ok();
			});

			it('should be function', () => {
				(verifySecondSignature).should.be.type('function');
			});

			it('should verify a second signed transaction', () => {
				const verification = verifySecondSignature(transactionToSecondVerify, secondKeys.publicKey);
				(verification).should.be.true();
			});
		});

		describe('#multiSignTransaction', () => {
			it('should be ok', () => {
				(multiSignTransaction).should.be.ok();
			});

			it('should be function', () => {
				(multiSignTransaction).should.be.type('function');
			});

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

				const multiSignature = multiSignTransaction(multiSigtransaction, keys);

				(multiSignature).should.be.eql(expectedMultiSignature);
			});
		});
	});
});
