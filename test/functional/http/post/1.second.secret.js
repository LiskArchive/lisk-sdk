'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendSignaturePromise = require('../../../common/apiHelpers').sendSignaturePromise;

var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);

describe('POST /api/transactions (type 1) register second secret', function () {

	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];
	var pendingMultisignatures = [];

	var account = node.randomAccount();
	var accountEmptySecondPassword = node.randomAccount();
	accountEmptySecondPassword.secondPassword = '';
	var accountNoFunds = node.randomAccount();
	var accountScarceFunds = node.randomAccount();
	var accountNoSecondPassword = node.randomAccount();

	var transaction, signature;

	// Crediting accounts
	before(function () {
		var promises = [];
		promises.push(creditAccountPromise(account.address, 100000000000));
		promises.push(creditAccountPromise(accountEmptySecondPassword.address, 100000000000));
		promises.push(creditAccountPromise(accountScarceFunds.address, constants.fees.secondsignature));
		promises.push(creditAccountPromise(accountNoSecondPassword.address, constants.fees.secondsignature));

		return node.Promise.all(promises).then(function (results) {
			results.forEach(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
			});
		}).then(function (res) {
			return onNewBlockPromise();
		});
	});

	describe('schema validations', function () {

		shared.invalidAssets(account, 'signature', badTransactions);
	});

	describe('transactions processing', function () {

		it('with no funds should fail', function () {
			transaction = node.lisk.signature.createSignature(accountNoFunds.password, accountNoFunds.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with exact funds should be ok', function () {
			transaction = node.lisk.signature.createSignature(accountScarceFunds.password, accountScarceFunds.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('with empty second passphrase transaction should be ok', function () {
			transaction = node.lisk.signature.createSignature(accountEmptySecondPassword.password, accountEmptySecondPassword.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok but not confirmed if sendind twice in a row', function () {
			transaction = node.lisk.signature.createSignature(account.password, 'secondpassword');

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				badTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', function () {
			transaction = node.lisk.signature.createSignature(account.password, account.secondPassword, 1);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});
	});

	describe('enforcement before confirmation', function () {

		describe('type 0 - sending funds', function () {

			it('using correct second passphrase should fail', function () {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 2 - registering delegate', function () {

			it('using correct second passphrase should fail', function () {
				transaction = node.lisk.delegate.createDelegate(account.password, account.username, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 3 - voting delegate', function () {

			it('using correct second passphrase should fail', function () {
				transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey], account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 4 - registering multisignature account', function () {

			it('using correct second passphrase should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type 5 - registering dapp', function () {

			it('using correct empty second passphrase should fail', function () {
				transaction = node.lisk.dapp.createDapp(accountEmptySecondPassword.password, accountEmptySecondPassword.secondPassword, node.randomApplication());

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Sender does not have a second signature');
					badTransactions.push(transaction);
				});
			});
		});
	});	

	describe('transactions confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('enforcement', function () {

		it('using second passphrase on a fresh account should fail', function () {
			transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, accountNoSecondPassword.password, accountNoSecondPassword.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Sender does not have a second signature');
				badTransactionsEnforcement.push(transaction);
			});
		});

		describe('type 0 - sending funds', function () {

			it('using no second passphrase should fail', function () {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Missing sender second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using invalid second passphrase should fail', function () {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password, 'invalid password');

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to verify second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct second passphrase should be ok', function () {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, account.password, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct empty second passphrase should be ok', function () {
				transaction = node.lisk.transaction.createTransaction(node.eAccount.address, 1, accountEmptySecondPassword.password, accountEmptySecondPassword.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});
		});

		describe('type 1 - second secret', function () {

			it('setting second signature twice on the same account should be not ok', function () {
				transaction = node.lisk.signature.createSignature(account.password, node.randomPassword());
				var secondKeys = node.lisk.crypto.getKeys(account.secondPassword);
				node.lisk.crypto.secondSign(transaction, secondKeys);
				transaction.id = node.lisk.crypto.getId(transaction);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Missing sender second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});
		});

		describe('type 2 - registering delegate', function () {

			it('using no second passphrase should fail', function () {
				transaction = node.lisk.delegate.createDelegate(account.password, account.username);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Missing sender second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using invalid second passphrase should fail', function () {
				transaction = node.lisk.delegate.createDelegate(account.password, account.username, 'invalid password');

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to verify second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct second passphrase should be ok', function () {
				transaction = node.lisk.delegate.createDelegate(account.password, account.username, account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct empty second passphrase should be ok', function () {
				transaction = node.lisk.delegate.createDelegate(accountEmptySecondPassword.password, accountEmptySecondPassword.username, accountEmptySecondPassword.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});
		});

		describe('type 3 - voting delegate', function () {

			it('using no second passphrase should fail', function () {
				transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey]);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Missing sender second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using invalid second passphrase should fail', function () {
				transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey], 'invalid password');

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to verify second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct second passphrase should be ok', function () {
				transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey], account.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct empty second passphrase should be ok', function () {
				transaction = node.lisk.vote.createVote(accountEmptySecondPassword.password, ['+' + node.eAccount.publicKey], accountEmptySecondPassword.secondPassword);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});
		});

		describe('type 4 - registering multisignature account', function () {

			it('using no second passphrase should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey, '+' + accountScarceFunds.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Missing sender second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using invalid second passphrase should fail', function () {
				transaction = node.lisk.multisignature.createMultisignature(account.password, 'wrong second password', ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey, '+' + accountScarceFunds.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to verify second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct empty second passphrase should be ok', function () {
				transaction = node.lisk.multisignature.createMultisignature(accountEmptySecondPassword.password, accountEmptySecondPassword.secondPassword, ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					pendingMultisignatures.push(transaction);
				});
			});

			it('using correct second passphrase should be ok', function () {
				transaction = node.lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + node.eAccount.publicKey, '+' + accountNoFunds.publicKey], 1, 2);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					pendingMultisignatures.push(transaction);
				});
			});

			describe('signing transactions', function () {

				it('with not all the signatures should be ok but never confirmed', function () {
					signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[0], accountNoFunds.password);

					return sendSignaturePromise(signature, pendingMultisignatures[0]).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
					});
				});

				// FIXME: affect severily when registering dapp with the same account
				it.skip('with all the signatures should be ok and confirmed (even with accounts without funds)', function () {
					signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[1], accountNoFunds.password);

					return sendSignaturePromise(signature, pendingMultisignatures[1]).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;

						signature = node.lisk.multisignature.signTransaction(pendingMultisignatures[1], node.eAccount.password);

						return sendSignaturePromise(signature, pendingMultisignatures[1]).then(function (res) {
							node.expect(res).to.have.property('success').to.be.ok;

							goodTransactionsEnforcement.push(pendingMultisignatures[1]);
							pendingMultisignatures.pop();
						});
					});
				});
			});
		});

		describe('type 5 - registering dapp', function () {

			it('using no second passphrase should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, node.randomApplication());

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Missing sender second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using invalid second passphrase should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, 'wrong second password', node.randomApplication());

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to verify second signature');
					badTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct empty second passphrase should be ok', function () {
				transaction = node.lisk.dapp.createDapp(accountEmptySecondPassword.password, accountEmptySecondPassword.secondPassword, node.randomApplication());

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});

			it('using correct second passphrase should be ok', function () {
				transaction = node.lisk.dapp.createDapp(account.password, account.secondPassword, node.randomApplication());

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
			});
		});
	});

	describe('enforcement confirmation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement, pendingMultisignatures);
	});
});
