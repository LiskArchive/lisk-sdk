import slots from '../../src/time/slots';
import transaction from '../../src/transactions/transaction';
import cryptoModule from '../../src/transactions/crypto';

describe('transaction.js', function () {

	it('should be object', function () {
		(transaction).should.be.type('object');
	});

	it('should have properties', function () {
		(transaction).should.have.property('createTransaction');
	});

	describe('#createTransaction', function () {

		var createTransaction = transaction.createTransaction;
		var trs = null;

		it('should be a function', function () {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction without second signature', function () {
			trs = createTransaction('58191285901858109L', 1000, 'secret');
			(trs).should.be.ok();
		});

		describe('timestamp', function () {
			var now;
			var clock;

			beforeEach(function () {
				now = new Date();
				clock = sinon.useFakeTimers(now, 'Date');
			});

			afterEach(function () {
				clock.restore();
			});

			it('should use time slots to get the time for the timestamp', function () {
				trs = createTransaction('58191285901858109L', 1000, 'secret');

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime());
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', function () {
				var offset = -10;

				trs = createTransaction('58191285901858109L', 1000, 'secret', null, null, offset);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
			});

		});

		describe('returned transaction', function () {

			it('should be object', function () {
				(trs).should.be.type('object');
			});

			it('should have id as string', function () {
				(trs).should.have.property('id').and.be.type('string');
			});

			it('should have type as number and equal 0', function () {
				(trs).should.have.property('type').and.be.type('number').and.equal(0);
			});

			it('should have timestamp as number', function () {
				(trs).should.have.property('timestamp').and.be.type('number').and.not.NaN();
			});

			it('should have senderPublicKey as hex string', function () {
				(trs).should.have.property('senderPublicKey').and.be.type('string').and.be.hexString();
			});

			it('should have recipientId as string and to be equal 58191285901858109L', function () {
				(trs).should.have.property('recipientId').and.be.type('string').and.equal('58191285901858109L');
			});

			it('should have amount as number and equal to 1000', function () {
				(trs).should.have.property('amount').and.be.type('number').and.equal(1000);
			});

			it('should have empty asset object', function () {
				(trs).should.have.property('asset').and.be.type('object').and.empty();
			});

			it('should does not have second signature', function () {
				(trs).should.not.have.property('signSignature');
			});

			it('should have signature as hex string', function () {
				(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
			});

			it('should be signed correctly', function () {
				var result = cryptoModule.verify(trs);
				(result).should.be.ok();
			});

			it('should not be signed correctly now', function () {
				trs.amount = 10000;
				var result = cryptoModule.verify(trs);
				(result).should.be.not.ok();
			});

		});

	});

	describe('#createTransaction with second secret', function () {

		var createTransaction = transaction.createTransaction;
		var trs = null;
		var secondSecret = 'second secret';
		var keys = {
			publicKey: '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
			privateKey: '9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f'
		};

		it('should be a function', function () {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction without second signature', function () {
			trs = createTransaction('58191285901858109L', 1000, 'secret', secondSecret);
			(trs).should.be.ok();
		});

		describe('returned transaction', function () {

			it('should be object', function () {
				(trs).should.be.type('object');
			});

			it('should have id as string', function () {
				(trs).should.have.property('id').and.be.type('string');
			});

			it('should have type as number and equal 0', function () {
				(trs).should.have.property('type').and.be.type('number').and.equal(0);
			});

			it('should have timestamp as number', function () {
				(trs).should.have.property('timestamp').and.be.type('number').and.not.NaN();
			});

			it('should have senderPublicKey as hex string', function () {
				(trs).should.have.property('senderPublicKey').and.be.type('string').and.be.hexString();
			});

			it('should have recipientId as string and to be equal 58191285901858109L', function () {
				(trs).should.have.property('recipientId').and.be.type('string').and.equal('58191285901858109L');
			});

			it('should have amount as number and equal to 1000', function () {
				(trs).should.have.property('amount').and.be.type('number').and.equal(1000);
			});

			it('should have empty asset object', function () {
				(trs).should.have.property('asset').and.be.type('object').and.empty();
			});

			it('should have second signature', function () {
				(trs).should.have.property('signSignature');
			});

			it('should have signature as hex string', function () {
				(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
			});

			it('should have signSignature as hex string', function () {
				(trs).should.have.property('signSignature').and.be.type('string').and.be.hexString();
			});

			it('should be signed correctly', function () {
				var result = cryptoModule.verify(trs);
				(result).should.be.ok();
			});

			it('should be second signed correctly', function () {
				var result = cryptoModule.verifySecondSignature(trs, keys.publicKey);
				(result).should.be.ok();
			});

			it('should not be signed correctly now', function () {
				trs.amount = 10000;
				var result = cryptoModule.verify(trs);
				(result).should.be.not.ok();
			});

			it('should not be second signed correctly now', function () {
				trs.amount = 10000;
				var result = cryptoModule.verifySecondSignature(trs, keys.publicKey);
				(result).should.be.not.ok();
			});

		});

	});

	describe('#createTransaction with secondSignature and data', function () {
		var createTransaction = transaction.createTransaction;
		var trs = null;
		var secondSecret = 'second secret';

		it('should be a function', function () {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction with second signature and data', function () {
			trs = createTransaction('58191285901858109L', 1000, 'secret', secondSecret, 'data');
			(trs).should.be.ok;
		});

		describe('returned transaction', function () {
			it('should contain data field with string value', function () {
				(trs.asset.data).should.be.type('string');
			});
		});

	});

	describe('#createTransaction with secondSignature and data', function () {
		var createTransaction = transaction.createTransaction;
		var trs = null;
		var secondSecret = 'second secret';

		it('should be a function', function () {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction with second signature and data', function () {
			trs = createTransaction('58191285901858109L', 1000, 'secret', secondSecret, 'data');
			(trs).should.be.ok;
		});

		describe('returned transaction', function () {
			it('should conatain data field with string value', function () {
				(trs.asset.data).should.be.type('string');
			});
		});

	});
});
