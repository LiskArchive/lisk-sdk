'use strict';

var lisk = require('lisk-js');
var expect = require('chai').expect;
var Promise = require('bluebird');

var test = require('../test');
var _ = test._;
var typesRepresentatives = require('../fixtures/typesRepresentatives');
var accountFixtures = require('../fixtures/accounts');

var apiHelpers = require('../common/apiHelpers');
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var getTransactionsPromise = apiHelpers.getTransactionsPromise;
var getUnconfirmedTransactionPromise = apiHelpers.getUnconfirmedTransactionPromise;
var getPendingMultisignaturesPromise = apiHelpers.getPendingMultisignaturesPromise;
var waitForConfirmations = apiHelpers.waitForConfirmations;

var randomUtil = require('../common/utils/random');

function confirmationPhase (goodTransactions, badTransactions, pendingMultisignatures) {

	describe('after transactions get confirmed', function () {

		before(function () {
			return waitForConfirmations(_.map(goodTransactions, 'id'));
		});

		it('bad transactions should not be confirmed', function () {
			return Promise.map(badTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return getTransactionsPromise(params).then(function (res) {
					expect(res).to.have.property('status').to.equal(200);
					expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(0);
				});
			});
		});

		it('good transactions should not be unconfirmed', function () {
			return Promise.map(goodTransactions, function (transaction) {
				return getUnconfirmedTransactionPromise(transaction.id).then(function (res) {
					expect(res).to.have.property('success').to.be.not.ok;
					expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return Promise.map(goodTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return getTransactionsPromise(params).then(function (res) {
					expect(res).to.have.property('status').to.equal(200);
					expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(1);
				});
			});
		});

		if (pendingMultisignatures) {
			it('pendingMultisignatures should remain in the pending queue', function () {
				return Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'publicKey=' + transaction.senderPublicKey
					];

					return getPendingMultisignaturesPromise(params).then(function (res) {
						expect(res).to.have.property('success').to.be.ok;
						expect(res).to.have.property('transactions').to.be.an('array').to.have.lengthOf(1);
						expect(res.transactions[0]).to.have.property('transaction').to.have.property('id').to.equal(transaction.id);
					});
				});
			});

			it('pendingMultisignatures should not be confirmed', function () {
				return Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'id=' + transaction.id
					];
					return getTransactionsPromise(params).then(function (res) {
						expect(res).to.have.property('status').to.equal(200);
						expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(0);
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
				transaction = lisk.signature.createSignature(accountFixtures.genesis.password, randomUtil.password());
				break;
			case 'delegate':
				transaction = lisk.delegate.createDelegate(accountFixtures.genesis.password, randomUtil.delegateName());
				break;
			case 'votes':
				transaction = lisk.vote.createVote(accountFixtures.genesis.password, []);
				break;
			case 'multisignature':
				transaction = lisk.multisignature.createMultisignature(accountFixtures.genesis.password, null, ['+' + accountFixtures.existingDelegate.publicKey], 1, 2);
				break;
			case 'dapp':
				transaction = lisk.dapp.createDapp(accountFixtures.genesis.password, null, randomUtil.guestbookDapp);
				break;
			case 'inTransfer':
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), accountFixtures.genesis.password);
				break;
			case 'outTransfer':
				transaction = lisk.transfer.createOutTransfer(randomUtil.guestbookDapp.id, randomUtil.transaction().id, accountFixtures.genesis.address, Date.now(), accountFixtures.genesis.password);
				break;
		};
	});

	describe('using invalid asset values', function () {

		typesRepresentatives.allTypes.forEach(function (test) {
			it('using ' + test.description + ' should fail', function () {
				transaction.asset = test.input;

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res).to.have.property('status').to.equal(400);
					expect(res).to.have.nested.property('body.message').that.is.not.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset;

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').that.is.not.empty;
				badTransactions.push(transaction);
			});
		});
	});

	describe('using invalid asset.' + option + ' values', function () {

		typesRepresentatives.allTypes.forEach(function (test) {
			it('using ' + test.description + ' should fail', function () {
				transaction.asset[option] = test.input;

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res).to.have.property('status').to.equal(400);
					expect(res).to.have.nested.property('body.message').that.is.not.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset[option];

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').that.is.not.empty;
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

	this.multiSigTransaction = lisk.multisignature.createMultisignature(this.account.password, null, this.keysgroup, this.lifetime, this.min);
	this.creditTransaction = lisk.transaction.createTransaction(this.account.address, this.amount, accountFixtures.genesis.password);
	this.secondSignatureTransaction = lisk.signature.createSignature(this.account.password, this.account.secondPassword);
}

module.exports = {
	confirmationPhase: confirmationPhase,
	invalidAssets: invalidAssets,
	MultisigScenario: MultisigScenario
};
