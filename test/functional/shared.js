'use strict';

var node = require('../node');
var utils = require('../common/utils');
var typesRepresentatives = require('../common/typesRepresentatives');

var sendTransactionPromise = require('../common/apiHelpers').sendTransactionPromise;
var getTransactionsPromise = require('../common/apiHelpers').getTransactionsPromise;
var getUnconfirmedTransactionPromise = require('../common/apiHelpers').getUnconfirmedTransactionPromise;
var getPendingMultisignaturesPromise = require('../common/apiHelpers').getPendingMultisignaturesPromise;
var waitForConfirmations = require('../common/apiHelpers').waitForConfirmations;

var guestbookDapp = utils.random.randomApplication();

function confirmationPhase (goodTransactions, badTransactions, pendingMultisignatures) {

	describe('after transactions get confirmed', function () {

		before(function () {
			var transactionToWaitFor = goodTransactions.map(function (transaction) {
				return [transaction.id];
			});
			return waitForConfirmations(transactionToWaitFor);
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
				transaction = node.lisk.signature.createSignature(utils.accounts.gAccount.password, utils.random.randomPassword());
				break;
			case 'delegate':
				transaction = node.lisk.delegate.createDelegate(utils.accounts.gAccount.password, utils.random.randomDelegateName());
				break;
			case 'votes':
				transaction = node.lisk.vote.createVote(utils.accounts.gAccount.password, []);
				break;
			case 'multisignature':
				transaction = node.lisk.multisignature.createMultisignature(utils.accounts.gAccount.password, null, ['+' + utils.accounts.eAccount.publicKey], 1, 2);
				break;
			case 'dapp':
				transaction = node.lisk.dapp.createDapp(utils.accounts.gAccount.password, null, guestbookDapp);
				break;
			case 'inTransfer':
				transaction = node.lisk.transfer.createInTransfer(guestbookDapp.id, Date.now(), utils.accounts.gAccount.password);
				break;
			case 'outTransfer':
				transaction = node.lisk.transfer.createOutTransfer(guestbookDapp.id, utils.random.randomTransaction().id, utils.accounts.gAccount.address, Date.now(), utils.accounts.gAccount.password);
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

function MultisigScenario (size, amount) {
	this.account = utils.random.randomAccount();
	this.members = [];
	this.keysgroup = [];

	var i, auxAccount;
	for (i = 0; i < size - 1; i++) {
		auxAccount = utils.random.randomAccount();
		this.members.push(auxAccount);
		this.keysgroup.push('+' + auxAccount.publicKey);
	}

	this.amount = amount || 100000000000;
}

module.exports = {
	confirmationPhase: confirmationPhase,
	invalidAssets: invalidAssets,
	MultisigScenario: MultisigScenario
};
