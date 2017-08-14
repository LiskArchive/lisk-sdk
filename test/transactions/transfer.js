import transfer from '../../src/transactions/transfer';
import cryptoModule from '../../src/transactions/crypto';
import slots from '../../src/time/slots';

describe('transfer module', () => {
	describe('exports', () => {
		it('should be an object', () => {
			(transfer).should.be.type('object');
		});

		it('should export createInTransfer function', () => {
			(transfer).should.have.property('createInTransfer').be.type('function');
		});

		it('should export createOutTransfer function', () => {
			(transfer).should.have.property('createOutTransfer').be.type('function');
		});
	});

	describe('#createInTransfer', () => {
		const { createInTransfer } = transfer;
		const dappId = '1234213';
		const amount = 10e8;
		const sendFee = 0.1e8;
		const secret = 'secret';
		const secondSecret = 'secondSecret';
		const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		const secondPublicKey = '8b509500d5950122b3e446189b4312805515c8e7814a409e09ac5c21935564af';
		const timeWithOffset = 38350076;

		let inTransferTransaction;
		let getTimeWithOffsetStub;

		beforeEach(() => {
			getTimeWithOffsetStub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
		});

		afterEach(() => {
			getTimeWithOffsetStub.restore();
		});

		describe('without second secret', () => {
			beforeEach(() => {
				inTransferTransaction = createInTransfer(dappId, amount, secret);
			});

			it('should create an in transfer dapp transaction', () => {
				(inTransferTransaction).should.be.ok();
			});

			it('should use time slots to get the time for the timestamp', () => {
				(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;
				createInTransfer(dappId, amount, secret, null, offset);

				(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
			});

			describe('returned transfer transaction object', () => {
				it('should be an object', () => {
					(inTransferTransaction).should.be.type('object');
				});

				it('should have type number equal to 6', () => {
					(inTransferTransaction).should.have.property('type').and.be.type('number').and.equal(6);
				});

				it('should have amount number equal to 10 LSK', () => {
					(inTransferTransaction).should.have.property('amount').and.be.type('number').and.equal(amount);
				});

				it('should have fee number equal to 0.1 LSK', () => {
					(inTransferTransaction).should.have.property('fee').and.be.type('number').and.equal(sendFee);
				});

				it('should have recipientId equal to null', () => {
					(inTransferTransaction).should.have.property('recipientId').be.null();
				});

				it('should have senderPublicKey hex string equal to sender public key', () => {
					(inTransferTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
				});

				it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
					(inTransferTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
				});

				it('should have signature hex string', () => {
					(inTransferTransaction).should.have.property('signature').and.be.hexString();
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verify(inTransferTransaction);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					inTransferTransaction.amount = 100;
					const result = cryptoModule.verify(inTransferTransaction);
					(result).should.be.not.ok();
				});

				it('should have an asset with the in transfer dapp id', () => {
					(inTransferTransaction).should.have.property('asset')
						.with.property('inTransfer')
						.with.property('dappId')
						.equal(dappId);
				});
			});
		});

		describe('with second secret', () => {
			beforeEach(() => {
				inTransferTransaction = createInTransfer(dappId, amount, secret, secondSecret);
			});

			it('should create an in transfer dapp transaction with a second secret', () => {
				const inTransferTransactionWithoutSecondSecret = createInTransfer(dappId, amount, secret);
				(inTransferTransaction).should.be.ok();
				(inTransferTransaction).should.not.be.equal(inTransferTransactionWithoutSecondSecret);
			});

			describe('returned in transfer transaction', () => {
				it('should have second signature hex string', () => {
					(inTransferTransaction).should.have.property('signSignature').and.be.hexString();
				});

				it('should be second signed correctly', () => {
					const result = cryptoModule.verifySecondSignature(inTransferTransaction, secondPublicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', () => {
					inTransferTransaction.amount = 100;
					const result = cryptoModule.verifySecondSignature(inTransferTransaction, secondPublicKey);
					(result).should.not.be.ok();
				});
			});
		});
	});

	describe('#createOutTransfer', () => {
		const createOutTransfer = transfer.createOutTransfer;
		const dappId = '1234213';
		const transactionId = '9876567';
		const recipientId = '989234L';
		const amount = 10e8;
		const secret = 'secret';
		const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		const secondSecret = 'secondSecret';
		const outTransferTransaction = createOutTransfer(
			dappId, transactionId, recipientId, amount, secret, secondSecret,
		);

		it('should be a function', () => {
			(createOutTransfer).should.be.type('function');
		});

		it('should create an out transfer dapp transaction', () => {
			(outTransferTransaction).should.be.type('object');
		});

		it('should create an out transfer dapp transaction type 7', () => {
			(outTransferTransaction).should.have.property('type').equal(7);
		});

		it('should create an out transfer dapp transaction with dapp id in asset', () => {
			(outTransferTransaction)
				.should.have.property('asset')
				.with.property('outTransfer')
				.with.property('dappId')
				.equal(dappId);
		});

		it('should create an out transfer dapp transaction with transaction id in asset', () => {
			(outTransferTransaction)
				.should.have.property('asset')
				.with.property('outTransfer')
				.with.property('transactionId')
				.equal(transactionId);
		});

		it('should create an out transfer dapp transaction with a provided amount', () => {
			(outTransferTransaction).should.have.property('amount').equal(amount);
		});

		it('should create an out transfer dapp transaction with a default fee', () => {
			(outTransferTransaction).should.have.property('fee').equal(0.1e8);
		});

		it('should create an out transfer dapp transaction with a provided recipient', () => {
			(outTransferTransaction).should.have.property('recipientId').equal(recipientId);
		});

		it('should create an out transfer dapp transaction with senderPublicKey', () => {
			(outTransferTransaction).should.have.property('senderPublicKey').equal(publicKey);
		});

		it('should create an out transfer dapp transaction with first signature', () => {
			(outTransferTransaction).should.have.property('signature').be.ok();
		});

		it('should create an out transfer dapp transaction with second signature', () => {
			(outTransferTransaction).should.have.property('signSignature').be.ok();
		});

		it('should create an out transfer dapp transaction with just one signature', () => {
			const outTransferTransactionOneSignature = createOutTransfer(
				dappId, transactionId, recipientId, amount, secret,
			);
			(outTransferTransactionOneSignature).should.have.property('signature').be.ok();
			(outTransferTransactionOneSignature).should.not.have.property('secondSignature');
		});

		describe('timestamp', () => {
			const timeWithOffset = 38350076;
			let stub;

			beforeEach(() => {
				stub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
			});

			afterEach(() => {
				stub.restore();
			});

			it('should use time slots to get the time for the timestamp', () => {
				const trs = createOutTransfer(dappId, transactionId, recipientId, amount, secret);

				(trs).should.have.property('timestamp').and.be.equal(timeWithOffset);
				(stub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;
				const trs = createOutTransfer(
					dappId, transactionId, recipientId, amount, secret, null, offset,
				);

				(trs).should.have.property('timestamp').and.be.equal(timeWithOffset);
				(stub.calledWithExactly(offset)).should.be.true();
			});
		});
	});
});
