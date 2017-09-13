if (typeof module !== 'undefined' && module.exports) {
	var common = require('../../common');
	var lisk = common.lisk;
}

describe('crypto/index.js', function () {

	var newcrypto = lisk.crypto;

	it('should be ok', function () {
		(newcrypto).should.be.ok;
	});

	it('should be object', function () {
		(newcrypto).should.be.type('object');
	});

	describe('#bufferToHex convert.js', function () {

		it('should create Hex from Buffer type', function () {
			// var buffer = [72, 69, 76, 76, 79];
			var hex = newcrypto.bufferToHex(naclInstance.encode_utf8('\xe5\xe4\xf6'));
			(hex).should.be.equal('c3a5c3a4c3b6');
		});
	});

	describe('#hexToBuffer convert.js', function () {

		it('should create Buffer from Hex type', function () {
			// var hex = 'c3a5c3a4c3b6';
			var buffer = newcrypto.hexToBuffer('68656c6c6f');
			(naclInstance.decode_utf8(buffer)).should.be.equal('hello');
		});
	});

	describe('#useFirstEightBufferEntriesReversed convert.js', function () {
		// TODO Test fails because of prototype difference in buffers.
		// TODO Find out if this is because of NodeJS probably adding them while routing.

		/*
		it('should use a Buffer, cut after first 8 entries and reverse them', function () {
			var keypair = newcrypto.getPrivateAndPublicKeyFromSecret('123');
			var publicKeyHash = newcrypto.getSha256Hash(keypair.publicKey, 'hex');
			var reversedAndCut = newcrypto.useFirstEightBufferEntriesReversed(publicKeyHash);

			(reversedAndCut).should.be.eql(bufferAimed);
		});
		*/
	});

	describe('#getSha256Hash hash.js', function () {

		it('should get a correct Sha256 hash', function () {
			var string = '123';
			var hashString = newcrypto.bufferToHex(newcrypto.getSha256Hash(string));

			(hashString).should.be.equal('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3');
		});
	});

	describe('#getPrivateAndPublicKeyFromSecret keys.js', function () {

		var secret = '123';
		var expectedPublicKey = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
		var expectedPrivateKey = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';

		var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);

		it('should generate the correct publicKey from a secret', function () {
			(keypair.publicKey).should.be.equal(expectedPublicKey);
		});

		it('should generate the correct privateKey from a secret', function () {
			(keypair.privateKey).should.be.equal(expectedPrivateKey);
		});
	});

	describe('#getRawPrivateAndPublicKeyFromSecret keys.js', function () {

		var secret = '123';

		var keypair1 = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
		var keypair2 = newcrypto.getRawPrivateAndPublicKeyFromSecret(secret);

		it('should create the same privateKey as the unraw function', function () {
			(newcrypto.bufferToHex(Buffer.from(keypair2.publicKey))).should.be.equal(keypair1.publicKey);
		});

		it('should create the same privateKey as the unraw function', function () {
			(newcrypto.bufferToHex(Buffer.from(keypair2.privateKey))).should.be.equal(keypair1.privateKey);
		});
	});

	describe('#getAddressFromPublicKey keys.js', function () {

		var keys = lisk.crypto.getKeys('123');
		var address1 = lisk.crypto.getAddress(keys.publicKey);

		var secret = '123';
		var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
		var publicKey = keypair.publicKey;
		var address = newcrypto.getAddressFromPublicKey(publicKey);

		it('should generate the same address as the old function', function () {
			(address).should.be.equal(address1);
		});
	});

	describe('#signMessageWithSecret sign.js', function () {

		var message = 'not secret message';
		var secret = '123';
		var signedMessageDone = '27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765';
		var signedMessage = newcrypto.signMessageWithSecret(message, secret);

		it('should sign a message with message and secret provided', function () {
			(signedMessage).should.be.ok;
		});

		it('should sign the message correctly', function () {
			(signedMessage).should.be.equal(signedMessageDone);
		});
	});

	describe('#verifyMessageWithPublicKey sign.js', function () {

		var message = 'not secret message';
		var secret = '123';
		var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
		var publicKey = keypair.publicKey;
		var signedMessage = newcrypto.signMessageWithSecret(message, secret);
		var verifyMessage = newcrypto.verifyMessageWithPublicKey(signedMessage, publicKey);

		it('should verify the message correctly', function () {
			(verifyMessage).should.be.ok;
		});

		it('should output the original signed message', function () {
			(verifyMessage).should.be.equal(message);
		});

		it('should detect invalid publicKeys', function () {
			var invalidPublicKey = keypair.publicKey + 'ERROR';
			expect(function () {
				newcrypto.verifyMessageWithPublicKey(signedMessage, invalidPublicKey);
			}).to.throw(Error, 'Invalid publicKey, expected 32-byte publicKey');
		});

		it('should detect not verifiable signature', function () {
			var signedMessage = newcrypto.signMessageWithSecret(message, secret) + 'ERROR';
			expect(function () {
				newcrypto.verifyMessageWithPublicKey(signedMessage, publicKey);
			}).to.throw(Error, 'Invalid signature publicKey combination, cannot verify message');
		});
	});

	describe('#printSignedMessage sign.js', function () {

		it('should wrap the signed message into a printed Lisk template', function () {
			var message = 'not secret message';
			var secret = '123';
			var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
			var signedMessage = newcrypto.signMessageWithSecret(message, secret);
			var printedMessage = newcrypto.printSignedMessage(message, signedMessage, keypair.publicKey);

			var signedMessageExample = '-----BEGIN LISK SIGNED MESSAGE-----\n'+
				'-----MESSAGE-----\n'+
				'not secret message\n'+
				'-----PUBLIC KEY-----\n'+
				'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd\n'+
				'-----SIGNATURE-----\n'+
				'27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765\n'+
				'-----END LISK SIGNED MESSAGE-----';

			(printedMessage).should.be.equal(signedMessageExample);
		});
	});

	describe('#signAndPrintMessage sign.js', function () {

		it('should wrap the signed message into a printed Lisk template', function () {
			var message = 'not secret message';
			var secret = '123';
			var printSignedMessage = newcrypto.signAndPrintMessage(message, secret);

			var signedMessageExample = '-----BEGIN LISK SIGNED MESSAGE-----\n'+
				'-----MESSAGE-----\n'+
				'not secret message\n'+
				'-----PUBLIC KEY-----\n'+
				'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd\n'+
				'-----SIGNATURE-----\n'+
				'27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765\n'+
				'-----END LISK SIGNED MESSAGE-----';

			(printSignedMessage).should.be.equal(signedMessageExample);
		});
	});

	describe('#encryptMessageWithSecret sign.js', function () {

		var recipientKeyPair = newcrypto.getPrivateAndPublicKeyFromSecret('1234');
		var encryptedMessage = newcrypto.encryptMessageWithSecret('hello', 'secret', recipientKeyPair.publicKey);

		it('should encrypt a message', function () {
			(encryptedMessage).should.be.ok;
			(encryptedMessage).should.be.type('object');
		});

		it('encrypted message should have nonce and encrypted message hex', function () {
			(encryptedMessage).should.have.property('nonce');
			(encryptedMessage).should.have.property('encryptedMessage');
		});
	});

	describe('#decryptMessageWithSecret sign.js', function () {

		var recipientKeyPair = newcrypto.getPrivateAndPublicKeyFromSecret('1234');
		var senderKeyPair = newcrypto.getPrivateAndPublicKeyFromSecret('secret');
		var message = 'hello this is my secret message';
		var encryptedMessage = newcrypto.encryptMessageWithSecret(message, 'secret', recipientKeyPair.publicKey);

		it('should be able to decrypt the message correctly with given receiver secret', function () {
			var decryptedMessage = newcrypto.decryptMessageWithSecret(encryptedMessage.encryptedMessage, encryptedMessage.nonce, '1234', senderKeyPair.publicKey);

			(decryptedMessage).should.be.ok;
			(decryptedMessage).should.be.equal(message);
		});
	});

	describe('#convertPublicKeyEd2Curve', function () {

		var keyPair = newcrypto.getRawPrivateAndPublicKeyFromSecret('123');

		it('should convert publicKey ED25519 to Curve25519 key', function () {
			var curveRepresentation = newcrypto.convertPublicKeyEd2Curve(keyPair.publicKey);
			curveRepresentation = newcrypto.bufferToHex(curveRepresentation);

			(curveRepresentation).should.be.equal('f65170b330e5ae94fe6372e0ff8b7c709eb8dfe78c816ffac94e7d3ed1729715');
		});
	});

	describe('#convertPrivateKeyEd2Curve sign.js', function () {
		var keyPair = newcrypto.getRawPrivateAndPublicKeyFromSecret('123');

		it('should convert privateKey ED25519 to Curve25519 key', function () {
			var curveRepresentation = newcrypto.convertPrivateKeyEd2Curve(keyPair.privateKey);
			curveRepresentation = newcrypto.bufferToHex(curveRepresentation);

			(curveRepresentation).should.be.equal('a05621ba2d3f69f054abb1f3c155338bb44ec8b718928cf9d5b206bafd364356');
		});
	});
	
	describe('encrypt and decrypt in sign.js', function () {
		var secretPassphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
		var defaultPassword = 'myTotal53cr3t%&';
		describe('#encryptPassphraseWithPassword  sign.js', function () {
			it('should encrypt a text with a password', function () {
				var cipher = newcrypto.encryptPassphraseWithPassword(secretPassphrase, defaultPassword);
				(cipher).should.be.type('object').and.have.property('cipher').and.be.type('string');
				(cipher).should.be.type('object').and.have.property('iv').and.be.type('string').and.have.length(32);
			});
		});
		
		describe('#decryptPassphraseWithPassword  sign.js', function () {
			it('should decrypt a text with a password', function () {
				var cipherAndNonce = {
					cipher: '1c527b9408e77ae79e2ceb1ad5907ec523cd957d30c6a08dc922686e62ed98271910ca5b605f95aec98c438b6214fa7e83e3689f3fba89bfcaee937b35a3d931640afe79c353499a500f14c35bd3fd08',
					iv: '89d0fa0b955219a0e6239339fbb8239f',
				};
				var decrypted = newcrypto.decryptPassphraseWithPassword(cipherAndNonce, defaultPassword);
				(decrypted).should.be.eql(secretPassphrase);
			});
		});
		
		describe('encrypting passphrase integration test  sign.js', function () {
			it('should encrypt a given secret with a password and decrypt it back to the original passphrase', function () {
				var encryptedString = newcrypto.encryptPassphraseWithPassword(secretPassphrase, defaultPassword);
				var decryptedString = newcrypto.decryptPassphraseWithPassword(encryptedString, defaultPassword);
				(decryptedString).should.be.eql(secretPassphrase);
			});
		});
	});
});
