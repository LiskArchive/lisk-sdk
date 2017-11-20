'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('POST /api/transactions (type 1) register second secret', function () {

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = node.randomAccount();
	var accountNoFunds = node.randomAccount();
	var accountMinimalFunds = node.randomAccount();
	var accountNoSecondPassword = node.randomAccount();
	var accountDuplicate = node.randomAccount();

	// Crediting accounts
	before(function () {
		var transaction1 = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction2 = node.lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.secondSignature, node.gAccount.password);
		var transaction3 = node.lisk.transaction.createTransaction(accountNoSecondPassword.address, constants.fees.secondSignature, node.gAccount.password);
		var transaction4 = node.lisk.transaction.createTransaction(accountDuplicate.address, constants.fees.secondSignature, node.gAccount.password);

		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		promises.push(sendTransactionPromise(transaction3));
		promises.push(sendTransactionPromise(transaction4));

		return node.Promise.all(promises)
			.then(function (results) {
				results.forEach(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id, transaction3.id, transaction4.id);
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, node.guestbookDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
				node.guestbookDapp.transactionId = transaction.id;

				transactionsToWaitFor.push(transaction.id);
				return waitForConfirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		shared.invalidAssets('signature', badTransactions);
	});

	describe('transactions processing', function () {

		it('using second passphrase on a fresh account should fail', function () {
			transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, accountNoSecondPassword.password, accountNoSecondPassword.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
				badTransactions.push(transaction);
			});
		});

		it('with no funds should fail', function () {
			transaction = node.lisk.signature.createSignature(accountNoFunds.password, accountNoFunds.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', function () {
			transaction = node.lisk.signature.createSignature(accountMinimalFunds.password, accountMinimalFunds.secondPassword, -1);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', function () {
			transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('unconfirmed state', function () {

		describe('type 0 - sending funds', function () {

			it('using second signature with an account that has a pending second passphrase registration should fail', function () {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 1 - second secret', function () {

			it('with valid params and duplicate submission should be ok and only last transaction to arrive should be confirmed', function () {
				transaction = node.lisk.signature.createSignature(accountDuplicate.password, 'secondpassword');

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					badTransactions.push(transaction);

					transaction = node.lisk.signature.createSignature(accountDuplicate.password, accountDuplicate.secondPassword);

					return sendTransactionPromise(transaction).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
						goodTransactions.push(transaction);
					});
				});
			});
		});

		describe('type 2 - registering delegate', function () {

			it('using second signature with an account that has a pending second passphrase registration should fail', function () {
				transaction = node.lisk.delegate.createDelegate(account.password, account.username, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 3 - voting delegate', function () {

			it('using second signature with an account that has a pending second passphrase registration should fail', function () {
				transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey], account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 4 - registering multisignature account', function () {

			it('using second signature with an account that has a pending second passphrase registration should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 5 - registering dapp', function () {

			it('using second signature with an account that has a pending second passphrase registration should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, account.secondPassword, node.randomApplication());

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 6 - inTransfer', function () {

			it('using second signature with an account that has a pending second passphrase registration should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(node.guestbookDapp.transactionId, 10 * node.normalizer, account.password, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 7 - outTransfer', function () {

			it('using second signature with an account that has a pending second passphrase registration should fail', function () {
				transaction = node.lisk.transfer.createOutTransfer(node.guestbookDapp.transactionId, node.randomTransaction().id, node.randomAccount().address, 10 * node.normalizer, account.password, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});
	});	

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
