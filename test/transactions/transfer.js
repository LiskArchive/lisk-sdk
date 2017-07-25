import slots from '../../src/time/slots';
import transfer from '../../src/transactions/transfer';

describe('transfer.js', () => {
	it('should be ok', () => {
		(transfer).should.be.ok();
	});

	it('should be object', () => {
		(transfer).should.be.type('object');
	});

	it('should have properties', () => {
		(transfer).should.have.property('createInTransfer');
	});

	describe('#createInTransfer', () => {
		const createInTransfer = transfer.createInTransfer;
		const dappId = '1234213';
		const amount = 10e8;
		const secret = 'secret';
		const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		const secondSecret = 'secondSecret';
		const inTransferTransaction = createInTransfer(dappId, amount, secret, secondSecret);

		it('should be a function', () => {
			(createInTransfer).should.be.type('function');
		});

		it('should create an in transfer dapp transaction', () => {
			(inTransferTransaction).should.be.type('object');
		});

		it('should create an in transfer dapp transaction type 6', () => {
			(inTransferTransaction).should.have.property('type').be.equal(6);
		});

		it('should create an in transfer dapp transaction with dapp id in asset', () => {
			(inTransferTransaction)
				.should.have.property('asset')
				.with.property('inTransfer')
				.with.property('dappId')
				.equal(dappId);
		});

		it('should create an in transfer dapp transaction with a provided amount', () => {
			(inTransferTransaction).should.have.property('amount').equal(amount);
		});

		it('should create an in transfer dapp transaction with a default fee', () => {
			(inTransferTransaction).should.have.property('fee').equal(0.1e8);
		});

		it('should create an in transfer dapp transaction with no recipient', () => {
			(inTransferTransaction).should.have.property('recipientId').be.null();
		});

		it('should create an in transfer dapp transaction with senderPublicKey', () => {
			(inTransferTransaction).should.have.property('senderPublicKey').equal(publicKey);
		});

		it('should create an in transfer dapp transaction with first signature', () => {
			(inTransferTransaction).should.have.property('signature').and.be.ok();
		});

		it('should create an in transfer dapp transaction with second signature', () => {
			(inTransferTransaction).should.have.property('signSignature').and.be.ok();
		});

		it('should create an in transfer dapp transaction with just one signature', () => {
			const inTransferTransactionOneSignature = createInTransfer(dappId, amount, secret);
			(inTransferTransactionOneSignature).should.have.property('signature').and.be.ok();
			(inTransferTransactionOneSignature).should.not.have.property('secondSignature');
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
				const trs = createInTransfer(dappId, amount, secret);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime());
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;
				const trs = createInTransfer(dappId, amount, secret, null, offset);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
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
		const outTransferTransaction = createOutTransfer(dappId, transactionId, recipientId, amount, secret, secondSecret);

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
			const outTransferTransactionOneSignature = createOutTransfer(dappId, transactionId, recipientId, amount, secret);
			(outTransferTransactionOneSignature).should.have.property('signature').be.ok();
			(outTransferTransactionOneSignature).should.not.have.property('secondSignature');
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
				const trs = createOutTransfer(dappId, transactionId, recipientId, amount, secret);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime());
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;
				const trs = createOutTransfer(dappId, transactionId, recipientId, amount, secret, null, offset);

				(trs).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
			});
		});
	});
});
