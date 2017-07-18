if (typeof module !== 'undefined' && module.exports) {
	var slots = require('../../lib/time/slots');
	var common = require('../common');
	var lisk = common.lisk;
}
describe('transfer.js', function () {
	var transfer = lisk.transfer;

	it('should be ok', function () {
		(transfer).should.be.ok;
	});

	it('should be object', function () {
		(transfer).should.be.type('object');
	});

	it('should have properties', function () {
		(transfer).should.have.property('createInTransfer');
	});

	describe('#createInTransfer', function () {
		var createInTransfer = transfer.createInTransfer;
		var dappId = '1234213';
		var amount = 10e8;
		var secret = 'secret';
		var publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		var secondSecret = 'secondSecret';
		var inTransferTransaction = createInTransfer(dappId, amount, secret, secondSecret);

		it('should be a function', function () {
			(createInTransfer).should.be.type('function');
		});

		it('should create an in transfer dapp transaction', function () {
			(inTransferTransaction).should.be.type('object');
		});

		it('should create an in transfer dapp transaction type 6', function () {
			(inTransferTransaction).should.have.property('type').be.equal(6);
		});

		it('should create an in transfer dapp transaction with dapp id in asset', function () {
			(inTransferTransaction)
				.should.have.property('asset')
				.with.property('inTransfer')
				.with.property('dappId')
				.equal(dappId);
		});

		it('should create an in transfer dapp transaction with a provided amount', function () {
			(inTransferTransaction).should.have.property('amount').equal(amount);
		});

		it('should create an in transfer dapp transaction with a default fee', function () {
			(inTransferTransaction).should.have.property('fee').equal(0.1e8);
		});

		it('should create an in transfer dapp transaction with no recipient', function () {
			(inTransferTransaction).should.have.property('recipientId').be.null();
		});

		it('should create an in transfer dapp transaction with senderPublicKey', function () {
			(inTransferTransaction).should.have.property('senderPublicKey').equal(publicKey);
		});

		it('should create an in transfer dapp transaction with first signature', function () {
			(inTransferTransaction).should.have.property('signature').and.be.ok();
		});

		it('should create an in transfer dapp transaction with second signature', function () {
			(inTransferTransaction).should.have.property('signSignature').and.be.ok();
		});

		it('should create an in transfer dapp transaction with just one signature', function () {
			var inTransferTransactionOneSignature = createInTransfer(dappId, amount, secret);
			(inTransferTransactionOneSignature).should.have.property('signature').and.be.ok();
			(inTransferTransactionOneSignature).should.not.have.property('secondSignature');
		});

		it('should use time slots to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			var trs = createInTransfer(dappId, amount, secret);

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

			var trs = createInTransfer(dappId, amount, secret, null, offset);

			(trs).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime() - offset)).should.be.true();

			stub.restore();
			clock.restore();
		});

	});

	describe('#createOutTransfer', function () {
		var createOutTransfer = transfer.createOutTransfer;
		var dappId = '1234213';
		var transactionId = '9876567';
		var recipientId = '989234L';
		var amount = 10e8;
		var secret = 'secret';
		var publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		var secondSecret = 'secondSecret';
		var outTransferTransaction = createOutTransfer(dappId, transactionId, recipientId, amount, secret, secondSecret);

		it('should be a function', function () {
			(createOutTransfer).should.be.type('function');
		});

		it('should create an out transfer dapp transaction', function () {
			(outTransferTransaction).should.be.type('object');
		});

		it('should create an out transfer dapp transaction type 7', function () {
			(outTransferTransaction).should.have.property('type').equal(7);
		});

		it('should create an out transfer dapp transaction with dapp id in asset', function () {
			(outTransferTransaction)
				.should.have.property('asset')
				.with.property('outTransfer')
				.with.property('dappId')
				.equal(dappId);
		});

		it('should create an out transfer dapp transaction with transaction id in asset', function () {
			(outTransferTransaction)
				.should.have.property('asset')
				.with.property('outTransfer')
				.with.property('transactionId')
				.equal(transactionId);
		});

		it('should create an out transfer dapp transaction with a provided amount', function () {
			(outTransferTransaction).should.have.property('amount').equal(amount);
		});

		it('should create an out transfer dapp transaction with a default fee', function () {
			(outTransferTransaction).should.have.property('fee').equal(0.1e8);
		});

		it('should create an out transfer dapp transaction with a provided recipient', function () {
			(outTransferTransaction).should.have.property('recipientId').equal(recipientId);
		});

		it('should create an out transfer dapp transaction with senderPublicKey', function () {
			(outTransferTransaction).should.have.property('senderPublicKey').equal(publicKey);
		});

		it('should create an out transfer dapp transaction with first signature', function () {
			(outTransferTransaction).should.have.property('signature').be.ok();
		});

		it('should create an out transfer dapp transaction with second signature', function () {
			(outTransferTransaction).should.have.property('signSignature').be.ok();
		});

		it('should create an out transfer dapp transaction with just one signature', function () {
			var outTransferTransactionOneSignature = createOutTransfer(dappId, transactionId, recipientId, amount, secret);
			(outTransferTransactionOneSignature).should.have.property('signature').be.ok();
			(outTransferTransactionOneSignature).should.not.have.property('secondSignature');
		});

		it('should use time slots to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			var trs = createOutTransfer(dappId, transactionId, recipientId, amount, secret);

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

			var trs = createOutTransfer(dappId, transactionId, recipientId, amount, secret, null, offset);

			(trs).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime() - offset)).should.be.true();

			stub.restore();
			clock.restore();
		});

	});

});
