'use strict';

var _ = require('lodash');

var node = require('../node');
var typesRepresentatives = require('../fixtures/typesRepresentatives');

var sendTransactionPromise = require('../common/apiHelpers').sendTransactionPromise;
var getTransactionsPromise = require('../common/apiHelpers').getTransactionsPromise;
var getUnconfirmedTransactionPromise = require('../common/apiHelpers').getUnconfirmedTransactionPromise;
var getPendingMultisignaturesPromise = require('../common/apiHelpers').getPendingMultisignaturesPromise;
var waitForConfirmations = require('../common/apiHelpers').waitForConfirmations;

var randomUtil = require('../common/utils/random');

function confirmationPhase (goodTransactions, badTransactions, pendingMultisignatures) {

	describe('after transactions get confirmed', function () {

		before(function () {
			return waitForConfirmations(_.map(goodTransactions, 'id'));
		});

		it('bad transactions should not be confirmed', function () {
			return node.Promise.map(badTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(0);
				});
			});
		});

		it('good transactions should not be unconfirmed', function () {
			return node.Promise.map(goodTransactions, function (transaction) {
				return getUnconfirmedTransactionPromise(transaction.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return node.Promise.map(goodTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(1);
				});
			});
		});

		if (pendingMultisignatures) {
			it('pendingMultisignatures should remain in the pending queue', function () {
				return node.Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'publicKey=' + transaction.senderPublicKey
					];

					return getPendingMultisignaturesPromise(params).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transactions').to.be.an('array').to.have.lengthOf(1);
						node.expect(res.transactions[0]).to.have.property('transaction').to.have.property('id').to.equal(transaction.id);
					});
				});
			});

			it('pendingMultisignatures should not be confirmed', function () {
				return node.Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'id=' + transaction.id
					];
					return getTransactionsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(0);
					});
				});
			});
		};
	});
};

function invalidAssets (option, badTransactions) {

	var transaction;

	beforeEach(function () {
		switch(option) {
			case 'signature':
				transaction = node.lisk.signature.createSignature(node.gAccount.password, randomUtil.password());
				break;
			case 'delegate':
				transaction = node.lisk.delegate.createDelegate(node.gAccount.password, randomUtil.delegateName());
				break;
			case 'votes':
				transaction = node.lisk.vote.createVote(node.gAccount.password, []);
				break;
			case 'multisignature':
				transaction = node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + node.eAccount.publicKey], 1, 2);
				break;
			case 'dapp':
				transaction = node.lisk.dapp.createDapp(node.gAccount.password, null, randomUtil.guestbookDapp);
				break;
			case 'inTransfer':
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), node.gAccount.password);
				break;
			case 'outTransfer':
				transaction = node.lisk.transfer.createOutTransfer(randomUtil.guestbookDapp.id, randomUtil.transaction().id, node.gAccount.address, Date.now(), node.gAccount.password);
				break;
		};
	});

	describe('using invalid asset values', function () {

		typesRepresentatives.allTypes.forEach(function (test) {
			it('using ' + test.description + ' should fail', function () {
				transaction.asset = test.input;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset;

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
				badTransactions.push(transaction);
			});
		});
	});

	describe('using invalid asset.' + option + ' values', function () {

		typesRepresentatives.allTypes.forEach(function (test) {
			it('using ' + test.description + ' should fail', function () {
				transaction.asset[option] = test.input;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset[option];

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
				badTransactions.push(transaction);
			});
		});
	});
}

function MultisigScenario (options) {
	if (!options) {
		var options = {};
	}

	this.account = randomUtil.account();
	this.members = [];
	this.keysgroup = [];

	if(!options.members) {
		options.members = 3;
	}
	var i, auxAccount;
	for (i = 0; i < options.members - 1; i++) {
		auxAccount = randomUtil.account();
		this.members.push(auxAccount);
		this.keysgroup.push('+' + auxAccount.publicKey);
	}

	this.min = options.min || options.members - 1;
	this.lifetime = options.lifetime || 1;
	this.amount = options.amount || 100000000000;

	this.multiSigTransaction = node.lisk.multisignature.createMultisignature(this.account.password, null, this.keysgroup, this.lifetime, this.min);
	this.creditTransaction = node.lisk.transaction.createTransaction(this.account.address, this.amount, node.gAccount.password);
	this.secondSignatureTransaction = node.lisk.signature.createSignature(this.account.password, this.account.secondPassword);
}

module.exports = {
	confirmationPhase: confirmationPhase,
	invalidAssets: invalidAssets,
	MultisigScenario: MultisigScenario
};
