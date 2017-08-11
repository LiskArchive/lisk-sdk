import slots from '../../src/time/slots';
import delegate from '../../src/transactions/delegate';
import cryptoModule from '../../src/transactions/crypto';

describe('delegate.js', () => {
	it('should be ok', () => {
		(delegate).should.be.ok();
	});

	it('should be function', () => {
		(delegate).should.be.type('object');
	});

	it('should have property createDelegate', () => {
		(delegate).should.have.property('createDelegate');
	});

	describe('#createDelegate', () => {
		const createDelegate = delegate.createDelegate;
		let trs = null;

		it('should be ok', () => {
			(createDelegate).should.be.ok();
		});

		it('should be function', () => {
			(createDelegate).should.be.type('function');
		});

		it('should create delegate', () => {
			trs = createDelegate('secret', 'delegate', 'secret 2');
		});

		describe('timestamp', () => {
			const timeWithOffset = 38350086;
			let stub;

			beforeEach(() => {
				stub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
			});

			afterEach(() => {
				stub.restore();
			});

			it('should use time slots to get the time for the timestamp', () => {
				trs = createDelegate('secret', 'delegate', null);
				(trs).should.have.property('timestamp').and.be.equal(timeWithOffset);
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;

				trs = createDelegate('secret', 'delegate', null, offset);

				(trs).should.have.property('timestamp').and.be.equal(timeWithOffset);
			});
		});

		describe('returned delegate', () => {
			const keys = {
				publicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				privateKey: '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			};
			const secondKeys = {
				publicKey: '653d60e438792fe89b8d6831e0627277025f48015b972cf6bcf10e6e75b7857f',
				privateKey: 'ded6c02a4bc1fb712f3b71efcb883ad5b31f4cef6a327b079573143ec9c71fb3653d60e438792fe89b8d6831e0627277025f48015b972cf6bcf10e6e75b7857f',
			};

			beforeEach(() => {
				trs = createDelegate('secret', 'delegate', 'secret 2');
			});

			it('should be ok', () => {
				(trs).should.be.ok();
			});

			it('should be object', () => {
				(trs).should.be.type('object');
			});

			it('should have recipientId equal null', () => {
				(trs).should.have.property('recipientId').and.be.null();
			});

			it('shoud have amount equal 0', () => {
				(trs).should.have.property('amount').and.type('number').and.equal(0);
			});

			it('should have type equal 0', () => {
				(trs).should.have.property('type').and.type('number').and.equal(2);
			});

			it('should have timestamp number', () => {
				(trs).should.have.property('timestamp').and.type('number');
			});

			it('should have senderPublicKey in hex', () => {
				(trs).should.have.property('senderPublicKey').and.type('string').and.equal(keys.publicKey).and.be.hexString();
			});

			it('should have signature in hex', () => {
				(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
			});

			it('should have second signature in hex', () => {
				(trs).should.have.property('signSignature').and.type('string').and.be.hexString();
			});

			it('should have delegate asset', () => {
				(trs).should.have.property('asset').and.type('object');
				(trs.asset).should.have.have.property('delegate');
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verify(trs, keys.publicKey);
				(result).should.be.ok();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifySecondSignature(trs, secondKeys.publicKey);
				(result).should.be.ok();
			});

			it('should not be signed correctly now', () => {
				trs.amount = 100;
				const result = cryptoModule.verify(trs, keys.publicKey);
				(result).should.be.not.ok();
			});

			it('should not be second signed correctly now', () => {
				trs.amount = 100;
				const result = cryptoModule.verify(trs, secondKeys.publicKey);
				(result).should.be.not.ok();
			});

			describe('delegate asset', () => {
				it('should be ok', () => {
					(trs.asset.delegate).should.be.ok();
				});

				it('should be object', () => {
					(trs.asset.delegate).should.be.type('object');
				});

				it('should be have property username', () => {
					(trs.asset.delegate).should.have.property('username').and.be.type('string').and.equal('delegate');
				});
			});
		});
	});
});
