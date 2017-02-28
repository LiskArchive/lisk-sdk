var common = require("../../common");
var lisk = common.lisk;
var should = common.should;
var crypto_lib = common.crypto_lib;


describe("crypto/index.js", function () {
	var newcrypto = lisk.newcrypto;

	it("should be ok", function () {
		(newcrypto).should.be.ok;
	});

	it("should be object", function () {
		(newcrypto).should.be.type("object");
	});

	describe("#bufferToHex convert.js", function() {

		it("should create Hex from Buffer type", function() {

			var buffer = [72, 69, 76, 76, 79];
			var hex = newcrypto.bufferToHex(naclInstance.encode_utf8("\xe5\xe4\xf6"));
			(hex).should.be.equal('c3a5c3a4c3b6');

		});

	});

	describe("#hexToBuffer convert.js", function() {

		it("should create Buffer from Hex type", function() {

			var hex = 'c3a5c3a4c3b6';
			var buffer = newcrypto.hexToBuffer('68656c6c6f');
			(naclInstance.decode_utf8(buffer)).should.be.equal('hello');

		});

	});

	describe("#useFirstEightBufferEntriesReversed convert.js", function() {
		//TODO Test fails because of prototype difference in buffers.
		//TODO Find out if this is because of NodeJS probably adding them while routing

		/*
		it("should use a Buffer, cut after first 8 entries and reverse them", function() {


			var keypair = newcrypto.getPrivateAndPublicKeyFromSecret('123');
			var publicKeyHash = newcrypto.getSha256Hash(keypair.publicKey, 'hex');

			var reversedAndCut = newcrypto.useFirstEightBufferEntriesReversed(publicKeyHash);

			(reversedAndCut).should.be.eql(bufferAimed);


		});
		 */
	});

	describe("#getSha256Hash hash.js", function() {

		it("should get a correct Sha256 hash", function() {

			var string = '123';
			var hashString = newcrypto.bufferToHex(newcrypto.getSha256Hash(string));

			(hashString).should.be.equal('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3');

		});

	});

	describe("#getPrivateAndPublicKeyFromSecret keys.js", function() {

		var secret = '123';
		var expectedPublicKey = 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';
		var expectedPrivateKey = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd';

		var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);

		it("should generate the correct publicKey from a secret", function() {
			(keypair.publicKey).should.be.equal(expectedPublicKey);
		});

		it("should generate the correct privateKey from a secret", function() {
			(keypair.privateKey).should.be.equal(expectedPrivateKey);
		});

	});

	describe("#getRawPrivateAndPublicKeyFromSecret keys.js", function() {

		var secret = '123';

		var keypair1 = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
		var keypair2 = newcrypto.getRawPrivateAndPublicKeyFromSecret(secret);

		it("should create the same privateKey as the unraw function", function() {

			(newcrypto.bufferToHex(Buffer.from(keypair2.publicKey))).should.be.equal(keypair1.publicKey);

		});

		it("should create the same privateKey as the unraw function", function() {

			(newcrypto.bufferToHex(Buffer.from(keypair2.privateKey))).should.be.equal(keypair1.privateKey);

		});

	});

	describe("#getAddressFromPublicKey keys.js", function() {


		var keys = lisk.crypto.getKeys("123");
		var address1 = lisk.crypto.getAddress(keys.publicKey);

		var secret = '123';
		var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
		var publicKey = keypair.publicKey;
		var address = newcrypto.getAddressFromPublicKey(publicKey);

		it("should generate the same address as the old function", function() {

			(address).should.be.equal(address1);
		});

	});

	describe("#signMessageWithSecret sign.js", function() {

		var message = 'not secret message';
		var secret = '123';
		var signedMessageDone = '27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765';

		var signedMessage = newcrypto.signMessageWithSecret(message, secret);

		it("should sign a message with message and secret provided", function() {

			(signedMessage).should.be.ok;

		});

		it("should sign the message correctly", function() {

			(signedMessage).should.be.equal(signedMessageDone);
		});


	});

	describe("#verifyMessageWithPublicKey sign.js", function() {


		var message = 'not secret message';
		var secret = '123';
		var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
		var publicKey = keypair.publicKey;
		var signedMessage = newcrypto.signMessageWithSecret(message, secret);
		var verifyMessage = newcrypto.verifyMessageWithPublicKey(signedMessage, keypair.publicKey);

		it("should verify the message correctly", function() {

			(verifyMessage).should.be.ok;

		});

		it("should output the original signed message", function() {
			(verifyMessage).should.be.equal(message);
		});

	});

	describe("#printSignedMessage sign.js", function() {

		it("should wrap the signed message into a printed Lisk template", function() {

			var message = 'not secret message';
			var secret = '123';
			var keypair = newcrypto.getPrivateAndPublicKeyFromSecret(secret);
			var signedMessage = newcrypto.signMessageWithSecret(message, secret);
			var printedMessage = newcrypto.printSignedMessage(message, signedMessage, keypair.publicKey);

			var signedMessageExample = '-----BEGIN LISK SIGNED MESSAGE-----\n'+
				'not secret message\n'+
				'-----BEGIN SIGNATURE-----\n'+
				'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd\n'+
				'27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765\n'+
				'-----END LISK SIGNED MESSAGE-----';

			(printedMessage).should.be.equal(signedMessageExample);


		});


	});

	describe("#signAndPrintMessage sign.js", function() {

		it("should wrap the signed message into a printed Lisk template", function() {

			var message = 'not secret message';
			var secret = '123';
			var printSignedMessage = newcrypto.signAndPrintMessage(message, secret);

			var signedMessageExample = '-----BEGIN LISK SIGNED MESSAGE-----\n'+
				'not secret message\n'+
				'-----BEGIN SIGNATURE-----\n'+
				'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd\n'+
				'27859f913636aa3e9f7000c07b86c4b1eff17b415c5772619e05d86eabf07724551d96685c44533df3682a9b3c229df27b17a282516100d3f1eae4581cd6cd026e6f7420736563726574206d657373616765\n'+
				'-----END LISK SIGNED MESSAGE-----';

			(printSignedMessage).should.be.equal(signedMessageExample);


		});


	});


});