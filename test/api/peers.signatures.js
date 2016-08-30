'use strict'; /*jslint mocha:true, expr:true */

var crypto = require('crypto');
var node = require('./../node.js');

var account = node.randomAccount();
var account2 = node.randomAccount();
var account3 = node.randomAccount();

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

	describe('enabling second signature', function () {

		it('using undefined transaction', function (done) {
			postTransaction(undefined, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body');
				done();
			});
		});

		it('using undefined transaction.asset', function (done) {
			var transaction = node.lisk.signature.createSignature(node.randomPassword(), node.randomPassword());

			delete transaction.asset;

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body');
				done();
			});
		});

		describe('when account has no funds', function () {

			it('should fail', function (done) {
				var transaction = node.lisk.signature.createSignature(node.randomPassword(), node.randomPassword());

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
						amount: node.Fees.secondPasswordFee + 100000000,
						recipientId: account.address
					}, function (err, res) {
						done(err, res);
					});
				});
			});

			it('should be ok', function (done) {
				var transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);
				transaction.fee = node.Fees.secondPasswordFee;

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					done();
				});
			});
		});
	});

	describe('using second signature', function () {

		before(function (done) {
			node.onNewBlock(function (err) {
				node.expect(err).to.be.not.ok;
				done();
			});
		});

		it('when account does not have one should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, node.Gaccount.password, account.secondPassword);

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				done();
			});
		});

		it('using blank second passphrase should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, '');

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				done();
			});
		});

		it('using fake second passphrase should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, account2.secondPassword);
			transaction.signSignature = crypto.randomBytes(64).toString('hex');
			transaction.id = node.lisk.crypto.getId(transaction);

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				done();
			});
		});

		it('using valid second passphrase should be ok', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, account.secondPassword);

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});
});
