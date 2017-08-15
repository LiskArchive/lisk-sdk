'use strict';

var node = require('../../../node');
var shared = require('./shared');
var constants = require('../../../../helpers/constants');

var sendTransaction = require('../../../common/complexTransactions').sendTransaction;

describe('POST /api/transactions (type 0)', function () {

	var badTransactions = [];
	var goodTransactions = [];

	describe('schema validation', function () {

		var transaction;

		beforeEach(function () {
			transaction = node.randomTx();
		});

		it('using null should fail', function (done) {
			sendTransaction(null, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using undefined should fail', function (done) {
			sendTransaction(undefined, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using NaN should fail', function (done) {
			sendTransaction(NaN, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using integer should fail', function (done) {
			sendTransaction(0, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using empty string should fail', function (done) {
			sendTransaction('', function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using empty array should fail', function (done) {
			sendTransaction([], function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using empty object should fail', function (done) {
			sendTransaction({}, function (err, res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});
	});

	describe('transaction processing', function () {

		var account = node.randomAccount();
		var goodTransaction = node.randomTx();

		it('using zero amount should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction(account.address, 0, node.gAccount.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction amount');
				badTransactions.push(transaction);
				done();
			});
		});

		it('when sender has no funds should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
				done();
			});
		});

		it('using entire balance should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance), node.gAccount.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/^Account does not have enough LSK: [0-9]+L balance: /);
				badTransactions.push(transaction);
				done();
			});
		});

		it('sending funds from the genesis account should fail', function (done) {
			var signedTransactionFromGenesis = {
				type: 0,
				amount: 1000,
				senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
				requesterPublicKey: null,
				timestamp: 24259352,
				asset: {},
				recipientId: node.eAccount.address,
				signature: 'f56a09b2f448f6371ffbe54fd9ac87b1be29fe29f27f001479e044a65e7e42fb1fa48dce6227282ad2a11145691421c4eea5d33ac7f83c6a42e1dcaa44572101',
				id: '15307587316657110485',
				fee: 10000000
			};

			sendTransaction(signedTransactionFromGenesis, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').equals('Invalid sender. Can not send from genesis account');
				badTransactions.push(signedTransactionFromGenesis);
				done();
			});
		});

		it('when sender has funds should be ok', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(goodTransaction.id);
				goodTransactions.push(goodTransaction);
				done();
			});
		});

		it('sending transaction with same id twice should fail', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Transaction is already processed: ' + goodTransaction.id);
				done();
			});
		});
	});

	describe('transaction confirmations', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
