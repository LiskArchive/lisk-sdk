'use strict';

var _ = require('lodash');
var crypto = require('crypto');

var http = require('../../common/httpCommunication.js');
var node = require('../../node.js');
var ws = require('../../common/wsCommunication.js');

function getConfirmedTransaction (transaction, cb) {
	http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
		node.expect(res.body).to.have.property('success');
		if (!res.body.success) {
			return cb(null, undefined);
		}
		node.expect(res.body).to.have.property('transaction').to.be.an('object');
		return cb(null, res.body.transaction);
	});
}

function getConfirmedTransactions (cb) {
	http.get('/api/transactions', function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('transactions').to.be.an('array');
		cb(null, res.body.transactions);
	});
}

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transaction: transaction
	}, done, true);
}

function postTransactions (transactions, done) {
	ws.call('postTransactions', {
		transactions: transactions
	}, done, true);
}

function postSignature (signature, transaction, done) {
	ws.call('postSignatures', {
		signature: {
			signature: signature,
			transaction: transaction.id
		}
	}, done, true);
}

describe('getTransactions', function () {

	it('should return valid response', function (done) {
		ws.call('getTransactions', function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactions').to.be.an('array');
			done();
		});
	});

	before(function (done) {
		var randomAccount = node.randomAccount();
		var transaction = node.lisk.transaction.createTransaction(randomAccount.address, 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			done(err);
		});
	});

	it('should return non empty transaction list after post', function (done) {
		ws.call('getTransactions', function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactions').to.be.an('array').and.to.be.not.empty;
			done();
		});
	});
});

describe('postTransactions', function () {

	describe('passphrase', function () {

		var wrongTransactions = [];

		describe('schema', function () {

			it('sending null transaction should return schema check error', function (done) {
				postTransaction(null, function (err, res) {
					node.expect(res).to.have.property('success').not.to.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
				wrongTransactions.push(null);
			});

			it('sending empty transaction should return schema check error', function (done) {
				postTransaction({}, function (err, res) {
					node.expect(res).to.have.property('success').not.to.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
				wrongTransactions.push({});
			});

			it('using valid transaction should be ok', function (done) {
				var account = node.randomAccount();
				var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					done();
				});
			});

		});

		describe('processing', function () {

			it('when sender has no funds should fail', function (done) {
				var noFundsAccount = node.randomAccount();
				var transaction = node.lisk.transaction.createTransaction('1L', 1, noFundsAccount.password);

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
					done();
				});

				wrongTransactions.push(transaction);
			});

			it('when sender has funds should be ok', function (done) {

				var account = node.randomAccount();
				var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					done();
				});
			});

			it('using already processed transaction should fail', function (done) {
				var account = node.randomAccount();
				var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);

					postTransaction(transaction, function (err, res) {
						node.expect(res).to.have.property('success').to.be.not.ok;
						node.expect(res).to.have.property('message').to.match(/Transaction is already processed: [0-9]+/);
						done();
					});
				});
			});
		});

		describe('confirmation', function () {

			it('should not confirm all malformed transactions', function (done) {

				postTransactions(wrongTransactions, function (err, res) {
					node.onNewBlock(function () {
						getConfirmedTransactions(function (err, transactions) {
							var wrongTransactionIds = wrongTransactions.map(function (wrongTransaction) {
								return _.get(wrongTransaction, 'id', null);
							}).filter(function (transactionId) {
								return !!transactionId;
							});
							node.expect(_.intersection(_.map(transactions, 'id'), wrongTransactionIds)).to.have.lengthOf(0);
							done();
						});
					});
				});
			});

			it('when sender has no funds and sends proper transaction it should not be confirmed', function (done) {

				var transaction = node.lisk.transaction.createTransaction('1L', 1, 'randomstring');

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
					node.onNewBlock(function () {
						getConfirmedTransaction(transaction, function (err, res) {
							node.expect(res).to.be.undefined;
							done();
						});
					});
				});
			});

			it('when sender has funds and sends proper transaction it should be confirmed', function (done) {
				var account = node.randomAccount();
				var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					node.onNewBlock(function () {
						getConfirmedTransaction(transaction, function (err, res) {
							node.expect(res).to.be.an('object').to.have.property('id').equal(transaction.id);
							done();
						});
					});
				});
			});

			it('using already confirmed transaction should fail', function (done) {
				var account = node.randomAccount();
				var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

				postTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);

					node.onNewBlock(function (err) {
						postTransaction(transaction, function (err, res) {
							node.expect(res).to.have.property('success').to.be.not.ok;
							node.expect(res).to.have.property('message').to.match(/Transaction is already confirmed: [0-9]+/);
							done();
						});
					});
				});
			});
		});
	});

	describe('from the genesis account', function () {

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

		it('should fail', function (done) {
			postTransaction(signedTransactionFromGenesis, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').equals('Invalid sender. Can not send from genesis account');
				done();
			});
		});
	});

});
