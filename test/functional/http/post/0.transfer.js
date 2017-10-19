'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;

describe('POST /api/transactions (type 0) transfer funds', function () {

	var badTransactions = [];
	var goodTransactions = [];

	var account = node.randomAccount();
	var goodTransaction = node.randomTx();
	// Low-frills deep copy
	var cloneGoodTransaction = JSON.parse(JSON.stringify(goodTransaction));
	var transaction;

	describe('schema validations', function () {

		shared.invalidTxs();
	});

	describe('transaction processing', function () {

		it('mutating data used to build the transaction id should fail', function () {
			transaction = node.randomTx();
			transaction.timestamp += 1;

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.is.equal('Invalid transaction id');
				badTransactions.push(transaction);
			});
		});

		it('using zero amount should fail', function () {
			transaction = node.lisk.transaction.createTransaction(account.address, 0, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.to.equal('Invalid transaction amount');
				badTransactions.push(transaction);
			});
		});

		it('when sender has no funds should fail', function () {
			transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.to.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('using entire balance should fail', function () {
			transaction = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance) , node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.match(/^Account does not have enough LSK: [0-9]+L balance: /);
				badTransactions.push(transaction);
			});
		});

		it('from the genesis account should fail', function () {
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
				fee: 0.1 * node.normalizer
			};

			return sendTransactionPromise(signedTransactionFromGenesis).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').equals('Invalid sender. Can not send from genesis account');
				badTransactions.push(signedTransactionFromGenesis);
			});
		});

		it('when sender has funds should be ok', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(goodTransaction);
			});
		});

		it('sending transaction with same id twice should fail', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Transaction is already processed: ' + goodTransaction.id);
			});
		});

		it('sending transaction with same id twice but newer timestamp should fail', function () {
			cloneGoodTransaction.timestamp += 1;

			return sendTransactionPromise(cloneGoodTransaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Transaction is already processed: ' + cloneGoodTransaction.id);
			});
		});

		it('sending transaction with same id twice but older timestamp should fail', function () {
			cloneGoodTransaction.timestamp -= 1;

			return sendTransactionPromise(cloneGoodTransaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Transaction is already processed: ' + cloneGoodTransaction.id);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('sending already confirmed transaction should fail', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Transaction is already confirmed: ' + goodTransaction.id);
			});
		});
	});
});
