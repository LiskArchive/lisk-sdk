import sendFromMultisignatureAccount from '../../src/transactions/0_sendFromMultisignatureAccount';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

afterEach(() => sandbox.restore());

describe('#sendFromMultisignatureAccount transaction', () => {
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

	let sendFromMultisignatureAccountTransaction;
	let getTimeWithOffsetStub;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
	});

	describe('without second secret', () => {
		beforeEach(() => {
			sendFromMultisignatureAccountTransaction = sendFromMultisignatureAccount(
				recipientId,
				amount,
				secret,
				null,
				requesterPublicKey,
			);
		});

		it('should create a send from multisignature transaction', () => {
			(sendFromMultisignatureAccountTransaction).should.be.ok();
		});

		it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
			(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
		});

		it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			sendFromMultisignatureAccount(recipientId, amount, secret, null, requesterPublicKey, offset);

			(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
		});

		describe('returned multisignature send transaction', () => {
			it('should be an object', () => {
				(sendFromMultisignatureAccountTransaction).should.be.type('object');
			});

			it('should have id string', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 0', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('type').and.be.type('number').and.equal(0);
			});

			it('should have amount number equal to 500 LSK', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
			});

			it('should have fee number equal to 0.1 LSK', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
			});

			it('should have recipientId string equal to 123456789L', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('recipientId').and.be.equal(recipientId);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(keys.publicKey);
			});

			it('should have requesterPublicKey equal to provided requester public key', () => {
				(sendFromMultisignatureAccountTransaction.requesterPublicKey).should.be.equal(
					requesterPublicKey,
				);
			});

			it('should have requesterPublicKey equal to senderPublicKey', () => {
				sendFromMultisignatureAccountTransaction = sendFromMultisignatureAccount(
					recipientId,
					amount,
					secret,
				);
				(sendFromMultisignatureAccountTransaction.requesterPublicKey).should.be.equal(
					keys.publicKey,
				);
			});

			it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('signature').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(sendFromMultisignatureAccountTransaction);
				(result).should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				sendFromMultisignatureAccountTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(sendFromMultisignatureAccountTransaction);
				(result).should.be.not.ok();
			});

			it('should have empty asset object', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('asset').and.be.type('object').and.be.empty();
			});

			it('should not have a second signature', () => {
				(sendFromMultisignatureAccountTransaction).should.not.have.property('signSignature');
			});

			it('should have an empty signatures array', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('signatures').and.be.an.Array().and.be.empty();
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			sendFromMultisignatureAccountTransaction = sendFromMultisignatureAccount(
				recipientId,
				amount,
				secret,
				secondSecret,
				requesterPublicKey,
			);
		});

		it('should create a multisignature transaction with a second secret', () => {
			/* eslint-disable max-len */
			const sendFromMultisignatureAccountTransactionWithoutSecondSecret = sendFromMultisignatureAccount(
				recipientId,
				amount,
				secret,
				null,
				requesterPublicKey,
			);
			(sendFromMultisignatureAccountTransaction).should.be.ok();
			(sendFromMultisignatureAccountTransaction).should.not.be.equal(
				sendFromMultisignatureAccountTransactionWithoutSecondSecret,
			);
		});

		describe('returned multisignature transaction', () => {
			it('should have second signature hex string', () => {
				(sendFromMultisignatureAccountTransaction).should.have.property('signSignature').and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifyTransaction(
					sendFromMultisignatureAccountTransaction,
					secondKeys.publicKey,
				);
				(result).should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				sendFromMultisignatureAccountTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(
					sendFromMultisignatureAccountTransaction,
					secondKeys.publicKey,
				);
				(result).should.not.be.ok();
			});
		});
	});
});
