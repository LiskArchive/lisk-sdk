import slots from '../../src/time/slots';
import transaction from '../../src/transactions/transaction';
import cryptoModule from '../../src/transactions/crypto';

describe('transaction.js', () => {
	it('should be object', () => {
		(transaction).should.be.type('object');
	});

	it('should have properties', () => {
		(transaction).should.have.property('createTransaction');
	});

	describe('#createTransaction', () => {
		const createTransaction = transaction.createTransaction;
		let trs = null;

		it('should be a function', () => {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction without second signature', () => {
			trs = createTransaction('58191285901858109L', 1000, 'secret');
			(trs).should.be.ok();
		});

		describe('timestamp', () => {
			const now = new Date();
			let clock;

			beforeEach(() => {
				clock = sinon.useFakeTimers(now, 'Date');
			});

			afterEach(() => {
				clock.restore();
			});

			it('should use time slots to get the time for the timestamp', () => {
				trs = createTransaction('58191285901858109L', 1000, 'secret');

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime());
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;

				trs = createTransaction('58191285901858109L', 1000, 'secret', null, null, offset);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
			});
		});

		describe('returned transaction', () => {
			it('should be object', () => {
				(trs).should.be.type('object');
			});

			it('should have id as string', () => {
				(trs).should.have.property('id').and.be.type('string');
			});

			it('should have type as number and equal 0', () => {
				(trs).should.have.property('type').and.be.type('number').and.equal(0);
			});

			it('should have timestamp as number', () => {
				(trs).should.have.property('timestamp').and.be.type('number').and.not.NaN();
			});

			it('should have senderPublicKey as hex string', () => {
				(trs).should.have.property('senderPublicKey').and.be.type('string').and.be.hexString();
			});

			it('should have recipientId as string and to be equal 58191285901858109L', () => {
				(trs).should.have.property('recipientId').and.be.type('string').and.equal('58191285901858109L');
			});

			it('should have amount as number and equal to 1000', () => {
				(trs).should.have.property('amount').and.be.type('number').and.equal(1000);
			});

			it('should have empty asset object', () => {
				(trs).should.have.property('asset').and.be.type('object').and.empty();
			});

			it('should does not have second signature', () => {
				(trs).should.not.have.property('signSignature');
			});

			it('should have signature as hex string', () => {
				(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verify(trs);
				(result).should.be.ok();
			});

			it('should not be signed correctly now', () => {
				trs.amount = 10000;
				const result = cryptoModule.verify(trs);
				(result).should.be.not.ok();
			});
		});
	});

	describe('#createTransaction with second secret', () => {
		const createTransaction = transaction.createTransaction;
		let trs = null;
		const secondSecret = 'second secret';
		const keys = {
			publicKey: '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
			privateKey: '9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
		};

		it('should be a function', () => {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction without second signature', () => {
			trs = createTransaction('58191285901858109L', 1000, 'secret', secondSecret);
			(trs).should.be.ok();
		});

		describe('returned transaction', () => {
			it('should be object', () => {
				(trs).should.be.type('object');
			});

			it('should have id as string', () => {
				(trs).should.have.property('id').and.be.type('string');
			});

			it('should have type as number and equal 0', () => {
				(trs).should.have.property('type').and.be.type('number').and.equal(0);
			});

			it('should have timestamp as number', () => {
				(trs).should.have.property('timestamp').and.be.type('number').and.not.NaN();
			});

			it('should have senderPublicKey as hex string', () => {
				(trs).should.have.property('senderPublicKey').and.be.type('string').and.be.hexString();
			});

			it('should have recipientId as string and to be equal 58191285901858109L', () => {
				(trs).should.have.property('recipientId').and.be.type('string').and.equal('58191285901858109L');
			});

			it('should have amount as number and equal to 1000', () => {
				(trs).should.have.property('amount').and.be.type('number').and.equal(1000);
			});

			it('should have empty asset object', () => {
				(trs).should.have.property('asset').and.be.type('object').and.empty();
			});

			it('should have second signature', () => {
				(trs).should.have.property('signSignature');
			});

			it('should have signature as hex string', () => {
				(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
			});

			it('should have signSignature as hex string', () => {
				(trs).should.have.property('signSignature').and.be.type('string').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verify(trs);
				(result).should.be.ok();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifySecondSignature(trs, keys.publicKey);
				(result).should.be.ok();
			});

			it('should not be signed correctly now', () => {
				trs.amount = 10000;
				const result = cryptoModule.verify(trs);
				(result).should.be.not.ok();
			});

			it('should not be second signed correctly now', () => {
				trs.amount = 10000;
				const result = cryptoModule.verifySecondSignature(trs, keys.publicKey);
				(result).should.be.not.ok();
			});
		});
	});

	describe('#createTransaction with data', () => {
		const createTransaction = transaction.createTransaction;
		let trs = null;

		it('should create transaction with data', () => {
			trs = createTransaction('58191285901858109L', 1000, 'secret', '', 'data');
			(trs).should.be.ok();
			(trs.fee).should.be.equal(20000000);
		});

		it('should create transaction with invalid data', () => {
			(function () {
				trs = createTransaction('58191285901858109L', 1000, 'secret', '', '\xFF\xFE\x00\x00utf32le string');
			}).should.throw('invalid encoding UTF-32LE in transaction data');
		});
	});

	describe('#createTransaction with secondSignature and data', () => {
		const createTransaction = transaction.createTransaction;
		let trs = null;
		const secondSecret = 'second secret';

		it('should be a function', () => {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction with second signature and data', () => {
			trs = createTransaction('58191285901858109L', 1000, 'secret', secondSecret, 'data');
			(trs).should.be.ok();
		});

		describe('returned transaction', () => {
			it('should contain data field with string value', () => {
				(trs.asset.data).should.be.type('string');
				(trs.fee).should.be.equal(20000000);
			});
		});
	});

	describe('#createTransaction with secondSignature and data', () => {
		const createTransaction = transaction.createTransaction;
		let trs = null;
		const secondSecret = 'second secret';

		it('should be a function', () => {
			(createTransaction).should.be.type('function');
		});

		it('should create transaction with second signature and data', () => {
			trs = createTransaction('58191285901858109L', 1000, 'secret', secondSecret, 'data');
			(trs).should.be.ok();
		});

		describe('returned transaction', () => {
			it('should conatain data field with string value', () => {
				(trs.asset.data).should.be.type('string');
				(trs.fee).should.be.equal(20000000);
			});
		});
	});
});
