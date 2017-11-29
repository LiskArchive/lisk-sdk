'use strict';

require('../../functional.js');

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('POST /api/transactions (type 3) votes', function () {

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];

	var delegateAccount = node.randomAccount();
	var accountNoFunds = node.randomAccount();
	var accountMinimalFunds = node.randomAccount();
	var accountDuplicates = node.randomAccount();

	/*
	Creating two scenarios with two isolated set of accounts

	• First scenario - MaxVotesPerTransaction
		We register the exact amount of delegates the networks allows to be voted per transaction.
		A new fresh account is credited to perform the voting tests to those delegates.

	• Second scenario - MaxVotesPerAccount
		In this case, we create as many delegates as the network allows to be active. This parameter
		is directly related to the maximum number of allowed votes per account. Another independent
		account is credited and performs tests uniquely to delegates from this scenario.
	*/
	
	// First Scenario
	var accountMaxVotesPerTransaction = node.randomAccount();
	var delegatesMaxVotesPerTransaction = [];
	// Second Scenario
	var accountMaxVotesPerAccount = node.randomAccount();
	var delegatesMaxVotesPerAccount = [];

	before(function () {
		var transactions = [];
		var transaction1 = node.lisk.transaction.createTransaction(delegateAccount.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction2 = node.lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.vote, node.gAccount.password);
		var transaction3 = node.lisk.transaction.createTransaction(node.eAccount.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction4 = node.lisk.transaction.createTransaction(accountMaxVotesPerTransaction.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction5 = node.lisk.transaction.createTransaction(accountMaxVotesPerAccount.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction6 = node.lisk.transaction.createTransaction(accountDuplicates.address, constants.fees.vote * 4, node.gAccount.password);
		transactions.push(transaction1, transaction2, transaction4, transaction4, transaction5, transaction6);

		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		promises.push(sendTransactionPromise(transaction3));
		promises.push(sendTransactionPromise(transaction4));
		promises.push(sendTransactionPromise(transaction5));
		promises.push(sendTransactionPromise(transaction6));

		return node.Promise.all(promises)
			.then(function (res) {
				res.forEach(function (result, index) {
					node.expect(result).to.have.property('status').to.equal(200);
					node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					transactionsToWaitFor.push(transactions[index].id);
				});

				var transactionsCreditMaxVotesPerTransaction = [];
				var promisesCreditsMaxVotesPerTransaction = [];
				for (var i = 0; i < constants.maxVotesPerTransaction; i++) {
					var tempAccount = node.randomAccount();
					delegatesMaxVotesPerTransaction.push(tempAccount);
					var transaction = node.lisk.transaction.createTransaction(tempAccount.address, constants.fees.delegate, node.gAccount.password);
					transactionsCreditMaxVotesPerTransaction.push(transaction);
					promisesCreditsMaxVotesPerTransaction.push(sendTransactionPromise(transaction));
				};

				return node.Promise.all(promisesCreditsMaxVotesPerTransaction).then(function (results) {
					results.forEach(function (result, index) {
						node.expect(result).to.have.property('status').to.equal(200);
						node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
						transactionsToWaitFor.push(transactionsCreditMaxVotesPerTransaction[index].id);
					});
				});
			})
			.then(function (res) {
				var transactionsCreditMaxVotesPerAccount = [];
				var promisesCreditsMaxVotesPerAccount = [];
				for (var i = 0; i < constants.activeDelegates; i++) {
					var tempAccount = node.randomAccount();
					delegatesMaxVotesPerAccount.push(tempAccount);
					var transaction = node.lisk.transaction.createTransaction(tempAccount.address, constants.fees.delegate, node.gAccount.password);
					transactionsCreditMaxVotesPerAccount.push(transaction);
					promisesCreditsMaxVotesPerAccount.push(sendTransactionPromise(transaction));
				};

				return node.Promise.all(promisesCreditsMaxVotesPerAccount).then(function (results) {
					results.forEach(function (result, index) {
						node.expect(result).to.have.property('status').to.equal(200);
						node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
						transactionsToWaitFor.push(transactionsCreditMaxVotesPerAccount[index].id);
					});
				});
			})
			.then(function (res) {
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function (res) {
				transactionsToWaitFor = [];
				var transaction = node.lisk.delegate.createDelegate(delegateAccount.password, delegateAccount.username);
				return sendTransactionPromise(transaction).then(function (result) {
					node.expect(result).to.have.property('status').to.equal(200);
					node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					transactionsToWaitFor.push(transaction.id);
				});
			})
			.then(function (res) {
				var promisesDelegatesMaxVotesPerTransaction = [];
				var transactionsDelegateMaxForPerTransaction = [];
				for (var i = 0; i < constants.maxVotesPerTransaction; i++) {
					var transaction = node.lisk.delegate.createDelegate(delegatesMaxVotesPerTransaction[i].password, delegatesMaxVotesPerTransaction[i].username);
					transactionsDelegateMaxForPerTransaction.push(transaction);
					promisesDelegatesMaxVotesPerTransaction.push(sendTransactionPromise(transaction));
				};

				return node.Promise.all(promisesDelegatesMaxVotesPerTransaction).then(function (results) {
					results.forEach(function (result, index) {
						node.expect(result).to.have.property('status').to.equal(200);
						node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
						transactionsToWaitFor.push(transactionsDelegateMaxForPerTransaction[index].id);
					});
				});
			})
			.then(function (res) {
				var transactionsDelegateMaxVotesPerAccount = [];
				var promisesDelegatesMaxVotesPerAccount = [];
				for (var i = 0; i < constants.activeDelegates; i++) {
					var transaction = node.lisk.delegate.createDelegate(delegatesMaxVotesPerAccount[i].password, delegatesMaxVotesPerAccount[i].username);
					transactionsDelegateMaxVotesPerAccount.push(transaction);
					promisesDelegatesMaxVotesPerAccount.push(sendTransactionPromise(transaction));
				};

				return node.Promise.all(promisesDelegatesMaxVotesPerAccount).then(function (results) {
					results.forEach(function (result, index) {
						node.expect(result).to.have.property('status').to.equal(200);
						node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
						transactionsToWaitFor.push(transactionsDelegateMaxVotesPerAccount[index].id);
					});
				});
			})
			.then(function (res) {
				return waitForConfirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		shared.invalidAssets('votes', badTransactions);
	});

	describe('transactions processing', function () {

		it('using with invalid publicKey should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['+L' + node.eAccount.publicKey.slice(0, -1)]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using with invalid vote length (1 extra character) should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-1' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid vote at index 0 - Invalid vote length');
				badTransactions.push(transaction);
			});
		});

		it('using invalid vote operator "x" should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['x' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using no vote operator should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, [node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using a null publicKey inside votes should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, [null]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid vote at index 0 - Invalid vote type');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with no funds should fail', function () {
			accountNoFunds = node.randomAccount();
			transaction = node.lisk.vote.createVote(accountNoFunds.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with minimal required amount of funds should be ok', function () {
			transaction = node.lisk.vote.createVote(accountMinimalFunds.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('downvoting not voted delegate should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Failed to remove vote, delegate "' + node.eAccount.delegateName + '" was not voted for');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with valid params should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('self upvoting with valid params should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['+' + delegateAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('upvoting ' + constants.maxVotesPerTransaction + ' delegates (maximum votes per transaction) at once should be ok', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerTransaction.password, delegatesMaxVotesPerTransaction.map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('upvoting ' + (constants.maxVotesPerTransaction + 1) + ' delegates (maximum votes per transaction + 1) at once should fail', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(0, constants.maxVotesPerTransaction + 1).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate vote schema: Array is too long (34), maximum 33');
				badTransactions.push(transaction);
			});
		});

		it('upvoting ' + constants.activeDelegates + ' delegates (number of actived delegates) separately should be ok', function () {
			var transaction1 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(0, 33).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));
			var transaction2 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(33, 66).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));
			var transaction3 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(66, 99).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));
			var transaction4 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(99, 102).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			var promises = [];
			promises.push(sendTransactionPromise(transaction1));
			promises.push(sendTransactionPromise(transaction2));
			promises.push(sendTransactionPromise(transaction3));
			promises.push(sendTransactionPromise(transaction4));

			return node.Promise.all(promises)
				.then(function (res) {
					res.forEach(function (result) {
						node.expect(result).to.have.property('status').to.equal(200);
						node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					});
					goodTransactions.push(transaction1, transaction2, transaction3, transaction4);
				});
		});
	});

	describe('unconfirmed state', function () {

		it('upvoting with valid params and duplicate submission should be ok and only last transaction to arrive should be confirmed', function () {
			transaction = node.lisk.vote.createVote(accountDuplicates.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// badTransactions.push(transaction);
				})
				.then(function (res) {
					// Transaction with same info but different ID (due to timeOffSet parameter)
					transaction = node.lisk.vote.createVote(accountDuplicates.password, ['+' + node.eAccount.publicKey], null, 1);

					return sendTransactionPromise(transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('upvoting same delegate twice should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Failed to add vote, delegate "' + node.eAccount.delegateName + '" already voted for');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting voted delegate should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('self downvoting should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-' + delegateAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('exceeding maximum of ' + constants.activeDelegates + ' votes (number of actived delegates + 1) should fail', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Maximum number of ' + constants.activeDelegates + ' votes exceeded (1 too many)');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting ' + constants.maxVotesPerTransaction + ' delegates (maximum votes per transaction) at once should be ok', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerTransaction.password, delegatesMaxVotesPerTransaction.map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting ' + (constants.maxVotesPerTransaction + 1) + ' delegates (maximum votes per transaction + 1) at once should fail', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(0, 34).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate vote schema: Array is too long ('+ (constants.maxVotesPerTransaction + 1) + '), maximum ' + constants.maxVotesPerTransaction);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting ' + constants.activeDelegates + ' delegates (number of actived delegates) separately should be ok', function () {
			var transaction1 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(0, 33).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));
			var transaction2 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(33, 66).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));
			var transaction3 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(66, 99).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));
			var transaction4 = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(99, 102).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			var promises = [];
			promises.push(sendTransactionPromise(transaction1));
			promises.push(sendTransactionPromise(transaction2));
			promises.push(sendTransactionPromise(transaction3));
			promises.push(sendTransactionPromise(transaction4));

			return node.Promise.all(promises)
				.then(function (res) {
					res.forEach(function (result) {
						node.expect(result).to.have.property('status').to.equal(200);
						node.expect(result).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					});
					goodTransactionsEnforcement.push(transaction1, transaction2, transaction3, transaction4);
				});
		});
	});

	describe('unconfirmed state after validation', function () {

		it('downvoting with valid params and duplicate submission should be ok and only last transaction to arrive should be confirmed', function () {
			transaction = node.lisk.vote.createVote(accountDuplicates.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// badTransactionsEnforcement.push(transaction);
				})
				.then(function (res) {
					// Transaction with same info but different ID (due to timeOffSet parameter)
					transaction = node.lisk.vote.createVote(accountDuplicates.password, ['-' + node.eAccount.publicKey], null, 1);

					return sendTransactionPromise(transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// goodTransactionsEnforcement.push(transaction);
				});
		});
	});

	describe('confirm validation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
