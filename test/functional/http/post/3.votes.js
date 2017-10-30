'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var registerDelegatePromise = require('../../../common/apiHelpers').registerDelegatePromise;
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
		var promises = [];
		promises.push(creditAccountPromise(delegateAccount.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(accountMinimalFunds.address, constants.fees.vote));
		promises.push(creditAccountPromise(node.eAccount.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(accountMaxVotesPerTransaction.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(accountMaxVotesPerAccount.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(accountDuplicates.address, constants.fees.vote * 4));

		return node.Promise.all(promises)
			.then(function (res) {
				res.forEach(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					node.expect(result).to.have.property('transactionId').that.is.not.empty;
					transactionsToWaitFor.push(result.transactionId);
				});
			})
			.then(function (res) {
				var promisesCreditsMaxVotesPerTransaction = [];
				for (var i = 0; i < constants.maxVotesPerTransaction; i++) {
					var tempAccount = node.randomAccount();
					delegatesMaxVotesPerTransaction.push(tempAccount);
					promisesCreditsMaxVotesPerTransaction.push(creditAccountPromise(tempAccount.address, constants.fees.delegate));
				};

				return node.Promise.all(promisesCreditsMaxVotesPerTransaction).then(function (results) {
					results.forEach(function (result) {
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('transactionId').that.is.not.empty;
						transactionsToWaitFor.push(result.transactionId);
					});
				});
			})
			.then(function (res) {
				var promisesCreditsMaxVotesPerAccount = [];
				for (var i = 0; i < constants.activeDelegates; i++) {
					var tempAccount = node.randomAccount();
					delegatesMaxVotesPerAccount.push(tempAccount);
					promisesCreditsMaxVotesPerAccount.push(creditAccountPromise(tempAccount.address, constants.fees.delegate));
				};

				return node.Promise.all(promisesCreditsMaxVotesPerAccount).then(function (results) {
					results.forEach(function (result) {
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('transactionId').that.is.not.empty;
						transactionsToWaitFor.push(result.transactionId);
					});
				});
			})
			.then(function (res) {
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function (res) {
				transactionsToWaitFor = [];
				return registerDelegatePromise(delegateAccount).then(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					node.expect(result).to.have.property('transactionId').that.is.not.empty;
					transactionsToWaitFor.push(result.transactionId);
				});
			})
			.then(function (res) {
				var promisesDelegatesMaxVotesPerTransaction = [];
				for (var i = 0; i < constants.maxVotesPerTransaction; i++) {
					promisesDelegatesMaxVotesPerTransaction.push(registerDelegatePromise(delegatesMaxVotesPerTransaction[i]));
				};

				return node.Promise.all(promisesDelegatesMaxVotesPerTransaction).then(function (results) {
					results.forEach(function (result) {
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('transactionId').that.is.not.empty;
						transactionsToWaitFor.push(result.transactionId);
					});
				});
			})
			.then(function (res) {
				var promisesDelegatesMaxVotesPerAccount = [];
				for (var i = 0; i < constants.activeDelegates; i++) {
					promisesDelegatesMaxVotesPerAccount.push(registerDelegatePromise(delegatesMaxVotesPerAccount[i]));
				};

				return node.Promise.all(promisesDelegatesMaxVotesPerAccount).then(function (results) {
					results.forEach(function (result) {
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('transactionId').that.is.not.empty;
						transactionsToWaitFor.push(result.transactionId);
					});
				});
			})
			.then(function (res) {
				return waitForConfirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		shared.invalidAssets(delegateAccount, 'votes', badTransactions);
	});

	describe('transactions processing', function () {

		it('using with invalid publicKey should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['+L' + node.eAccount.publicKey.slice(0, -1)]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using with invalid vote length (1 extra character) should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-1' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote length');
				badTransactions.push(transaction);
			});
		});

		it('using invalid vote operator "x" should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['x' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using no vote operator should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, [node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using a null publicKey inside votes should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, [null]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote type');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with no funds should fail', function () {
			accountNoFunds = node.randomAccount();
			transaction = node.lisk.vote.createVote(accountNoFunds.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with minimal required amount of funds should be ok', function () {
			transaction = node.lisk.vote.createVote(accountMinimalFunds.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('downvoting not voted delegate should fail', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Failed to remove vote, delegate "' + node.eAccount.delegateName + '" was not voted for');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with valid params should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('self upvoting with valid params should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['+' + delegateAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('upvoting ' + constants.maxVotesPerTransaction + ' delegates (maximum votes per transaction) at once should be ok', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerTransaction.password, delegatesMaxVotesPerTransaction.map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('upvoting ' + (constants.maxVotesPerTransaction + 1) + ' delegates (maximum votes per transaction + 1) at once should fail', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(0, constants.maxVotesPerTransaction + 1).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate vote schema: Array is too long (34), maximum 33');
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
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('transactionId');
					});
					goodTransactions.push(transaction1, transaction2, transaction3, transaction4);
				});
		});
	});

	describe('unconfirmed state', function () {

		it('upvoting with valid params and duplicate submission should be ok and only last transaction to arrive will be confirmed', function () {
			transaction = node.lisk.vote.createVote(accountDuplicates.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					badTransactions.push(transaction);
				})
				.then(function (res) {
					// Transaction with same info but different ID (due to timeOffSet parameter)
					transaction = node.lisk.vote.createVote(accountDuplicates.password, ['+' + node.eAccount.publicKey], null, 1);

					return sendTransactionPromise(transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactions.push(transaction);
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
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Failed to add vote, delegate "' + node.eAccount.delegateName + '" already voted for');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting voted delegate should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('self downvoting should be ok', function () {
			transaction = node.lisk.vote.createVote(delegateAccount.password, ['-' + delegateAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('exceeding maximum of ' + constants.activeDelegates + ' votes (number of actived delegates + 1) should fail', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Maximum number of ' + constants.activeDelegates + ' votes exceeded (1 too many)');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting ' + constants.maxVotesPerTransaction + ' delegates (maximum votes per transaction) at once should be ok', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerTransaction.password, delegatesMaxVotesPerTransaction.map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting ' + (constants.maxVotesPerTransaction + 1) + ' delegates (maximum votes per transaction + 1) at once should fail', function () {
			transaction = node.lisk.vote.createVote(accountMaxVotesPerAccount.password, delegatesMaxVotesPerAccount.slice(0, 34).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate vote schema: Array is too long ('+ (constants.maxVotesPerTransaction + 1) + '), maximum ' + constants.maxVotesPerTransaction);
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
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('transactionId');
					});
					goodTransactionsEnforcement.push(transaction1, transaction2, transaction3, transaction4);
				});
		});
	});

	describe('unconfirmed state after validation', function () {

		it('downvoting with valid params and duplicate submission should be ok and only last transaction to arrive will be confirmed', function () {
			transaction = node.lisk.vote.createVote(accountDuplicates.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					badTransactionsEnforcement.push(transaction);
				})
				.then(function (res) {
					// Transaction with same info but different ID (due to timeOffSet parameter)
					transaction = node.lisk.vote.createVote(accountDuplicates.password, ['-' + node.eAccount.publicKey], null, 1);

					return sendTransactionPromise(transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactionsEnforcement.push(transaction);
				});
		});
	});

	describe('confirm validation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
