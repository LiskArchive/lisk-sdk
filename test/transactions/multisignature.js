if (typeof module !== 'undefined' && module.exports) {
	var common = require('../common');
	var lisk = common.lisk;
}

describe('multisignature.js', function () {

	var multisignature = lisk.multisignature;

	it('should be ok', function () {
		(multisignature).should.be.ok;
	});

	it('should be an Object', function () {
		(multisignature).should.be.type('object');
	});

	it('should have function signTransaction', function () {
		(multisignature.signTransaction).should.be.type('function');
	});

	it('should have function createMultisignature', function () {
		(multisignature.createMultisignature).should.be.type('function');
	});

	it('should have function createTransaction', function () {
		(multisignature.createTransaction).should.be.type('function');
	});

	describe('#createMultisignature with one secret', function () {

		var minimumSignatures = 2;
		var requestLifeTime = 5;
		var multiSignaturePublicKeyArray = ['+123456789', '-987654321'];
		var createMultisig = multisignature.createMultisignature('secret', '', multiSignaturePublicKeyArray, requestLifeTime, minimumSignatures);

		it('should create Multisignature account with single secret', function () {
			(createMultisig).should.be.ok;
			(createMultisig).should.be.type('object');
		});

		it('should be transaction type 4', function () {
			(createMultisig.type).should.be.equal(4);
		});

		it('should have no recipient', function () {
			expect(createMultisig.recipientId).to.be.null;
		});

		it('should contain asset with multisignature and the inserted parameters', function () {
			(createMultisig.asset.multisignature.min).should.be.equal(minimumSignatures);
			(createMultisig.asset.multisignature.lifetime).should.be.equal(requestLifeTime);
			(createMultisig.asset.multisignature.keysgroup).should.be.equal(multiSignaturePublicKeyArray);
		});

		it('should not contain secondSignature', function () {
			expect(createMultisig.signSignature).to.be.undefined;
		});

	});

	describe('#createMultisignature with two secrets', function () {

		var minimumSignatures2 = 6;
		var requestLifeTime2 = 8;
		var multiSignaturePublicKeyArray2 = ['+123456789', '+1236345489', '+123452349', '-987654321', '+12323432489','+1234234789', '-82348375839'];
		var createMultisig2 = multisignature.createMultisignature('secret', 'secondSecret', multiSignaturePublicKeyArray2, requestLifeTime2, minimumSignatures2);

		it('should create Multisignature account with two secrets', function () {
			(createMultisig2).should.be.ok;
			(createMultisig2).should.be.type('object');
		});

		it('should be transaction type 4', function () {
			(createMultisig2.type).should.be.equal(4);
		});

		it('should have no recipient', function () {
			expect(createMultisig2.recipientId).to.be.null;
		});

		it('should contain asset with multisignature and the inserted parameters', function () {
			(createMultisig2.asset.multisignature.min).should.be.equal(minimumSignatures2);
			(createMultisig2.asset.multisignature.lifetime).should.be.equal(requestLifeTime2);
			(createMultisig2.asset.multisignature.keysgroup).should.be.equal(multiSignaturePublicKeyArray2);
		});

		it('should contain secondSignature', function () {
			expect(createMultisig2.signSignature).not.to.be.undefined;
		});

	});

	describe('#signTransaction', function () {

		var secret = '123';
		var transaction = multisignature.createTransaction('58191285901858109L', 1000, 'secret');
		var signTransaction = multisignature.signTransaction(transaction, secret);

		it('should sign a transaction', function () {
			(signTransaction).should.be.ok;
		});

		it('should be a string', function () {
			(signTransaction).should.be.type('string');
		});

		it('should be crypto_sign_BYTES length', function () {
			var length = 128;
			(signTransaction).should.have.lengthOf(length);
		});

		it('should be verifiable', function () {


			var bytes = lisk.crypto.getBytes(transaction);
			var data2 = new Buffer(bytes.length - 64);

			for (var i = 0; i < data2.length; i++) {
				data2[i] = bytes[i];
			}

			var hash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

			var signatureBuffer = new Buffer(signTransaction, 'hex');
			var senderPublicKeyBuffer = new Buffer(transaction.senderPublicKey, 'hex');
			var res = naclInstance.crypto_sign_verify_detached(signatureBuffer, hash, senderPublicKeyBuffer);

			(res).should.be.equal(true);

			/*
			console.log(hash);
			console.log(signatureBuffer);
			console.log(senderPublicKeyBuffer);
			console.log(res);



			var verification = lisk.crypto.verify(signTransaction);
			console.log(verification);
			(verification).should.be.true;
			*/
		});

	});

	describe('#createTransaction', function () {

		var createTransaction = multisignature.createTransaction;
		var trs = null;

		it('should be a function', function () {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction without second signature or requesterPublicKey', function () {
			trs = createTransaction('58191285901858109L', 1000, 'secret');
			(trs).should.be.ok;
			(trs.type).should.be.equal(0);
		});

		it('should create a transaction with secondSignature without requesterPublicKey', function () {
			trs = createTransaction('58191285901858109L', 1000, 'secret', 'secondSecret');
			(trs).should.be.ok;
			(trs.type).should.be.equal(0);
		});

		it('should create a transaction with secondSignature and requesterPublicKey', function () {
			var publicKey = '132321421321';
			trs = createTransaction('58191285901858109L', 1000, 'secret', 'secondSecret', publicKey);
			(trs).should.be.ok;
			(trs.type).should.be.equal(0);
			(trs.requesterPublicKey).should.be.equal(publicKey);
		});

	});

});
