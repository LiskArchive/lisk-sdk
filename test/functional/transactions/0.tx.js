'use strict';

var _ = require('lodash');
var crypto = require('crypto');

var node = require('../../node.js');
var http = require('../../common/httpCommunication.js');
var sendTransaction = require('../../common/complexTransactions.js').sendTransaction;

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

function getTransactions (transactions, cb) {
	http.get('/api/transactions', function (err, res) {
		if (err) {
			return cb(err);
		}
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('transactions').to.be.an('array');
		cb(null, res.body.transactions);
	});
}

describe('postTransactions type 0', function () {
	var wrongTransactions = [];
	var goodTransactions = [];

	describe('schema', function () {
		it('sending null transaction should return schema check error', function (done) {
			sendTransaction(null, function (err, res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
			wrongTransactions.push(null);
		});

		it('sending empty transaction should return schema check error', function (done) {
			sendTransaction({}, function (err, res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
			wrongTransactions.push({});
		});

		it('using amount is negative should fail', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, -1, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum/);
				done();
			});
			wrongTransactions.push(transaction);
		});

		it('using float amount should fail', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 1.2, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number/);
				done();
			});
			wrongTransactions.push(transaction);
		});

		it('using zero amount should fail', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 0, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction amount/);
				done();
			});
			wrongTransactions.push(transaction);
		});

		it('using valid transaction should be ok', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				done();
			});
			goodTransactions.push(transaction);
		});

		it('using positive overflown amount should fail', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.have.string('Invalid transaction body - Failed to validate transaction schema: Value 1.2982318129391238e+99 is greater than maximum 10000000000000000');
				done();
			});
			wrongTransactions.push(transaction);
		});

		it('using negative overflown amount should fail', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, -1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.have.string('Invalid transaction body - Failed to validate transaction schema: Value -1.2982318129391238e+99 is less than minimum 0');
				done();
			});
			wrongTransactions.push(transaction);
		});
	});

	describe('processing', function () {
		it('when sender has no funds should fail', function (done) {
			var noFundsAccount = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction('1L', 1, noFundsAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
				done();
			});
			wrongTransactions.push(transaction);
		});

		it('using entire balance should fail', function (done) {
			var account = node.randomAccount();
			var transaction2 = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance), node.gAccount.password);
			sendTransaction(transaction2, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/^Account does not have enough LSK:/);
				done();
			});
			wrongTransactions.push(transaction2);
		});

		it('when sender has funds should be ok', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				done();
			});
			goodTransactions.push(transaction);
		});

		it('using already processed transaction should fail', function (done) {
			var account = node.randomAccount();
			var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);
			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Transaction is already processed: [0-9]+/);
					done();
				});
			});
			wrongTransactions.push(transaction);
		});

		it('when signing from the genesis account should fail', function (done) {
			sendTransaction(signedTransactionFromGenesis, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').equals('Invalid sender. Can not send from genesis account');
				done();
			});
			wrongTransactions.push(signedTransactionFromGenesis);
		});
	});

	describe('confirmation', function () {
		before(function (done) {
			node.onNewBlock(function () {
				done();
			});
		});

		it('wrong and malformed transactions should NOT have been confirmed', function (done) {
			getTransactions(wrongTransactions, function (err, transactionsReceived) {
				var wrongTransactionIds = wrongTransactions.map(function (wrongTransaction) {
					return _.get(wrongTransaction, 'id', null);
				}).filter(function (transactionId) {
					return !!transactionId;
				});
				node.expect(_.intersection(_.map(transactionsReceived, 'id'), wrongTransactionIds)).to.have.lengthOf(0);
				done();
			});
		});

		it('well processed transactions should have been confirmed', function (done) {
			getTransactions(goodTransactions, function (err, transactionsReceived) {
				var goodTransactionIds = goodTransactions.map(function (goodTransactions) {
					return _.get(goodTransactions, 'id', null);
				}).filter(function (transactionId) {
					return !!transactionId;
				});
				node.expect(_.intersection(_.map(transactionsReceived, 'id'), goodTransactionIds)).to.not.have.lengthOf(goodTransactions);
				done();
			});
		});
	});
});
