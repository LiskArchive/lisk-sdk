'use strict'; /*jslint mocha:true, expr:true */

var crypto = require('crypto');
var node = require('./../node.js');

var account = node.randomAccount();
var account2 = node.randomAccount();
var account3 = node.randomAccount();

describe('POST /peer/transactions', function () {

	describe('enabling second passphrase', function () {

		it('when accounts has no funds should fail', function (done) {
			var transaction = node.lisk.signature.createSignature(node.randomPassword(), node.randomPassword());

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
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
		});

		it('when accounts has funds should be ok', function (done) {
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
					account.address = res.body.account.address;
					node.api.put('/transactions')
						.set('Accept', 'application/json')
						.set('version', node.version)
						.set('nethash', node.config.nethash)
						.set('port', node.config.port)
						.send({
							secret: node.Gaccount.password,
							amount: node.Fees.secondPasswordFee + 100000000, // Testing 1 delegate registration + 1 transaction sending 1Lisk
							recipientId: account.address
						})
						.expect('Content-Type', /json/)
						.expect(200)
						.end(function (err, res) {
							// console.log(JSON.stringify(res.body));
							node.expect(res.body).to.have.property('success').to.be.ok;
							node.onNewBlock(function (err) {
								node.expect(err).to.be.not.ok;
								var transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);
								transaction.fee = node.Fees.secondPasswordFee;
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
										// console.log(transaction.recipientId);
										// console.log(account.address);
										node.expect(res.body).to.have.property('success').to.be.ok;
										node.onNewBlock(done);
									});
							});
						});
				});
		});
	});
});

describe('POST /peer/transactions', function () {

	describe('before enabling second signature', function () {

		it('using second passphrase should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, node.Gaccount.password, account.secondPassword);

			node.peer.post('/transactions')
				.set('Accept', 'application/json')
				.set('version',node.version)
				.set('nethash', node.config.nethash)
				.set('port',node.config.port)
				.send({
					transaction: transaction
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
		});
	});

	describe('after enabling second signature', function () {

		it('using blank second passphrase should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, ''); // Send 1 Lisk to address 1L

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
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
		});

		it('using fake second passphrase should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, account2.secondPassword); // Send 1 Lisk to address 1L
			transaction.signSignature = crypto.randomBytes(64).toString('hex');
			transaction.id = node.lisk.crypto.getId(transaction);

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
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
		});

		it('using valid second passphrase should be ok', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, account.secondPassword); // Send 1 Lisk to address 1L

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
					node.expect(res.body).to.have.property('success').to.be.ok;
					done();
				});
		});
	});
});
