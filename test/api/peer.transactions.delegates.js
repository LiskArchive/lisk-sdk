'use strict';

var crypto = require('crypto');
var node = require('./../node.js');

var account = node.randomAccount();

function postTransaction (transaction, done) {
	node.post('/peer/transactions', {
		transaction: transaction
	}, function (err, res) {
		done(err, res);
	});
}

function sendLISK (params, done) {
	var transaction = node.lisk.transaction.createTransaction(params.recipientId, params.amount, params.secret);

	postTransaction(transaction, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.onNewBlock(function (err) {
			done(err, res);
		});
	});
}

describe('POST /peer/transactions', function () {

	describe('registering a delegate', function () {

		it('using undefined transaction', function (done) {
			postTransaction(undefined, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.contain('Invalid transaction body');
				done();
			});
		});

		it('using undefined transaction.asset', function (done) {
			var transaction = node.lisk.delegate.createDelegate(node.randomPassword(), node.randomDelegateName().toLowerCase());
			transaction.fee = node.fees.delegateRegistrationFee;

			delete transaction.asset;

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.contain('Invalid transaction body');
				done();
			});
		});

		describe('when account has no funds', function () {

			it('should fail', function (done) {
				var transaction = node.lisk.delegate.createDelegate(node.randomPassword(), node.randomDelegateName().toLowerCase());
				transaction.fee = node.fees.delegateRegistrationFee;

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
					done();
				});
			});
		});

		describe('when account has funds', function () {

			var account;
			var validParams;

			beforeEach(function () {
				account = node.randomAccount();
				validParams = {
					secret: account.password,
					username: account.username
				};
			});

			beforeEach(function (done) {
				sendLISK({
					secret: node.gAccount.password,
					amount: node.LISK,
					recipientId: account.address
				}, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId');
					node.expect(res.body.transactionId).to.be.not.empty;
					node.onNewBlock(function (err) {
						done(err);
					});
				});
			});

			it('using invalid username should fail', function (done) {
				var transaction = node.lisk.delegate.createDelegate(account.password, crypto.randomBytes(64).toString('hex'));
				transaction.fee = node.fees.delegateRegistrationFee;

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});

			it('using uppercase username should fail', function (done) {
				account.username = 'UPPER_DELEGATE';
				var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});

			describe('when lowercased username already registered', function () {
				it('using uppercase username should fail', function (done) {
					var transaction = node.lisk.delegate.createDelegate(account.password, account.username.toUpperCase());

					postTransaction(transaction, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.not.ok;
						done();
					});
				});
			});

			it('using lowercase username should be ok', function (done) {
				account.username = node.randomDelegateName().toLowerCase();
				var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);
					done();
				});
			});

			describe('twice for the same account in different blocks', function () {

				it('should fail', function (done) {
					account.username = node.randomDelegateName().toLowerCase();
					var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

					account.username = node.randomDelegateName().toLowerCase();
					var transaction2 = node.lisk.delegate.createDelegate(account.password, account.username);

					postTransaction(transaction, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;

						node.onNewBlock(function () {
							postTransaction(transaction2, function (err, res) {
								node.expect(res.body).to.have.property('success').to.be.not.ok;
								done();
							});
						});
					});
				});
			});

			describe('registering same username twice in the same block', function () {

				describe('using same account', function () {

					it('should not confirm the second transaction with different timestamp', function (done) {

						var firstTransaction;
						var secondTransaction;

						node.async.series({
							first: function (cb) {
								firstTransaction = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
								node.post('/peer/transactions', {transaction: firstTransaction}, cb);
							},
							second: function (cb) {
								setTimeout(function () {
									secondTransaction = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
									node.post('/peer/transactions', {transaction: secondTransaction}, cb);
								}, 1001);
							}
						}, function (err) {
							node.expect(err).to.be.null;
							node.onNewBlock(function () {
								node.async.series({
									firstConfirmedTransaction: function (cb) {
										return node.get('/api/transactions/get?id=' + firstTransaction.id, cb);
									},
									secondConfirmedTransaction: function (cb) {
										return node.get('/api/transactions/get?id=' + secondTransaction.id, cb);
									}
								}, function (err, res) {
									node.expect(err).to.be.null;
									node.expect(res).to.have.deep.property('firstConfirmedTransaction.body.success').to.be.true;
									node.expect(res).to.have.deep.property('firstConfirmedTransaction.body.transaction.id').to.equal(firstTransaction.id);

									node.expect(res).to.have.deep.property('secondConfirmedTransaction.body.success').to.be.false;
									node.expect(res).to.have.deep.property('secondConfirmedTransaction.body.error').to.be.equal('Transaction not found');
									done();
								});
							});
						});
					});
				});

				describe('using two different accounts', function () {

					var secondAccount;
					var validSecondParams;

					beforeEach(function () {
						secondAccount = node.randomAccount();
						validSecondParams = {
							secret: secondAccount.password,
							username: account.username
						};
					});

					beforeEach(function (done) {
						sendLISK({
							secret: node.gAccount.password,
							amount: node.LISK,
							recipientId: secondAccount.address
						}, function (err, res) {
							node.expect(res.body).to.have.property('success').to.be.ok;
							node.expect(res.body).to.have.property('transactionId');
							node.expect(res.body.transactionId).to.be.not.empty;
							node.onNewBlock(function (err) {
								done(err);
							});
						});
					});

					it('should not confirm the first transaction', function (done) {

						var firstTransaction;
						var secondTransaction;

						node.async.series({
							first: function (cb) {
								firstTransaction = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
								node.post('/peer/transactions', {transaction: firstTransaction}, cb);
							},
							second: function (cb) {
								secondTransaction = node.lisk.delegate.createDelegate(validSecondParams.secret, validParams.username);
								node.post('/peer/transactions', {transaction: secondTransaction}, cb);
							}
						}, function (err) {
							node.expect(err).to.be.null;
							node.onNewBlock(function () {
								node.async.series({
									firstConfirmedTransaction: function (cb) {
										return node.get('/api/transactions/get?id=' + firstTransaction.id, cb);
									},
									secondConfirmedTransaction: function (cb) {
										return node.get('/api/transactions/get?id=' + secondTransaction.id, cb);
									}
								}, function (err, res) {
									node.expect(err).to.be.null;
									node.expect(res).to.have.deep.property('secondConfirmedTransaction.body.success').to.be.true;
									node.expect(res).to.have.deep.property('secondConfirmedTransaction.body.transaction.id').to.equal(secondTransaction.id);

									node.expect(res).to.have.deep.property('firstConfirmedTransaction.body.success').to.be.false;
									node.expect(res).to.have.deep.property('firstConfirmedTransaction.body.error').to.be.equal('Transaction not found');
									done();
								});
							});
						});
					});
				});
			});
		});
	});
});
