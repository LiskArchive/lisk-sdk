'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

var account = node.randomTxAccount();
var account2 = node.randomTxAccount();
var account3 = node.randomTxAccount();

var transactionList = [];

function putTransaction (params, done) {
	node.api.put('/transactions')
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

function sendLISK (account, done) {
	var randomLISK = node.randomLISK();
	var expectedFee = node.expectedFee(randomLISK);

	putTransaction({
		secret: node.Gaccount.password,
		amount: randomLISK,
		recipientId: account.address
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		if (res.body.success && res.body.transactionId != null) {
			transactionList.push({
				'sender': node.Gaccount.address,
				'recipient': account.address,
				'grossSent': (randomLISK + expectedFee) / node.normalizer,
				'fee': expectedFee / node.normalizer,
				'netSent': randomLISK / node.normalizer,
				'txId': res.body.transactionId,
				'type': node.TxTypes.SEND
			});
		}
		done(err, res);
	});
}

before(function (done) {
	setTimeout(function () {
		sendLISK(account, done);
	}, 2000);
});

before(function (done) {
	setTimeout(function () {
		sendLISK(account2, done);
	}, 2000);
});

describe('PUT /signatures', function () {

	it('when account has no funds should fail', function (done) {
		node.api.put('/signatures')
			.set('Accept', 'application/json')
			.send({
				secret: account3.password,
				secondSecret: account3.password
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using invalid passphrase should fail', function (done) {
		node.api.put('/signatures')
			.set('Accept', 'application/json')
			.send({
				secret: 'account.password',
				secondSecret: account.password
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using no second passphrase should fail', function (done) {
		node.api.put('/signatures')
			.set('Accept', 'application/json')
			.send({
				secret: account.password
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using valid parameters should be ok', function (done) {
		node.api.put('/signatures')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				secondSecret: account.secondPassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				if (res.body.success && res.body.transaction != null) {
					node.expect(res.body.transaction).to.have.property('type').to.equal(node.TxTypes.SIGNATURE);
					node.expect(res.body.transaction).to.have.property('senderPublicKey').to.equal(account.publicKey);
					node.expect(res.body.transaction).to.have.property('senderId').to.equal(account.address);
					node.expect(res.body.transaction).to.have.property('fee').to.equal(node.Fees.secondPasswordFee);
					account.balance -= node.Fees.secondPasswordFee;
					transactionList.push({
						'sender': account.address,
						'recipient': account.address,
						'grossSent': 0,
						'fee': node.Fees.secondPasswordFee,
						'netSent': 0,
						'txId': res.body.transaction.id,
						'type': node.TxTypes.SIGNATURE
					});
				} else {
					// console.log('Transaction failed or transaction object is null');
					// console.log('Sent: secret: ' + account.password + ', secondSecret: ' + account.secondPassword);
					node.expect(false).to.equal(true);
				}
				done();
			});
	});
});

describe('PUT /transactions from account with second passphase enabled', function () {

	before(function (done) {
		node.onNewBlock(done);
	});

	it('using no second passphase should fail', function (done) {
		var amountToSend = 100000000;

		node.api.put('/transactions')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				recipientId: account2.address,
				amount: amountToSend
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using second passphase but no primary passphase should fail', function (done) {
		var amountToSend = 100000000;

		node.api.put('/transactions')
			.set('Accept', 'application/json')
			.send({
				secondSecret: account.secondPassword,
				recipientId: account2.address,
				amount: amountToSend
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});
});

describe('PUT /delegates from account with second passphase enabled', function () {

	it('using no second passphase should fail', function (done) {
		node.api.put('/delegates')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				username: account.delegateName
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});
});
