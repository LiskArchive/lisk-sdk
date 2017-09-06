'use strict';

var async = require('async');
var node = require('../node.js');
var http = require('../common/httpCommunication.js');
var sendLISK = require('../common/complexTransactions.js').sendLISK;
var sendTransaction = require('../common/complexTransactions.js').sendTransaction;
var sendSignature = require('../common/complexTransactions.js').sendSignature;

var multisigAccount = node.randomAccount();
var multisigTransaction;
var keysGroup;
var accounts = [];

before(function (done) {
	var totalMembers = node.randomNumber(2, 16);

	for (var i = 0; i < totalMembers; i++) {
		accounts[i] = node.randomAccount();
	}
	//create multisig transaction
	sendLISK({
		secret: node.gAccount.password,
		amount: node.randomLISK(),
		address: multisigAccount.address
	}, function (err, res) {
		node.expect(err).to.be.null;
		node.onNewBlock(function () {
			keysGroup = accounts.map(function (account) { 
				return '+' + account.publicKey; 
			});
			multisigTransaction = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysGroup, 71, keysGroup.length);
			sendTransaction(multisigTransaction, done);
		});
	});
});

describe('GET /api/multisignatures/pending', function () {

	it('using invalid public key should fail', function (done) {
		var publicKey = 1234;

		http.get('/api/multisignatures/pending?publicKey=' + publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no public key should be ok', function (done) {
		http.get('/api/multisignatures/pending?publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.equal(0);
			done();
		});
	});

	it('using valid public key should be ok', function (done) {
		http.get('/api/multisignatures/pending?publicKey=' + multisigAccount.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.be.at.least(1);

			var flag = 0;
			for (var i = 0; i < res.body.transactions.length; i++) {
				flag += 1;

				var pending = res.body.transactions[i];

				node.expect(pending).to.have.property('max').that.is.equal(0);
				node.expect(pending).to.have.property('min').that.is.equal(0);
				node.expect(pending).to.have.property('lifetime').that.is.equal(0);
				node.expect(pending).to.have.property('signed').that.is.true;

				node.expect(pending.transaction).to.have.property('type').that.is.equal(node.txTypes.MULTI);
				node.expect(pending.transaction).to.have.property('amount').that.is.equal(0);
				node.expect(pending.transaction).to.have.property('senderPublicKey').that.is.equal(multisigAccount.publicKey);
				node.expect(pending.transaction).to.have.property('timestamp').that.is.a('number');
				node.expect(pending.transaction).to.have.property('asset').that.is.an('object');
				node.expect(pending.transaction.asset).to.have.property('multisignature').that.is.an('object');
				node.expect(pending.transaction.asset.multisignature).to.have.property('min').that.is.a('number');
				node.expect(pending.transaction.asset.multisignature).to.have.property('keysgroup').that.is.an('array');
				node.expect(pending.transaction.asset.multisignature).to.have.property('lifetime').that.is.a('number');
				node.expect(pending.transaction).to.have.property('signature').that.is.a('string');
				node.expect(pending.transaction).to.have.property('id').that.is.equal(multisigTransaction.id);
				node.expect(pending.transaction).to.have.property('fee').that.is.equal(node.fees.multisignatureRegistrationFee * (keysGroup.length + 1));
				node.expect(pending.transaction).to.have.property('senderId').that.is.eql(multisigAccount.address);
				node.expect(pending.transaction).to.have.property('receivedAt').that.is.a('string');
			}

			node.expect(flag).to.equal(1);
			done();
		});
	});
});

describe('POST signatures/sign (regular account)', function () {

	var transaction;

	before(function (done) {
		transaction = node.lisk.transaction.createTransaction(accounts[0].address, 1, node.gAccount.password);
		sendTransaction(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactionId').that.is.not.empty;
			transaction.id = res.transactionId;
			done();
		});
	});

	it('should be impossible to sign the transaction', function (done) {
		node.onNewBlock(function (err) {
			http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction');
				node.expect(res.body.transaction).to.have.property('id').to.equal(transaction.id);
				var signature = node.lisk.multisignature.signTransaction(transaction, multisigAccount.password);
				sendSignature(signature, transaction, function (err, res) {
					node.expect(err).not.to.be.empty;
					done();
				});
			});
		});
	});

	it('should have no pending multisignatures', function (done) {
		http.get('/api/multisignatures/pending?publicKey=' + accounts[0].publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.equal(0);
			done();
		});
	});
});
