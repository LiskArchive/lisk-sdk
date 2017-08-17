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
import newCrypto from '../../../src/transactions/crypto/index';
import oldCrypto from '../../../src/transactions/crypto';

describe('crypto/index.js', () => {
	it('should be ok', () => {
		(newCrypto).should.be.ok();
	});

	it('should be object', () => {
		(newCrypto).should.be.type('object');
	});

	describe('#bufferToHex convert.js', () => {
		it('should create Hex from Buffer type', () => {
			// var buffer = [72, 69, 76, 76, 79];
			const hex = newCrypto.bufferToHex(naclInstance.encode_utf8('\xe5\xe4\xf6'));
			(hex).should.be.equal('c3a5c3a4c3b6');
		});
	});

	describe('#hexToBuffer convert.js', () => {
		it('should create Buffer from Hex type', () => {
			// var hex = 'c3a5c3a4c3b6';
			const buffer = newCrypto.hexToBuffer('68656c6c6f');
			(naclInstance.decode_utf8(buffer)).should.be.equal('hello');
		});
	});

	describe('#useFirstEightBufferEntriesReversed, #toAddress convert.js', () => {
		it('should use a Buffer, cut after first 8 entries and reverse them. Create numeric addresss from this', () => {
			const keypair = newCrypto.getPrivateAndPublicKeyFromSecret('123');
			const publicKeyHash = newCrypto.getSha256Hash(keypair.publicKey, 'hex');
			const reversedAndCut = newCrypto.useFirstEightBufferEntriesReversed(publicKeyHash);
			const numbericAddress = newCrypto.toAddress(reversedAndCut);

			(numbericAddress).should.be.equal('12475940823804898745L');
		});
	});

	describe('#getSha256Hash hash.js', () => {
		it('should get a correct Sha256 hash', () => {
			const string = '123';
			const hashString = newCrypto.bufferToHex(newCrypto.getSha256Hash(string));

			(hashString).should.be.equal('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3');
		});
	});

	describe('#getPrivateAndPublicKeyFromSecret keys.js', () => {
		const secret = '123';
		const expectedPublicKey = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
		const expectedPrivateKey = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';

		const keypair = newCrypto.getPrivateAndPublicKeyFromSecret(secret);

		it('should generate the correct publicKey from a secret', () => {
			(keypair.publicKey).should.be.equal(expectedPublicKey);
		});

		it('should generate the correct privateKey from a secret', () => {
			(keypair.privateKey).should.be.equal(expectedPrivateKey);
		});
	});

	describe('#getRawPrivateAndPublicKeyFromSecret keys.js', () => {
		const secret = '123';

		const keypair1 = newCrypto.getPrivateAndPublicKeyFromSecret(secret);
		const keypair2 = newCrypto.getRawPrivateAndPublicKeyFromSecret(secret);

		it('should create the same privateKey as the unraw function', () => {
			(newCrypto.bufferToHex(Buffer.from(keypair2.publicKey))).should.be.equal(keypair1.publicKey);
		});

		it('should create the same privateKey as the unraw function', () => {
			(newCrypto.bufferToHex(Buffer.from(keypair2.privateKey)))
				.should.be.equal(keypair1.privateKey);
		});
	});

	describe('#getAddressFromPublicKey keys.js', () => {
		const keys = oldCrypto.getKeys('123');
		const address1 = oldCrypto.getAddress(keys.publicKey);

		const secret = '123';
		const keypair = newCrypto.getPrivateAndPublicKeyFromSecret(secret);
		const publicKey = keypair.publicKey;
		const address = newCrypto.getAddressFromPublicKey(publicKey);

		it('should generate the same address as the old function', () => {
			(address).should.be.equal(address1);
		});
	});

	describe('#signMessageWithSecret sign.js', () => {
		const message = 'not secret message';
		const secret = '123';
		const signedMessageDone = '27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765';
		const signedMessage = newCrypto.signMessageWithSecret(message, secret);

		it('should sign a message with message and secret provided', () => {
			(signedMessage).should.be.ok();
		});

		it('should sign the message correctly', () => {
			(signedMessage).should.be.equal(signedMessageDone);
		});
	});

	describe('#verifyMessageWithPublicKey sign.js', () => {
		const message = 'not secret message';
		const secret = '123';
		const keypair = newCrypto.getPrivateAndPublicKeyFromSecret(secret);
		const publicKey = keypair.publicKey;
		const signedMessage = newCrypto.signMessageWithSecret(message, secret);
		const verifyMessage = newCrypto.verifyMessageWithPublicKey(signedMessage, publicKey);

		it('should verify the message correctly', () => {
			(verifyMessage).should.be.ok();
		});

		it('should output the original signed message', () => {
			(verifyMessage).should.be.equal(message);
		});

		it('should detect invalid publicKeys', () => {
			const invalidPublicKey = `${keypair.publicKey}ERROR`;
			(function verifyMessageWithInvalidPublicKey() {
				newCrypto.verifyMessageWithPublicKey(signedMessage, invalidPublicKey);
			}).should.throw('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect not verifiable signature', () => {
			const invalidSignedMessage = `${newCrypto.signMessageWithSecret(message, secret)}ERROR`;
			(function verifyInvalidMessageWithPublicKey() {
				newCrypto.verifyMessageWithPublicKey(invalidSignedMessage, publicKey);
			}).should.throw('Invalid signature publicKey combination, cannot verify message');
		});
	});

	describe('#printSignedMessage sign.js', () => {
		it('should wrap the signed message into a printed Lisk template', () => {
			const message = 'not secret message';
			const secret = '123';
			const keypair = newCrypto.getPrivateAndPublicKeyFromSecret(secret);
			const signedMessage = newCrypto.signMessageWithSecret(message, secret);
			const printedMessage = newCrypto
				.printSignedMessage(message, signedMessage, keypair.publicKey);

			const signedMessageExample = '-----BEGIN LISK SIGNED MESSAGE-----\n' +
				'-----MESSAGE-----\n' +
				'not secret message\n' +
				'-----PUBLIC KEY-----\n' +
				'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd\n' +
				'-----SIGNATURE-----\n' +
				'27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765\n' +
				'-----END LISK SIGNED MESSAGE-----';

			(printedMessage).should.be.equal(signedMessageExample);
		});
	});

	describe('#signAndPrintMessage sign.js', () => {
		it('should wrap the signed message into a printed Lisk template', () => {
			const message = 'not secret message';
			const secret = '123';
			const printSignedMessage = newCrypto.signAndPrintMessage(message, secret);

			const signedMessageExample = '-----BEGIN LISK SIGNED MESSAGE-----\n' +
				'-----MESSAGE-----\n' +
				'not secret message\n' +
				'-----PUBLIC KEY-----\n' +
				'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd\n' +
				'-----SIGNATURE-----\n' +
				'27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765\n' +
				'-----END LISK SIGNED MESSAGE-----';

			(printSignedMessage).should.be.equal(signedMessageExample);
		});
	});

	describe('#encryptMessageWithSecret sign.js', () => {
		const recipientKeyPair = newCrypto.getPrivateAndPublicKeyFromSecret('1234');
		const encryptedMessage = newCrypto.encryptMessageWithSecret('hello', 'secret', recipientKeyPair.publicKey);

		it('should encrypt a message', () => {
			(encryptedMessage).should.be.ok();
			(encryptedMessage).should.be.type('object');
		});

		it('encrypted message should have nonce and encrypted message hex', () => {
			(encryptedMessage).should.have.property('nonce');
			(encryptedMessage).should.have.property('encryptedMessage');
		});
	});

	describe('#decryptMessageWithSecret sign.js', () => {
		const recipientKeyPair = newCrypto.getPrivateAndPublicKeyFromSecret('1234');
		const senderKeyPair = newCrypto.getPrivateAndPublicKeyFromSecret('secret');
		const message = 'hello this is my secret message';
		const encryptedMessage = newCrypto.encryptMessageWithSecret(message, 'secret', recipientKeyPair.publicKey);

		it('should be able to decrypt the message correctly with given receiver secret', () => {
			const decryptedMessage = newCrypto.decryptMessageWithSecret(encryptedMessage.encryptedMessage, encryptedMessage.nonce, '1234', senderKeyPair.publicKey);

			(decryptedMessage).should.be.ok();
			(decryptedMessage).should.be.equal(message);
		});
	});

	describe('#convertPublicKeyEd2Curve', () => {
		const keyPair = newCrypto.getRawPrivateAndPublicKeyFromSecret('123');

		it('should convert publicKey ED25519 to Curve25519 key', () => {
			let curveRepresentation = newCrypto.convertPublicKeyEd2Curve(keyPair.publicKey);
			curveRepresentation = newCrypto.bufferToHex(curveRepresentation);

			(curveRepresentation).should.be.equal('f65170b330e5ae94fe6372e0ff8b7c709eb8dfe78c816ffac94e7d3ed1729715');
		});
	});

	describe('#convertPrivateKeyEd2Curve sign.js', () => {
		const keyPair = newCrypto.getRawPrivateAndPublicKeyFromSecret('123');

		it('should convert privateKey ED25519 to Curve25519 key', () => {
			let curveRepresentation = newCrypto.convertPrivateKeyEd2Curve(keyPair.privateKey);
			curveRepresentation = newCrypto.bufferToHex(curveRepresentation);

			(curveRepresentation).should.be.equal('a05621ba2d3f69f054abb1f3c155338bb44ec8b718928cf9d5b206bafd364356');
		});
	});

	describe('#signMessageWithTwoSecrets sign.js', () => {
		it('should sign a message using two secrets', () => {
			const secret = '123';
			const secondSecret = '1234';
			const message = 'Hello.';
			const signature = newCrypto.signMessageWithTwoSecrets(message, secret, secondSecret);

			(signature).should.be.equal('7e824f3cf65fd966a9064e4ba0041f82956c795f88343965265cf6e5e6ef94fd3692a1abc6a9c95a23935ad56ae4b72fb85f0317ba5a135dd16fdd916361430d5cabc8fcb71c11280f51ca379abae0f5fdd897d8446170f0a591d943b0b10cc13fe0bdab24daa05243647bb90ced16ebb93bbe07333aae0b80108aa08c1a310348656c6c6f2e');
		});
	});

	describe('#verifyMessageWithTwoPublicKeys sign.js', () => {
		it('should verify a message using two publicKeys', () => {
			const signature = '7e824f3cf65fd966a9064e4ba0041f82956c795f88343965265cf6e5e6ef94fd3692a1abc6a9c95a23935ad56ae4b72fb85f0317ba5a135dd16fdd916361430d5cabc8fcb71c11280f51ca379abae0f5fdd897d8446170f0a591d943b0b10cc13fe0bdab24daa05243647bb90ced16ebb93bbe07333aae0b80108aa08c1a310348656c6c6f2e';

			const publicKey1 = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
			const publicKey2 = 'caf0f4c00cf9240771975e42b6672c88a832f98f01825dda6e001e2aab0bc0cc';

			const verified = newCrypto.verifyMessageWithTwoPublicKeys(signature, publicKey1, publicKey2);

			(verified).should.be.equal('Hello.');
		});
	});
});
