'use strict';

var async = require('async');

var node = require('./../node.js');

var account = node.randomAccount();
var account1 = node.randomAccount();
var account2 = node.randomAccount();
var account3 = node.randomAccount();
var accountNoFunds = node.randomAccount();

var accounts = [];
accounts.push(account, account1, account2, account3);

function putSignature (params, done) {
	node.put('/api/signatures', params, done);
}

function putTransaction (params, done) {
	node.put('/api/transactions', params, done);
}

function putDelegate (params, done) {
	node.put('/api/delegates', params, done);
}

before(function (done) {
	var crediting = accounts;
	async.eachSeries(crediting, function (account, eachCb) {
		putTransaction({
			secret: node.gAccount.password,
			amount: 100 * node.normalizer,
			recipientId: account.address
		}, eachCb);
	}, function (err) {
		return done(err);
	});
});

describe('PUT /api/signatures', function () {

	before(function (done) {
		node.onNewBlock(done);
	});

	var validParams;
	
	beforeEach(function (done) {
		validParams = {
			secret: account.password,
			secondSecret: account.secondPassword
		};
		done();
	});

	it('when account has no funds should fail', function (done) {
		validParams.secret = accountNoFunds.password;
		validParams.secondSecret = accountNoFunds.password;

		putSignature(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('using invalid passphrase should fail', function (done) {
		validParams.secret = 'invalid';

		putSignature(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('using no second passphrase should fail', function (done) {
		delete validParams.secondSecret;

		putSignature(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid parameters should be ok', function (done) {
		putSignature(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');
			node.expect(res.body.transaction).to.have.property('type').to.equal(node.txTypes.SIGNATURE);
			node.expect(res.body.transaction).to.have.property('senderPublicKey').to.equal(account.publicKey);
			node.expect(res.body.transaction).to.have.property('senderId').to.equal(account.address);
			node.expect(res.body.transaction).to.have.property('fee').to.equal(node.fees.secondPasswordFee);
			done();
		});
	});

	describe('multisigAccountPublicKey', function (done) {

		it('using null should be ok', function (done) {
			validParams.secret =  account1.password,
			validParams.secondSecret = account1.secondPassword;
			
			validParams.multisigAccountPublicKey = null;

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').to.not.be.empty;
				done();
			});
		});

		it('using undefined should be ok', function (done) {
			validParams.secret = account2.password,
			validParams.secondSecret = account2.secondPassword;
			validParams.multisigAccountPublicKey = undefined;

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').to.not.be.empty;
				done();
			});
		});

		it('using integer should fail', function (done) {
			validParams.multisigAccountPublicKey = 1;

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using empty array should fail', function (done) {
			validParams.multisigAccountPublicKey = [];

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using empty object should fail', function (done) {
			validParams.multisigAccountPublicKey = {};

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using object should fail', function (done) {
			validParams.multisigAccountPublicKey = new Buffer.from('dummy');

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using empty string should be ok', function (done) {
			validParams.secret = account3.password,
			validParams.secondSecret = account3.secondPassword;
			validParams.multisigAccountPublicKey = '';

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').to.not.be.empty;
				done();
			});
		});

		it('using valid public key should fail', function (done) {
			validParams.multisigAccountPublicKey = node.randomAccount().publicKey;

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});
	});
});

describe('PUT /api/transactions from account with second signature enabled', function () {

	before(function (done) {
		node.onNewBlock(done);
	});

	var validParams;

	beforeEach(function (done) {
		validParams = {
			secret: account.password,
			secondSecret: account.password,
			recipientId: account2.address,
			amount: 1 * node.normalizer
		};
		done();
	});

	it('using no second passphase should fail', function (done) {
		delete validParams.secondSecret;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using second passphase but no primary passphase should fail', function (done) {
		delete validParams.secret;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});
});

describe('PUT /api/delegates from account with second signature enabled', function () {

	var validParams;

	beforeEach(function (done) {
		validParams = {
			secret: account.password,
			secondSecret: account.password,
			username: account.delegateName
		};
		done();
	});

	it('using no second passphase should fail', function (done) {
		delete validParams.secondSecret;

		putDelegate(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});
});
