
if (typeof module !== 'undefined' && module.exports) {
	var slots = require('../../lib/time/slots');
	var common = require('../common');
	var lisk = common.lisk;
}

describe('delegate.js', function () {

	var delegate = lisk.delegate;

	it('should be ok', function () {
		(delegate).should.be.ok;
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
			(createDelegate).should.be.ok;
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

			var keys = lisk.crypto.getKeys('secret');
			var secondKeys = lisk.crypto.getKeys('secret 2');

			beforeEach(function () {
				trs = createDelegate('secret', 'delegate', 'secret 2');
			});

			it('should be ok', function () {
				(trs).should.be.ok;
			});

			it('should be object', function () {
				(trs).should.be.type('object');
			});

			it('should have recipientId equal null', function () {
				(trs).should.have.property('recipientId').and.type('object').and.be.empty;
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
				(trs).should.have.property('senderPublicKey').and.type('string').and.match(function () {
					try {
						new Buffer(trs.senderPublicKey, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				}).and.equal(keys.publicKey);
			});

			it('should have signature in hex', function () {
				(trs).should.have.property('signature').and.type('string').and.match(function () {
					try {
						new Buffer(trs.signature, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				});
			});

			it('should have second signature in hex', function () {
				(trs).should.have.property('signSignature').and.type('string').and.match(function () {
					try {
						new Buffer(trs.signSignature, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				});
			});

			it('should have delegate asset', function () {
				(trs).should.have.property('asset').and.type('object');
				(trs.asset).should.have.have.property('delegate');
			});

			it('should be signed correctly', function () {
				var result = lisk.crypto.verify(trs, keys.publicKey);
				(result).should.be.ok;
			});

			it('should be second signed correctly', function () {
				var result = lisk.crypto.verifySecondSignature(trs, secondKeys.publicKey);
				(result).should.be.ok;
			});

			it('should not be signed correctly now', function () {
				trs.amount = 100;
				var result = lisk.crypto.verify(trs, keys.publicKey);
				(result).should.be.not.ok;
			});

			it('should not be second signed correctly now', function () {
				trs.amount = 100;
				var result = lisk.crypto.verify(trs, secondKeys.publicKey);
				(result).should.be.not.ok;
			});

			describe('delegate asset', function () {

				it('should be ok', function () {
					(trs.asset.delegate).should.be.ok;
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
