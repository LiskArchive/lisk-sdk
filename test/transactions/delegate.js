var slots = require('../../lib/time/slots');
var delegate = require('../../lib/transactions/delegate');
var cryptoModule = require('../../lib/transactions/crypto');

describe('delegate.js', function () {

	it('should be ok', function () {
		(delegate).should.be.ok();
	});

	it('should be function', function () {
		(delegate).should.be.type('object');
	});

	it('should have property createDelegate', function () {
		(delegate).should.have.property('createDelegate');
	});

	describe('#createDelegate', function () {

		var createDelegate = delegate.createDelegate;
		var trs = null;

		it('should be ok', function () {
			(createDelegate).should.be.ok();
		});

		it('should be function', function () {
			(createDelegate).should.be.type('function');
		});

		it('should create delegate', function () {
			trs = createDelegate('secret', 'delegate', 'secret 2');
		});

		it('should use time slots to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			trs = createDelegate('secret', 'delegate', null);
			(trs).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime())).should.be.true();

			stub.restore();
			clock.restore();
		});

		it('should use time slots with an offset to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var offset = 10e3;
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			trs = createDelegate('secret', 'delegate', null, offset);

			(trs).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime() - offset)).should.be.true();

			stub.restore();
			clock.restore();
		});

		describe('returned delegate', function () {
			var keys = {
				publicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				privateKey: '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09'
			};
			var secondKeys = {
				publicKey: '653d60e438792fe89b8d6831e0627277025f48015b972cf6bcf10e6e75b7857f',
				privateKey: 'ded6c02a4bc1fb712f3b71efcb883ad5b31f4cef6a327b079573143ec9c71fb3653d60e438792fe89b8d6831e0627277025f48015b972cf6bcf10e6e75b7857f'
			};

			beforeEach(function () {
				trs = createDelegate('secret', 'delegate', 'secret 2');
			});

			it('should be ok', function () {
				(trs).should.be.ok();
			});

			it('should be object', function () {
				(trs).should.be.type('object');
			});

			it('should have recipientId equal null', function () {
				(trs).should.have.property('recipientId').and.be.null();
			});

			it('shoud have amount equal 0', function () {
				(trs).should.have.property('amount').and.type('number').and.equal(0);
			});

			it('should have type equal 0', function () {
				(trs).should.have.property('type').and.type('number').and.equal(2);
			});

			it('should have timestamp number', function () {
				(trs).should.have.property('timestamp').and.type('number');
			});

			it('should have senderPublicKey in hex', function () {
				(trs).should.have.property('senderPublicKey').and.type('string').and.equal(keys.publicKey).and.be.hexString();
			});

			it('should have signature in hex', function () {
				(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
			});

			it('should have second signature in hex', function () {
				(trs).should.have.property('signSignature').and.type('string').and.be.hexString();
			});

			it('should have delegate asset', function () {
				(trs).should.have.property('asset').and.type('object');
				(trs.asset).should.have.have.property('delegate');
			});

			it('should be signed correctly', function () {
				var result = cryptoModule.verify(trs, keys.publicKey);
				(result).should.be.ok();
			});

			it('should be second signed correctly', function () {
				var result = cryptoModule.verifySecondSignature(trs, secondKeys.publicKey);
				(result).should.be.ok();
			});

			it('should not be signed correctly now', function () {
				trs.amount = 100;
				var result = cryptoModule.verify(trs, keys.publicKey);
				(result).should.be.not.ok();
			});

			it('should not be second signed correctly now', function () {
				trs.amount = 100;
				var result = cryptoModule.verify(trs, secondKeys.publicKey);
				(result).should.be.not.ok();
			});

			describe('delegate asset', function () {

				it('should be ok', function () {
					(trs.asset.delegate).should.be.ok();
				});

				it('should be object', function () {
					(trs.asset.delegate).should.be.type('object');
				});

				it('should be have property username', function () {
					(trs.asset.delegate).should.have.property('username').and.be.type('string').and.equal('delegate');
				});

			});

		});

	});

});
