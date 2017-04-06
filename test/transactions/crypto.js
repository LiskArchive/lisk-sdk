if (typeof module !== 'undefined' && module.exports) {
	var common = require('../common');
	var lisk = common.lisk;
}

describe('crypto.js', function () {

	var crypto = lisk.crypto;

	it('should be ok', function () {
		(crypto).should.be.ok;
	});

	it('should be object', function () {
		(crypto).should.be.type('object');
	});

	it('should has properties', function () {
		var properties = ['getBytes', 'getHash', 'getId', 'getFee', 'sign', 'secondSign', 'getKeys', 'getAddress', 'verify', 'verifySecondSignature', 'fixedPoint'];
		properties.forEach(function (property) {
			(crypto).should.have.property(property);
		});
	});

	describe('#getBytes', function () {

		var getBytes = crypto.getBytes;
		var bytes = null;

		it('should be ok', function () {
			(getBytes).should.be.ok;
		});

		it('should be a function', function () {
			(getBytes).should.be.type('function');
		});

		it('should return Buffer of simply transaction and buffer most be 117 length', function () {
			var transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422'
			};

			bytes = getBytes(transaction);
			(bytes).should.be.ok;
			(bytes).should.be.type('object');
			(bytes.length).should.be.equal(117);
		});

		it('should return Buffer of transaction with second signature and buffer most be 181 length', function () {
			var transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				signSignature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422'
			};

			bytes = getBytes(transaction);
			(bytes).should.be.ok;
			(bytes).should.be.type('object');
			(bytes.length).should.be.equal(181);
		});
	});

	describe('#getHash', function () {

		var getHash = crypto.getHash;

		it('should be ok', function () {
			(getHash).should.be.ok;
		});

		it('should be a function', function () {
			(getHash).should.be.type('function');
		});

		it('should return Buffer and Buffer most be 32 bytes length', function () {
			var transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422'
			};

			var result = getHash(transaction);
			(result).should.be.ok;
			(result).should.be.type('object');
			(result.length).should.be.equal(32);
		});
	});

	describe('#getId', function () {

		var getId = crypto.getId;

		it('should be ok', function () {
			(getId).should.be.ok;
		});

		it('should be a function', function () {
			(getId).should.be.type('function');
		});

		it('should return string id and be equal to 13987348420913138422', function () {
			var transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a'
			};

			var id = getId(transaction);
			(id).should.be.type('string').and.equal('13987348420913138422');
		});
	});

	describe('#getFee', function () {

		var getFee = crypto.getFee;

		it('should be ok', function () {
			(getFee).should.be.ok;
		});

		it('should be a function', function () {
			(getFee).should.be.type('function');
		});

		it('should return number', function () {
			var fee = getFee({amount: 100000, type: 0});
			(fee).should.be.type('number');
			(fee).should.be.not.NaN;
		});

		it('should return 10000000', function () {
			var fee = getFee({amount: 100000, type: 0});
			(fee).should.be.type('number').and.equal(10000000);
		});

		it('should return 500000000', function () {
			var fee = getFee({type: 1});
			(fee).should.be.type('number').and.equal(500000000);
		});

		it('should be equal 2500000000', function () {
			var fee = getFee({type: 2});
			(fee).should.be.type('number').and.equal(2500000000);
		});

		it('should be equal 100000000', function () {
			var fee = getFee({type: 3});
			(fee).should.be.type('number').and.equal(100000000);
		});
	});

	describe('fixedPoint', function () {

		var fixedPoint = crypto.fixedPoint;

		it('should be ok', function () {
			(fixedPoint).should.be.ok;
		});

		it('should be number', function () {
			(fixedPoint).should.be.type('number').and.not.NaN;
		});

		it('should be equal 100000000', function () {
			(fixedPoint).should.be.equal(100000000);
		});
	});

	describe('#sign', function () {

		var sign = crypto.sign;

		it('should be ok', function () {
			(sign).should.be.ok;
		});

		it('should be a function', function () {
			(sign).should.be.type('function');
		});
	});

	describe('#secondSign', function () {

		var secondSign = crypto.secondSign;

		it('should be ok', function () {
			(secondSign).should.be.ok;
		});

		it('should be a function', function () {
			(secondSign).should.be.type('function');
		});
	});

	describe('#getKeys', function () {

		var getKeys = crypto.getKeys;

		it('should be ok', function () {
			(getKeys).should.be.ok;
		});

		it('should be a function', function () {
			(getKeys).should.be.type('function');
		});

		it('should return two keys in hex', function () {
			var keys = getKeys('secret');

			(keys).should.be.ok;
			(keys).should.be.type('object');
			(keys).should.have.property('publicKey');
			(keys).should.have.property('privateKey');
			(keys.publicKey).should.be.type('string').and.match(function () {
				try {
					new Buffer(keys.publicKey, 'hex');
				} catch (e) {
					return false;
				}

				return true;
			});
			(keys.privateKey).should.be.type('string').and.match(function () {
				try {
					new Buffer(keys.privateKey, 'hex');
				} catch (e) {
					return false;
				}

				return true;
			});
		});
	});

	describe('#getAddress', function () {

		var getAddress = crypto.getAddress;

		it('should be ok', function () {
			(getAddress).should.be.ok;
		});

		it('should be a function', function () {
			(getAddress).should.be.type('function');
		});

		it('should generate address by publicKey', function () {
			var keys = crypto.getKeys('secret');
			var address = getAddress(keys.publicKey);

			(address).should.be.ok;
			(address).should.be.type('string');
			(address).should.be.equal('18160565574430594874L');
		});
	});

	describe('#verify', function () {

		var verify = crypto.verify;

		it('should be ok', function () {
			(verify).should.be.ok;
		});

		it('should be function', function () {
			(verify).should.be.type('function');
		});
	});

	describe('#verifySecondSignature', function () {

		var verifySecondSignature = crypto.verifySecondSignature;

		it('should be ok', function () {
			(verifySecondSignature).should.be.ok;
		});

		it('should be function', function () {
			(verifySecondSignature).should.be.type('function');
		});
	});
});
