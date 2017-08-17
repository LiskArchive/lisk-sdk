import delegate from '../../src/transactions/delegate';
import slots from '../../src/time/slots';
import cryptoModule from '../../src/transactions/crypto';

describe('delegate module', () => {
	describe('exports', () => {
		it('should be an object', () => {
			(delegate).should.be.type('object');
		});

		it('should export createDelegate function', () => {
			(delegate).should.have.property('createDelegate').be.type('function');
		});
	});

	describe('#createDelegate', () => {
		const { createDelegate } = delegate;
		const secret = 'secret';
		const secondSecret = 'second secret';
		const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		const secondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
		const username = 'test_delegate_1@\\';
		const fee = 25e8;
		const timeWithOffset = 38350076;

		let getTimeWithOffsetStub;
		let delegateTransaction;

		beforeEach(() => {
			getTimeWithOffsetStub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
		});

		afterEach(() => {
			getTimeWithOffsetStub.restore();
		});

		describe('without second secret', () => {
			beforeEach(() => {
				delegateTransaction = createDelegate(secret, username);
			});

			it('should create a delegate transaction', () => {
				(delegateTransaction).should.be.ok();
			});

			it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
				(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
				const offset = -10;
				createDelegate(secret, username, null, offset);

				(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
			});

			describe('returned delegate transaction', () => {
				it('should be an object', () => {
					(delegateTransaction).should.be.type('object');
				});

				it('should have type number equal to 2', () => {
					(delegateTransaction).should.have.property('type').and.be.type('number').and.equal(2);
				});

				it('should have amount number equal to 0', () => {
					(delegateTransaction).should.have.property('amount').and.be.type('number').and.equal(0);
				});

				it('should have fee number equal to 25 LSK', () => {
					(delegateTransaction).should.have.property('fee').and.be.type('number').and.equal(fee);
				});

				it('should have recipientId equal to null', () => {
					(delegateTransaction).should.have.property('recipientId').and.be.null();
				});

				it('should have senderPublicKey hex string equal to sender public key', () => {
					(delegateTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
				});

				it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
					(delegateTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
				});

				it('should have signature hex string', () => {
					(delegateTransaction).should.have.property('signature').and.be.hexString();
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verify(delegateTransaction);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					delegateTransaction.amount = 100;
					const result = cryptoModule.verify(delegateTransaction);
					(result).should.be.not.ok();
				});

				it('should have asset', () => {
					(delegateTransaction).should.have.property('asset').and.not.be.empty();
				});

				describe('delegate asset', () => {
					it('should be an object', () => {
						(delegateTransaction.asset).should.have.property('delegate').and.be.type('object');
					});

					it('should have the provided username as a string', () => {
						(delegateTransaction.asset.delegate).should.have.property('username').and.be.type('string').and.equal(username);
					});

					it('should have the sender’s public key as a hex string', () => {
						(delegateTransaction.asset.delegate).should.have.property('publicKey').and.be.hexString().and.equal(publicKey);
					});
				});
			});
		});

		describe('with second secret', () => {
			beforeEach(() => {
				delegateTransaction = createDelegate(secret, username, secondSecret);
			});

			it('should create a delegate transaction with a second secret', () => {
				const delegateTransactionWithoutSecondSecret = createDelegate(secret, username);
				(delegateTransaction).should.be.ok();
				(delegateTransaction).should.not.be.equal(delegateTransactionWithoutSecondSecret);
			});

			describe('returned delegate transaction', () => {
				it('should have second signature hex string', () => {
					(delegateTransaction).should.have.property('signSignature').and.be.hexString();
				});

				it('should be second signed correctly', () => {
					const result = cryptoModule.verifySecondSignature(delegateTransaction, secondPublicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', () => {
					delegateTransaction.amount = 100;
					const result = cryptoModule.verifySecondSignature(delegateTransaction, secondPublicKey);
					(result).should.not.be.ok();
				});
			});
		});
	});
});
