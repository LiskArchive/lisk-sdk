function importTest(name, path) {
	describe(name, function () {
		require(path);
	});
}

// var common = require('./common');

describe('top', function () {

	importTest('transactions Crypto ', './transactions/crypto.js');
	importTest('transactions DAPP ', './transactions/dapp.js');
	importTest('transactions Delegate ', './transactions/delegate.js');
	importTest('transactions Multisignature ', './transactions/multisignature.js');
	importTest('transactions Signature', './transactions/signature.js');
	importTest('transactions Transaction', './transactions/transaction.js');
	importTest('transactions Transfer', './transactions/transfer.js');
	importTest('transactions Vote', './transactions/vote.js');
	importTest('time', './time/slots.js');

	importTest('transactions newCrypto', './transactions/crypto/index.js');
	importTest('api', './api/liskApi.js');
	importTest('api', './api/parseTransaction.js');
});
