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
import cryptoModule from '../../src/crypto/index';
import { getBytes } from '../../src/transactions/transactionBytes';

describe('crypto/index.js', () => {
	it('should be ok', () => {
		(cryptoModule).should.be.ok();
	});

	it('should be object', () => {
		(cryptoModule).should.be.type('object');
	});

	describe('#bufferToHex convert.js', () => {
		it('should create Hex from Buffer type', () => {
			// var buffer = [72, 69, 76, 76, 79];
			const hex = cryptoModule.bufferToHex(naclInstance.encode_utf8('\xe5\xe4\xf6'));
			(hex).should.be.equal('c3a5c3a4c3b6');
		});
	});

	describe('#hexToBuffer convert.js', () => {
		it('should create Buffer from Hex type', () => {
			// var hex = 'c3a5c3a4c3b6';
			const buffer = cryptoModule.hexToBuffer('68656c6c6f');
			(naclInstance.decode_utf8(buffer)).should.be.equal('hello');
		});
	});

	describe('#useFirstEightBufferEntriesReversed, #toAddress convert.js', () => {
		it('should use a Buffer, cut after first 8 entries and reverse them. Create numeric addresss from this', () => {
			const keypair = cryptoModule.getPrivateAndPublicKeyFromSecret('123');
			const publicKeyHash = cryptoModule.getSha256Hash(keypair.publicKey, 'hex');
			const reversedAndCut = cryptoModule.useFirstEightBufferEntriesReversed(publicKeyHash);
			const numbericAddress = cryptoModule.toAddress(reversedAndCut);

			(numbericAddress).should.be.equal('12475940823804898745L');
		});
	});

	describe('#getSha256Hash hash.js', () => {
		it('should get a correct Sha256 hash', () => {
			const string = '123';
			const hashString = cryptoModule.bufferToHex(cryptoModule.getSha256Hash(string));

			(hashString).should.be.equal('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3');
		});
	});

	describe('#getPrivateAndPublicKeyFromSecret keys.js', () => {
		const secret = '123';
		const expectedPublicKey = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
		const expectedPrivateKey = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';

		const keypair = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);

		it('should generate the correct publicKey from a secret', () => {
			(keypair.publicKey).should.be.equal(expectedPublicKey);
		});

		it('should generate the correct privateKey from a secret', () => {
			(keypair.privateKey).should.be.equal(expectedPrivateKey);
		});
	});

	describe('#getRawPrivateAndPublicKeyFromSecret keys.js', () => {
		const secret = '123';

		const keypair1 = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);
		const keypair2 = cryptoModule.getRawPrivateAndPublicKeyFromSecret(secret);

		it('should create the same privateKey as the unraw function', () => {
			(cryptoModule.bufferToHex(Buffer.from(keypair2.publicKey))).should.be.equal(keypair1.publicKey);
		});

		it('should create the same privateKey as the unraw function', () => {
			(cryptoModule.bufferToHex(Buffer.from(keypair2.privateKey)))
				.should.be.equal(keypair1.privateKey);
		});
	});

	describe('#getAddressFromPublicKey keys.js', () => {
		const keys = cryptoModule.getKeys('123');
		const address1 = cryptoModule.getAddress(keys.publicKey);

		const secret = '123';
		const keypair = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);
		const publicKey = keypair.publicKey;
		const address = cryptoModule.getAddressFromPublicKey(publicKey);

		it('should generate the same address as the old function', () => {
			(address).should.be.equal(address1);
		});
	});

	describe('#signMessageWithSecret sign.js', () => {
		const message = 'not secret message';
		const secret = '123';
		const signedMessageDone = '27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765';
		const signedMessage = cryptoModule.signMessageWithSecret(message, secret);

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
		const keypair = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);
		const publicKey = keypair.publicKey;
		const signedMessage = cryptoModule.signMessageWithSecret(message, secret);
		const verifyMessage = cryptoModule.verifyMessageWithPublicKey(signedMessage, publicKey);

		it('should verify the message correctly', () => {
			(verifyMessage).should.be.ok();
		});

		it('should output the original signed message', () => {
			(verifyMessage).should.be.equal(message);
		});

		it('should detect invalid publicKeys', () => {
			const invalidPublicKey = `${keypair.publicKey}ERROR`;
			(function verifyMessageWithInvalidPublicKey() {
				cryptoModule.verifyMessageWithPublicKey(signedMessage, invalidPublicKey);
			}).should.throw('Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect not verifiable signature', () => {
			const invalidSignedMessage = `${cryptoModule.signMessageWithSecret(message, secret)}ERROR`;
			(function verifyInvalidMessageWithPublicKey() {
				cryptoModule.verifyMessageWithPublicKey(invalidSignedMessage, publicKey);
			}).should.throw('Invalid signature publicKey combination, cannot verify message');
		});
	});

	describe('#printSignedMessage sign.js', () => {
		it('should wrap the signed message into a printed Lisk template', () => {
			const message = 'not secret message';
			const secret = '123';
			const keypair = cryptoModule.getPrivateAndPublicKeyFromSecret(secret);
			const signedMessage = cryptoModule.signMessageWithSecret(message, secret);
			const printedMessage = cryptoModule
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
			const printSignedMessage = cryptoModule.signAndPrintMessage(message, secret);

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
		const recipientKeyPair = cryptoModule.getPrivateAndPublicKeyFromSecret('1234');
		const encryptedMessage = cryptoModule.encryptMessageWithSecret('hello', 'secret', recipientKeyPair.publicKey);

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
		const recipientKeyPair = cryptoModule.getPrivateAndPublicKeyFromSecret('1234');
		const senderKeyPair = cryptoModule.getPrivateAndPublicKeyFromSecret('secret');
		const message = 'hello this is my secret message';
		const encryptedMessage = cryptoModule.encryptMessageWithSecret(message, 'secret', recipientKeyPair.publicKey);

		it('should be able to decrypt the message correctly with given receiver secret', () => {
			const decryptedMessage = cryptoModule.decryptMessageWithSecret(encryptedMessage.encryptedMessage, encryptedMessage.nonce, '1234', senderKeyPair.publicKey);

			(decryptedMessage).should.be.ok();
			(decryptedMessage).should.be.equal(message);
		});
	});

	describe('#convertPublicKeyEd2Curve', () => {
		const keyPair = cryptoModule.getRawPrivateAndPublicKeyFromSecret('123');

		it('should convert publicKey ED25519 to Curve25519 key', () => {
			let curveRepresentation = cryptoModule.convertPublicKeyEd2Curve(keyPair.publicKey);
			curveRepresentation = cryptoModule.bufferToHex(curveRepresentation);

			(curveRepresentation).should.be.equal('f65170b330e5ae94fe6372e0ff8b7c709eb8dfe78c816ffac94e7d3ed1729715');
		});
	});

	describe('#convertPrivateKeyEd2Curve sign.js', () => {
		const keyPair = cryptoModule.getRawPrivateAndPublicKeyFromSecret('123');

		it('should convert privateKey ED25519 to Curve25519 key', () => {
			let curveRepresentation = cryptoModule.convertPrivateKeyEd2Curve(keyPair.privateKey);
			curveRepresentation = cryptoModule.bufferToHex(curveRepresentation);

			(curveRepresentation).should.be.equal('a05621ba2d3f69f054abb1f3c155338bb44ec8b718928cf9d5b206bafd364356');
		});
	});

	describe('#signMessageWithTwoSecrets sign.js', () => {
		it('should sign a message using two secrets', () => {
			const secret = '123';
			const secondSecret = '1234';
			const message = 'Hello.';
			const signature = cryptoModule.signMessageWithTwoSecrets(message, secret, secondSecret);

			(signature).should.be.equal('7e824f3cf65fd966a9064e4ba0041f82956c795f88343965265cf6e5e6ef94fd3692a1abc6a9c95a23935ad56ae4b72fb85f0317ba5a135dd16fdd916361430d5cabc8fcb71c11280f51ca379abae0f5fdd897d8446170f0a591d943b0b10cc13fe0bdab24daa05243647bb90ced16ebb93bbe07333aae0b80108aa08c1a310348656c6c6f2e');
		});
	});

	describe('#verifyMessageWithTwoPublicKeys sign.js', () => {
		it('should verify a message using two publicKeys', () => {
			const signature = '7e824f3cf65fd966a9064e4ba0041f82956c795f88343965265cf6e5e6ef94fd3692a1abc6a9c95a23935ad56ae4b72fb85f0317ba5a135dd16fdd916361430d5cabc8fcb71c11280f51ca379abae0f5fdd897d8446170f0a591d943b0b10cc13fe0bdab24daa05243647bb90ced16ebb93bbe07333aae0b80108aa08c1a310348656c6c6f2e';

			const publicKey1 = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
			const publicKey2 = 'caf0f4c00cf9240771975e42b6672c88a832f98f01825dda6e001e2aab0bc0cc';

			const verified = cryptoModule.verifyMessageWithTwoPublicKeys(signature, publicKey1, publicKey2);

			(verified).should.be.equal('Hello.');
		});
	});
});


describe('crypto.js', () => {
	it('should be ok', () => {
		(cryptoModule).should.be.ok();
	});

	it('should be object', () => {
		(cryptoModule).should.be.type('object');
	});

	it('should has properties', () => {
		const properties = ['getHash', 'getId', 'sign', 'getKeys', 'getAddress', 'verify', 'verifySecondSignature'];
		properties.forEach((property) => {
			(cryptoModule).should.have.property(property);
		});
	});

	describe('#getBytes', () => {
		let bytes = null;

		it('should be ok', () => {
			(getBytes).should.be.ok();
		});

		it('should be a function', () => {
			(getBytes).should.be.type('function');
		});

		it('should return Buffer of simply transaction and buffer most be 117 length', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			bytes = getBytes(transaction);
			(bytes).should.be.ok();
			(bytes).should.be.type('object');
			(bytes.length).should.be.equal(117);
		});

		it('should return Buffer of transaction with second signature and buffer most be 181 length', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				signSignature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			bytes = getBytes(transaction);
			(bytes).should.be.ok();
			(bytes).should.be.type('object');
			(bytes.length).should.be.equal(181);
		});
	});

	describe('#getHash', () => {
		const getHash = cryptoModule.getHash;

		it('should be ok', () => {
			(getHash).should.be.ok();
		});

		it('should be a function', () => {
			(getHash).should.be.type('function');
		});

		it('should return Buffer and Buffer most be 32 bytes length', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			const result = getHash(transaction);
			(result).should.be.ok();
			(result).should.be.type('object');
			(result.length).should.be.equal(32);
		});
	});

	describe('#getId', () => {
		const getId = cryptoModule.getId;

		it('should be ok', () => {
			(getId).should.be.ok();
		});

		it('should be a function', () => {
			(getId).should.be.type('function');
		});

		it('should return string id and be equal to 13987348420913138422', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
			};

			const id = getId(transaction);
			(id).should.be.type('string').and.equal('13987348420913138422');
		});
	});


	describe('#getKeys', () => {
		const getKeys = cryptoModule.getKeys;

		it('should be ok', () => {
			(getKeys).should.be.ok();
		});

		it('should be a function', () => {
			(getKeys).should.be.type('function');
		});

		it('should return two keys in hex', () => {
			const keys = getKeys('secret');

			(keys).should.be.ok();
			(keys).should.be.type('object');
			(keys).should.have.property('publicKey').and.be.type('string').and.be.hexString();
			(keys).should.have.property('privateKey').and.be.type('string').and.be.hexString();
		});
	});

	describe('#getAddress', () => {
		const getAddress = cryptoModule.getAddress;

		it('should be ok', () => {
			(getAddress).should.be.ok();
		});

		it('should be a function', () => {
			(getAddress).should.be.type('function');
		});

		it('should generate address by publicKey', () => {
			const keys = cryptoModule.getKeys('secret');
			const address = getAddress(keys.publicKey);

			(address).should.be.ok();
			(address).should.be.type('string');
			(address).should.be.equal('18160565574430594874L');
		});
	});

	describe('sign and verify', () => {
		const sign = cryptoModule.sign;
		const verify = cryptoModule.verify;
		const keys = cryptoModule.getKeys('123');
		const secondKeys = cryptoModule.getKeys('345');
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
		const signature = sign(transaction, keys);
		const alterTransaction = {
			type: 0,
			amount: '100',
			recipientId: '58191285901858109L',
			timestamp: 141738,
			asset: {},
			id: '13987348420913138422',
			senderPublicKey: keys.publicKey,
		};
		const alterSignature = sign(alterTransaction, keys);
		const transactionToVerify = Object.assign({}, transaction, {
			signature: sign(transaction, keys),
		});
		const transactionToSecondVerify = Object.assign({}, transactionToVerify, {
			signSignature: sign(transactionToVerify, secondKeys),
		});

		describe('#sign', () => {
			it('should be ok', () => {
				(sign).should.be.ok();
			});

			it('should be a function', () => {
				(sign).should.be.type('function');
			});

			it('should sign a transaction', () => {
				(signature).should.be.equal(expectedSignature);
			});

			it('should not be equal signing a different transaction', () => {
				(alterSignature).should.not.be.eql(signature);
			});
		});

		describe('#verify', () => {
			it('should be ok', () => {
				(verify).should.be.ok();
			});

			it('should be function', () => {
				(verify).should.be.type('function');
			});

			it('should verify a transaction', () => {
				const verification = verify(transactionToVerify);
				(verification).should.be.true();
			});
		});

		describe('#verifySecondSignature', () => {
			const verifySecondSignature = cryptoModule.verifySecondSignature;

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

		describe('#multiSign', () => {
			const multiSign = cryptoModule.multiSign;

			it('should be ok', () => {
				(multiSign).should.be.ok();
			});

			it('should be function', () => {
				(multiSign).should.be.type('function');
			});

			it('should sign a multisignature transaction', () => {
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

				const multiSignature = multiSign(multiSigtransaction, keys);

				(multiSignature).should.be.eql(expectedMultiSignature);
			});
		});
	});
});
