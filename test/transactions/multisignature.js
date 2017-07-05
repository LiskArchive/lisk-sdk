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
		var transaction = lisk.transaction.createTransaction('58191285901858109L', 1000, 'secret');
		var signTransaction = multisignature.signTransaction(transaction, secret);

		it('should return an object', function () {
			(signTransaction).should.be.type('string');
		});

		it('should have a fixed signature length', function () {
			var length = 128; // crypto_sign_BYTES length

			(signTransaction).should.have.lengthOf(length);
		});

	});

	describe('#createTransaction', function () {

		var recipientId = '123456789L';
		var amount = '500';
		var secret = 'privateSecret';
		var secondSecret = 'privateSecondSecret';
		var requesterPublicKey = 'abc123';
		var msigTransaction = lisk.multisignature.createTransaction(recipientId, amount, secret, secondSecret, requesterPublicKey);

		it('should create a multisignature transaction', function () {

			(msigTransaction.signatures).should.be.ok;

		});

		it('should have requesterPublicKey as property', function () {

			(msigTransaction.requesterPublicKey).should.be.equal(requesterPublicKey);
		});

		it('should have the signatures property as empty array', function () {

			(msigTransaction.signatures).should.be.an.Array;

		});

		it('should create a multisignature transaction without requesterPublicKey and secondSecret', function () {

			var msigTransaction2 = lisk.multisignature.createTransaction(recipientId, amount, secret);
			var pubKey = lisk.crypto.getPrivateAndPublicKeyFromSecret(secret).publicKey;

			(msigTransaction2.requesterPublicKey).should.be.equal(pubKey);
		});


	});

});
