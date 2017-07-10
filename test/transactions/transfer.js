if (typeof module !== 'undefined' && module.exports) {
	var common = require('../common');
	var lisk = common.lisk;
}
describe('transfer.js', function () {

	var transfer = lisk.transfer;

	it('should be ok', function () {
		(transfer).should.be.ok();
	});

	it('should be object', function () {
		(transfer).should.be.type('object');
	});

	it('should have properties', function () {
		(transfer).should.have.property('createTransfer');
	});

	describe('#createTransfer', function () {

		var createTransfer = lisk.transfer.createTransfer;
		var transferTransaction = createTransfer('secret', 'secondSecret', '1234213');

		it('should be a function', function () {
			(createTransfer).should.be.type('function');
		});

		it('should create a transfer dapp transaction', function () {
			(transferTransaction).should.be.type('object');
		});

		it('should create a transfer dapp transaction type 6', function () {
			(transferTransaction.type).should.be.equal(6);
		});

		it('should create a transfer dapp transaction with dapp id in asset', function () {
			(transferTransaction.asset.dapptransfer.dappid).should.be.equal('1234213');
		});

		it('should create a transfer dapp transaction with first signature', function () {
			(transferTransaction.signature).should.be.ok();
		});

		it('should create a transfer dapp transaction with second signature', function () {
			(transferTransaction.signSignature).should.be.ok();
		});

		it('should create a transfer dapp transaction with just one signature', function () {
			var transferTransactionOneSignature = createTransfer('secret', '', '1234213');
			(transferTransactionOneSignature.signature).should.be.ok();
			should(transferTransactionOneSignature.secondSignature).be.undefined();
		});
	});
});
