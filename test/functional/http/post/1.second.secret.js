'use strict';

var node = require('../../../node');
var shared = require('./shared');
var constants = require('../../../../helpers/constants');

var sendTransaction = require('../../../common/complexTransactions').sendTransaction;
var sendLISK = require('../../../common/complexTransactions').sendLISK;

describe('POST /api/transactions (type 1)', function () {

	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];

	var account = node.randomAccount();
	var accountEmptySecondPassword = node.randomAccount();
	accountEmptySecondPassword.secondPassword = '';

	var transaction;

	// Crediting accounts
	before(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: 1000000000,
			address: account.address
		}, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactionId').that.is.not.empty;
			sendLISK({
				secret: node.gAccount.password,
				amount: 1000000000,
				address: accountEmptySecondPassword.address
			}, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
				node.onNewBlock(done);
			});
		});
	});

	describe('schema checks', function () {

		beforeEach(function () {
			transaction = node.lisk.signature.createSignature(account.password, node.randomPassword());
		});

		describe('using invalid asset values', function () {

			it('using null should fail', function (done) {
				transaction.asset = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - TypeError: Cannot read property \'signature\' of undefined');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.asset;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - TypeError: Cannot read property \'signature\' of undefined');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.asset = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - TypeError: Cannot read property \'signature\' of undefined');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.asset = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - TypeError: Cannot read property \'signature\' of undefined');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty string should fail', function (done) {
				transaction.asset = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type object but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				transaction.asset = 1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type object but found type integer');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.asset = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type object but found type number');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				transaction.asset = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type object but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.asset = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('using invalid asset.signatures values', function () {

			it('using null should fail', function (done) {
				transaction.asset.signature = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.asset.signature;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.asset.signature = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.asset.signature = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty string should fail', function (done) {
				transaction.asset.signature = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				transaction.asset.signature = 1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.asset.signature = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				transaction.asset.signature = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.asset.signature = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Missing required property: publicKey');
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('using invalid asset.signatures.publicKey values', function () {

			it('using null should fail', function (done) {
				transaction.asset.signature.publicKey = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Expected type string but found type null');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.asset.signature.publicKey;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Missing required property: publicKey');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.asset.signature.publicKey = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Missing required property: publicKey');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.asset.signature.publicKey = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Expected type string but found type null');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				transaction.asset.signature.publicKey = 1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Expected type string but found type integer');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.asset.signature.publicKey = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Expected type string but found type number');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				transaction.asset.signature.publicKey = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Expected type string but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.asset.signature.publicKey = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Expected type string but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty string should fail', function (done) {
				transaction.asset.signature.publicKey = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using not supported format should fail', function (done) {
				transaction.asset.signature.publicKey = '/';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate signature schema: Object didn\'t pass validation for format publicKey: ' + transaction.asset.signature.publicKey);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});
	});

	describe('processing', function () {

		it('setting second secret with empty second passphrase transaction should be ok', function (done) {
			transaction = node.lisk.signature.createSignature(accountEmptySecondPassword.password, accountEmptySecondPassword.secondPassword);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
				done();
			}, true);
		});

		it('setting second secret with good schema transaction should be ok', function (done) {
			transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
				done();
			}, true);
		});
	});

	describe('schema and processing confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('enforcement', function () {

		describe('type 0 - sending funds', function () {

			it('using no second passphrase should fail', function (done) {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password);

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Missing sender second signature');
					badTransactionsEnforcement.push(transaction);
					done();
				}, true);
			});

			it('using invalid second passphrase should fail', function (done) {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password, 'invalid password');

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to verify second signature');
					badTransactionsEnforcement.push(transaction);
					done();
				}, true);
			});

			it('using correct second passphrase should be ok', function (done) {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password, account.secondPassword);

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
					done();
				}, true);
			});

			// TODO: waiting to fix lisk-js in #285
			it.skip('using correct empty second passphrase should be ok', function (done) {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, accountEmptySecondPassword.password, accountEmptySecondPassword.secondPassword);

				console.log('transaction 2', transaction);

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
					done();
				}, true);
			});
		});

		describe('type 1 - second secret', function () {

			it('setting second signature twice on the same account should be ok but not confirmed', function (done) {
				transaction = node.lisk.signature.createSignature(account.password, node.randomPassword());
				var secondKeys = node.lisk.crypto.getKeys(account.secondPassword);
				node.lisk.crypto.secondSign(transaction, secondKeys);
				transaction.id = node.lisk.crypto.getId(transaction);

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					badTransactionsEnforcement.push(transaction);
					done();
				}, true);
			});
		});
	});

	describe('enforcement confirmation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
