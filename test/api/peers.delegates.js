'use strict'; /*jslint mocha:true, expr:true */

var crypto = require('crypto');
var node = require('./../node.js');

var account = node.randomAccount();
var account2 = node.randomAccount();

function openAccount (account, done) {
	node.api.post('/accounts/open')
		.set('Accept', 'application/json')
		.set('version', node.version)
		.set('nethash', node.config.nethash)
		.set('port', node.config.port)
		.send({
			secret: account.password
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, res);
		});
}

function sendLISK (params, done) {
	node.api.put('/transactions')
		.set('Accept', 'application/json')
		.set('version', node.version)
		.set('nethash', node.config.nethash)
		.set('port', node.config.port)
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.onNewBlock(function (err) {
				node.expect(err).to.be.not.ok;
				done(err, res);
			});
		});
}

function postTransaction (transaction, done) {
	node.peer.post('/transactions')
		.set('Accept', 'application/json')
		.set('version', node.version)
		.set('nethash', node.config.nethash)
		.set('port', node.config.port)
		.send({
			transaction: transaction
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

describe('POST /peer/transactions', function () {

	describe('registering a delegate', function () {

		describe('when account has no funds', function () {

			it('should fail', function (done) {
				var transaction = node.lisk.delegate.createDelegate(node.randomPassword(), node.randomDelegateName().toLowerCase());
				transaction.fee = node.Fees.delegateRegistrationFee;

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});

		describe('when account has funds', function () {

			before(function (done) {
				openAccount(account, function (err, res) {
					account.address = res.body.account.address;
					sendLISK({
						secret: node.Gaccount.password,
						amount: node.Fees.delegateRegistrationFee,
						recipientId: account.address
					}, function (err, res) {
						done();
					});
				});
			});

			it('using invalid username should fail', function (done) {
				var transaction = node.lisk.delegate.createDelegate(account.password, crypto.randomBytes(64).toString('hex'));
				transaction.fee = node.Fees.delegateRegistrationFee;

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});

			it('using uppercase username should fail', function (done) {
				account.username = node.randomDelegateName().toUpperCase();
				var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});

			describe('when lowercased username already registered', function () {
				it('using uppercase username should fail', function (done) {
					var transaction = node.lisk.delegate.createDelegate(account2.password, account.username.toUpperCase());

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
					done();
				});
			});
		});

		describe('twice within the same block', function () {

			before(function (done) {
				openAccount(account2, function (err, res) {
					account2.address = res.body.account.address;
					sendLISK({
						secret: node.Gaccount.password,
						amount: (node.Fees.delegateRegistrationFee * 2),
						recipientId: account2.address
					}, function (err, res) {
						done();
					});
				});
			});

			it('should fail', function (done) {
				account2.username = node.randomDelegateName().toLowerCase();
				var transaction = node.lisk.delegate.createDelegate(account2.password, account2.username);

				account2.username = node.randomDelegateName().toLowerCase();
				var transaction2 = node.lisk.delegate.createDelegate(account2.password, account2.username);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					postTransaction(transaction2, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.not.ok;
						done();
					});
				});
			});
		});
	});
});
