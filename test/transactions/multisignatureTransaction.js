import createTransaction from '../../src/transactions/multisignatureTransaction';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

afterEach(() => sandbox.restore());

describe('#createTransaction', () => {
	const secret = 'secret';
	const secondSecret = 'second secret';
	const keys = {
		publicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		privateKey: '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
	};
	const secondKeys = {
		publicKey: '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
		privateKey: '9ef4146f8166d32dc8051d3d9f3a0c4933e24aa8ccb439b5d9ad00078a89e2fc0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
	};
	const recipientId = '123456789L';
	const amount = 50e8;
	const sendFee = 0.1e8;
	const requesterPublicKey = 'abc123';
	const timeWithOffset = 38350076;

	let transactionTransaction;
	let getTimeWithOffsetStub;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
	});

	describe('without second secret', () => {
		beforeEach(() => {
			transactionTransaction = createTransaction(
				recipientId, amount, secret, null, requesterPublicKey,
			);
		});

		it('should create a multisignature transaction', () => {
			(transactionTransaction).should.be.ok();
		});

		it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
			(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
		});

		it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			createTransaction(
				recipientId, amount, secret, null, requesterPublicKey, offset,
			);

			(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
		});

		describe('returned multisignature transaction', () => {
			it('should be an object', () => {
				(transactionTransaction).should.be.type('object');
			});

			it('should have id string', () => {
				(transactionTransaction).should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 0', () => {
				(transactionTransaction).should.have.property('type').and.be.type('number').and.equal(0);
			});

			it('should have amount number equal to 500 LSK', () => {
				(transactionTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
			});

			it('should have fee number equal to 0.1 LSK', () => {
				(transactionTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
			});

			it('should have recipientId string equal to 123456789L', () => {
				(transactionTransaction).should.have.property('recipientId').and.be.equal(recipientId);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(transactionTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(keys.publicKey);
			});

			it('should have requesterPublicKey hex string equal to provided requester public key', () => {
				(transactionTransaction.requesterPublicKey).should.be.equal(requesterPublicKey);
			});

			it('should have requesterPublicKey hex string equal to sender public key if requester public key is not provided', () => {
				transactionTransaction = createTransaction(recipientId, amount, secret);
				(transactionTransaction.requesterPublicKey).should.be.equal(keys.publicKey);
			});

			it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
				(transactionTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				(transactionTransaction).should.have.property('signature').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(transactionTransaction);
				(result).should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				transactionTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(transactionTransaction);
				(result).should.be.not.ok();
			});

			it('should have empty asset object', () => {
				(transactionTransaction).should.have.property('asset').and.be.type('object').and.be.empty();
			});

			it('should not have a second signature', () => {
				(transactionTransaction).should.not.have.property('signSignature');
			});

			it('should have an empty signatures array', () => {
				(transactionTransaction).should.have.property('signatures').and.be.an.Array().and.be.empty();
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			transactionTransaction = createTransaction(
				recipientId, amount, secret, secondSecret, requesterPublicKey,
			);
		});

		it('should create a multisignature transaction with a second secret', () => {
			const transactionTransactionWithoutSecondSecret = createTransaction(
				recipientId, amount, secret, null, requesterPublicKey,
			);
			(transactionTransaction).should.be.ok();
			(transactionTransaction)
				.should.not.be.equal(transactionTransactionWithoutSecondSecret);
		});

		describe('returned multisignature transaction', () => {
			it('should have second signature hex string', () => {
				(transactionTransaction).should.have.property('signSignature').and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule
					.verifyTransaction(transactionTransaction, secondKeys.publicKey);
				(result).should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				transactionTransaction.amount = 100;
				const result = cryptoModule
					.verifyTransaction(transactionTransaction, secondKeys.publicKey);
				(result).should.not.be.ok();
			});
		});
	});
});
