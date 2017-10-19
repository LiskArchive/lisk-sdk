'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var registerDelegatePromise = require('../../../common/apiHelpers').registerDelegatePromise;
var waitForBlocksPromise = node.Promise.promisify(node.waitForBlocks);

describe('POST /api/transactions (type 3) votes', function () {

	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];

	var account = node.randomAccount();
	var accountNoFunds = node.randomAccount();
	var accountMinimalFunds = node.randomAccount();
	var accountDuplicate = node.randomAccount();

	var account33 = node.randomAccount();
	var delegates33 = [];

	var account101 = node.randomAccount();
	var delegates101 = [];

	var transaction;

	before(function () {
		// Crediting accounts and registering delegates
		var promises = [];
		promises.push(creditAccountPromise(account.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(accountMinimalFunds.address, constants.fees.vote));
		promises.push(creditAccountPromise(node.eAccount.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(account33.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(account101.address, 1000 * node.normalizer));
		promises.push(creditAccountPromise(accountDuplicate.address, constants.fees.vote * 2));

		return node.Promise.all(promises).then(function (results) {
			results.forEach(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
			});
		})
			.then(function (res) {
				var promisesCredits33 = [];
				for (var i = 0; i < 33; i++) {
					var accounts33 = node.randomAccount();
					delegates33.push(accounts33);
					promisesCredits33.push(creditAccountPromise(accounts33.address, constants.fees.delegate));
				};

				return node.Promise.all(promisesCredits33).then(function (results) {
					results.forEach(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transactionId').that.is.not.empty;
					});
				});
			})
			.then(function (res) {
				var promisesCredits101 = [];
				for (var i = 0; i < 101; i++) {
					var accounts101 = node.randomAccount();
					delegates101.push(accounts101);
					promisesCredits101.push(creditAccountPromise(accounts101.address, constants.fees.delegate));
				};

				return node.Promise.all(promisesCredits101).then(function (results) {
					results.forEach(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transactionId').that.is.not.empty;
					});
				});
			})
			.then(function (res) {
				return waitForBlocksPromise(7);
			})
			.then(function (res) {
				var promisesDelegates33 = [];
				for (var i = 0; i < 33; i++) {
					promisesDelegates33.push(registerDelegatePromise(delegates33[i]));
				};

				return node.Promise.all(promisesDelegates33).then(function (results) {
					results.forEach(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transactionId').that.is.not.empty;
					});
				});
			})
			.then(function (res) {
				var promisesDelegates101 = [];
				for (var i = 0; i < 101; i++) {
					promisesDelegates101.push(registerDelegatePromise(delegates101[i]));
				};

				return node.Promise.all(promisesDelegates101).then(function (results) {
					results.forEach(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transactionId').that.is.not.empty;
					});
				});
			})
			.then(function (res) {
				return waitForBlocksPromise(7);
			});
	});

	describe('schema validations', function () {

		shared.invalidAssets(account, 'votes', badTransactions);
	});

	describe('transactions processing', function () {

		it('upvoting with manipulated vote should fail', function () {
			transaction = node.lisk.vote.createVote(account.password, ['++' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote length');
				badTransactions.push(transaction);
			});
		});

		it('downvoting with manipulated vote should fail', function () {
			transaction = node.lisk.vote.createVote(account.password, ['--' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote length');
				badTransactions.push(transaction);
			});
		});

		it('using invalid vote operator should fail', function () {
			transaction = node.lisk.vote.createVote(account.password, ['x' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using no vote operator should fail', function () {
			transaction = node.lisk.vote.createVote(account.password, [node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote format');
				badTransactions.push(transaction);
			});
		});

		it('using a null publicKey inside votes should fail', function () {
			transaction = node.lisk.vote.createVote(account.password, [null]);

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
			transaction = node.lisk.vote.createVote(account.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Failed to remove vote, account has not voted for this delegate');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with valid params should be ok', function () {
			transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('self upvoting with valid params should be ok', function () {
			transaction = node.lisk.vote.createVote(node.eAccount.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('upvoting 33 delegates at once should be ok', function () {
			transaction = node.lisk.vote.createVote(account33.password, delegates33.map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('upvoting 34 delegates at once should fail', function () {
			transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(0, 34).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate vote schema: Array is too long (34), maximum 33');
				badTransactions.push(transaction);
			});
		});

		it('upvoting 101 delegates separately should be ok', function () {
			transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(0, 33).map(function (delegate) {
				return '+' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);

				transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(33, 66).map(function (delegate) {
					return '+' + delegate.publicKey;
				}));

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactions.push(transaction);

					transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(66, 99).map(function (delegate) {
						return '+' + delegate.publicKey;
					}));

					return sendTransactionPromise(transaction).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
						goodTransactions.push(transaction);

						transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(99, 102).map(function (delegate) {
							return '+' + delegate.publicKey;
						}));

						return sendTransactionPromise(transaction).then(function (res) {
							node.expect(res).to.have.property('success').to.be.ok;
							node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
							goodTransactions.push(transaction);
						});
					});
				});
			});
		});
	});

	describe('unconfirmed state', function () {

		it('upvoting with valid params and duplicate submission should be ok but just last transaction will be confirmed', function () {
			transaction = node.lisk.vote.createVote(accountDuplicate.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				badTransactions.push(transaction);

				// Transaction with same info but different ID (due to timeOffSet parameter)
				transaction = node.lisk.vote.createVote(accountDuplicate.password, ['+' + node.eAccount.publicKey], null, 1);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactions.push(transaction);
				});
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('upvoting same delegate twice should fail', function () {
			transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Failed to add vote, account has already voted for this delegate');
				badTransactions.push(transaction);
			});
		});

		it('downvoting voted delegate should be ok', function () {
			transaction = node.lisk.vote.createVote(account.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('self upvoting twice should fail', function () {
			transaction = node.lisk.vote.createVote(node.eAccount.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Failed to add vote, account has already voted for this delegate');
				badTransactions.push(transaction);
			});
		});

		it('self downvoting should be ok', function () {
			transaction = node.lisk.vote.createVote(node.eAccount.password, ['-' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('exceeding maximum of 101 votes should fail', function () {
			transaction = node.lisk.vote.createVote(account101.password, ['+' + node.eAccount.publicKey]);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Maximum number of 101 votes exceeded (1 too many)');
				badTransactions.push(transaction);
			});
		});

		it('downvoting 33 delegates at once should be ok', function () {
			transaction = node.lisk.vote.createVote(account33.password, delegates33.map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('downvoting 34 delegates at once should fail', function () {
			transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(0, 34).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate vote schema: Array is too long (34), maximum 33');
				badTransactions.push(transaction);
			});
		});

		it('downvoting 101 delegates separately should be ok', function () {
			transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(0, 33).map(function (delegate) {
				return '-' + delegate.publicKey;
			}));

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);

				transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(33, 66).map(function (delegate) {
					return '-' + delegate.publicKey;
				}));

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactions.push(transaction);

					transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(66, 99).map(function (delegate) {
						return '-' + delegate.publicKey;
					}));

					return sendTransactionPromise(transaction).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
						goodTransactions.push(transaction);

						transaction = node.lisk.vote.createVote(account101.password, delegates101.slice(99, 102).map(function (delegate) {
							return '-' + delegate.publicKey;
						}));

						return sendTransactionPromise(transaction).then(function (res) {
							node.expect(res).to.have.property('success').to.be.ok;
							node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
							goodTransactions.push(transaction);
						});
					});
				});
			});
		});
	});

	describe('confirm validation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
