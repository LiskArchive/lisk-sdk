/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

require('../../functional.js');
var lisk = require('lisk-js');
var Promise = require('bluebird');

var common = require('./common');
var phases = require('../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/wait_for');
var apiHelpers = require('../../../common/helpers/api');
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var errorCodes = require('../../../../helpers/api_codes');

describe('POST /api/transactions (type 3) votes', () => {
	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];

	var delegateAccount = randomUtil.account();
	var accountNoFunds = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();

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
	var accountMaxVotesPerTransaction = randomUtil.account();
	var delegatesMaxVotesPerTransaction = [];
	// Second Scenario
	var accountMaxVotesPerAccount = randomUtil.account();
	var delegatesMaxVotesPerAccount = [];

	before(() => {
		var transactions = [];
		var transaction1 = lisk.transaction.createTransaction(
			delegateAccount.address,
			1000 * normalizer,
			accountFixtures.genesis.password
		);
		var transaction2 = lisk.transaction.createTransaction(
			accountMinimalFunds.address,
			constants.fees.vote,
			accountFixtures.genesis.password
		);
		var transaction3 = lisk.transaction.createTransaction(
			accountFixtures.existingDelegate.address,
			1000 * normalizer,
			accountFixtures.genesis.password
		);
		var transaction4 = lisk.transaction.createTransaction(
			accountMaxVotesPerTransaction.address,
			1000 * normalizer,
			accountFixtures.genesis.password
		);
		var transaction5 = lisk.transaction.createTransaction(
			accountMaxVotesPerAccount.address,
			1000 * normalizer,
			accountFixtures.genesis.password
		);
		transactions.push(
			transaction1,
			transaction2,
			transaction4,
			transaction4,
			transaction5
		);

		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		promises.push(sendTransactionPromise(transaction3));
		promises.push(sendTransactionPromise(transaction4));
		promises.push(sendTransactionPromise(transaction5));

		return Promise.all(promises)
			.then(res => {
				res.forEach((result, index) => {
					expect(result.body.data.message).to.equal('Transaction(s) accepted');
					transactionsToWaitFor.push(transactions[index].id);
				});

				var transactionsCreditMaxVotesPerTransaction = [];
				var promisesCreditsMaxVotesPerTransaction = [];
				for (var i = 0; i < constants.maxVotesPerTransaction; i++) {
					var tempAccount = randomUtil.account();
					delegatesMaxVotesPerTransaction.push(tempAccount);
					var transaction = lisk.transaction.createTransaction(
						tempAccount.address,
						constants.fees.delegate,
						accountFixtures.genesis.password
					);
					transactionsCreditMaxVotesPerTransaction.push(transaction);
					promisesCreditsMaxVotesPerTransaction.push(
						sendTransactionPromise(transaction)
					);
				}

				return Promise.all(promisesCreditsMaxVotesPerTransaction).then(
					results => {
						results.forEach((result, index) => {
							expect(result.body.data.message).to.equal(
								'Transaction(s) accepted'
							);
							transactionsToWaitFor.push(
								transactionsCreditMaxVotesPerTransaction[index].id
							);
						});
					}
				);
			})
			.then(() => {
				var transactionsCreditMaxVotesPerAccount = [];
				var promisesCreditsMaxVotesPerAccount = [];
				for (var i = 0; i < constants.activeDelegates; i++) {
					var tempAccount = randomUtil.account();
					delegatesMaxVotesPerAccount.push(tempAccount);
					var transaction = lisk.transaction.createTransaction(
						tempAccount.address,
						constants.fees.delegate,
						accountFixtures.genesis.password
					);
					transactionsCreditMaxVotesPerAccount.push(transaction);
					promisesCreditsMaxVotesPerAccount.push(
						sendTransactionPromise(transaction)
					);
				}

				return Promise.all(promisesCreditsMaxVotesPerAccount).then(results => {
					results.forEach((result, index) => {
						expect(result.body.data.message).to.equal(
							'Transaction(s) accepted'
						);
						transactionsToWaitFor.push(
							transactionsCreditMaxVotesPerAccount[index].id
						);
					});
				});
			})
			.then(() => {
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(() => {
				transactionsToWaitFor = [];
				var transaction = lisk.delegate.createDelegate(
					delegateAccount.password,
					delegateAccount.username
				);
				return sendTransactionPromise(transaction).then(result => {
					expect(result.body.data.message).to.equal('Transaction(s) accepted');
					transactionsToWaitFor.push(transaction.id);
				});
			})
			.then(() => {
				var promisesDelegatesMaxVotesPerTransaction = [];
				var transactionsDelegateMaxForPerTransaction = [];
				for (var i = 0; i < constants.maxVotesPerTransaction; i++) {
					var transaction = lisk.delegate.createDelegate(
						delegatesMaxVotesPerTransaction[i].password,
						delegatesMaxVotesPerTransaction[i].username
					);
					transactionsDelegateMaxForPerTransaction.push(transaction);
					promisesDelegatesMaxVotesPerTransaction.push(
						sendTransactionPromise(transaction)
					);
				}

				return Promise.all(promisesDelegatesMaxVotesPerTransaction).then(
					results => {
						results.forEach((result, index) => {
							expect(result.body.data.message).to.equal(
								'Transaction(s) accepted'
							);
							transactionsToWaitFor.push(
								transactionsDelegateMaxForPerTransaction[index].id
							);
						});
					}
				);
			})
			.then(() => {
				var transactionsDelegateMaxVotesPerAccount = [];
				var promisesDelegatesMaxVotesPerAccount = [];
				for (var i = 0; i < constants.activeDelegates; i++) {
					var transaction = lisk.delegate.createDelegate(
						delegatesMaxVotesPerAccount[i].password,
						delegatesMaxVotesPerAccount[i].username
					);
					transactionsDelegateMaxVotesPerAccount.push(transaction);
					promisesDelegatesMaxVotesPerAccount.push(
						sendTransactionPromise(transaction)
					);
				}

				return Promise.all(promisesDelegatesMaxVotesPerAccount).then(
					results => {
						results.forEach((result, index) => {
							expect(result.body.data.message).to.equal(
								'Transaction(s) accepted'
							);
							transactionsToWaitFor.push(
								transactionsDelegateMaxVotesPerAccount[index].id
							);
						});
					}
				);
			})
			.then(() => {
				return waitFor.confirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', () => {
		common.invalidAssets('votes', badTransactions);
	});

	describe('transactions processing', () => {
		it('using with invalid publicKey should fail', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`+L${accountFixtures.existingDelegate.publicKey.slice(0, -1)}`,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote format'
				);
				badTransactions.push(transaction);
			});
		});

		it('using with invalid vote length (1 extra character) should fail', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`-1${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote length'
				);
				badTransactions.push(transaction);
			});
		});

		it('using invalid vote operator "x" should fail', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`x${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote format'
				);
				badTransactions.push(transaction);
			});
		});

		it('using no vote operator should fail', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				accountFixtures.existingDelegate.publicKey,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote format'
				);
				badTransactions.push(transaction);
			});
		});

		it('using a null publicKey inside votes should fail', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [null]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote type'
				);
				badTransactions.push(transaction);
			});
		});

		it('upvoting with no funds should fail', () => {
			accountNoFunds = randomUtil.account();
			transaction = lisk.vote.createVote(accountNoFunds.password, [
				`+${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Account does not have enough LSK: ${
						accountNoFunds.address
					} balance: 0`
				);
				badTransactions.push(transaction);
			});
		});

		it('upvoting with minimal required amount of funds should be ok', () => {
			transaction = lisk.vote.createVote(accountMinimalFunds.password, [
				`+${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('downvoting not voted delegate should fail', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`-${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Failed to remove vote, delegate "${
						accountFixtures.existingDelegate.delegateName
					}" was not voted for`
				);
				badTransactions.push(transaction);
			});
		});

		it('upvoting with valid params should be ok', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`+${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('self upvoting with valid params should be ok', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`+${delegateAccount.publicKey}`,
			]);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it(`upvoting ${
			constants.maxVotesPerTransaction
		} delegates (maximum votes per transaction) at once should be ok`, () => {
			transaction = lisk.vote.createVote(
				accountMaxVotesPerTransaction.password,
				delegatesMaxVotesPerTransaction.map(delegate => {
					return `+${delegate.publicKey}`;
				})
			);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it(`upvoting ${constants.maxVotesPerTransaction +
			1} delegates (maximum votes per transaction + 1) at once should fail`, () => {
			transaction = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount
					.slice(0, constants.maxVotesPerTransaction + 1)
					.map(delegate => {
						return `+${delegate.publicKey}`;
					})
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid transaction body - Failed to validate vote schema: Array is too long (34), maximum 33'
				);
				badTransactions.push(transaction);
			});
		});

		it(`upvoting ${
			constants.activeDelegates
		} delegates (number of actived delegates) separately should be ok`, () => {
			var transaction1 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(0, 33).map(delegate => {
					return `+${delegate.publicKey}`;
				})
			);
			var transaction2 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(33, 66).map(delegate => {
					return `+${delegate.publicKey}`;
				})
			);
			var transaction3 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(66, 99).map(delegate => {
					return `+${delegate.publicKey}`;
				})
			);
			var transaction4 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(99, 102).map(delegate => {
					return `+${delegate.publicKey}`;
				})
			);

			var promises = [];
			promises.push(sendTransactionPromise(transaction1));
			promises.push(sendTransactionPromise(transaction2));
			promises.push(sendTransactionPromise(transaction3));
			promises.push(sendTransactionPromise(transaction4));

			return Promise.all(promises).then(res => {
				res.forEach(result => {
					expect(result.body.data.message).to.equal('Transaction(s) accepted');
				});
				goodTransactions.push(
					transaction1,
					transaction2,
					transaction3,
					transaction4
				);
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('validation', () => {
		it('upvoting same delegate twice should fail', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`+${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Failed to add vote, delegate "${
						accountFixtures.existingDelegate.delegateName
					}" already voted for`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting voted delegate should be ok', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`-${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('self downvoting should be ok', () => {
			transaction = lisk.vote.createVote(delegateAccount.password, [
				`-${delegateAccount.publicKey}`,
			]);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it(`exceeding maximum of ${
			constants.activeDelegates
		} votes (number of actived delegates + 1) should fail`, () => {
			transaction = lisk.vote.createVote(accountMaxVotesPerAccount.password, [
				`+${accountFixtures.existingDelegate.publicKey}`,
			]);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Maximum number of ${
						constants.activeDelegates
					} votes exceeded (1 too many)`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it(`downvoting ${
			constants.maxVotesPerTransaction
		} delegates (maximum votes per transaction) at once should be ok`, () => {
			transaction = lisk.vote.createVote(
				accountMaxVotesPerTransaction.password,
				delegatesMaxVotesPerTransaction.map(delegate => {
					return `-${delegate.publicKey}`;
				})
			);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it(`downvoting ${constants.maxVotesPerTransaction +
			1} delegates (maximum votes per transaction + 1) at once should fail`, () => {
			transaction = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(0, 34).map(delegate => {
					return `-${delegate.publicKey}`;
				})
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate vote schema: Array is too long (${constants.maxVotesPerTransaction +
						1}), maximum ${constants.maxVotesPerTransaction}`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it(`downvoting ${
			constants.activeDelegates
		} delegates (number of actived delegates) separately should be ok`, () => {
			var transaction1 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(0, 33).map(delegate => {
					return `-${delegate.publicKey}`;
				})
			);
			var transaction2 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(33, 66).map(delegate => {
					return `-${delegate.publicKey}`;
				})
			);
			var transaction3 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(66, 99).map(delegate => {
					return `-${delegate.publicKey}`;
				})
			);
			var transaction4 = lisk.vote.createVote(
				accountMaxVotesPerAccount.password,
				delegatesMaxVotesPerAccount.slice(99, 102).map(delegate => {
					return `-${delegate.publicKey}`;
				})
			);

			var promises = [];
			promises.push(sendTransactionPromise(transaction1));
			promises.push(sendTransactionPromise(transaction2));
			promises.push(sendTransactionPromise(transaction3));
			promises.push(sendTransactionPromise(transaction4));

			return Promise.all(promises).then(res => {
				res.forEach(result => {
					expect(result.body.data.message).to.equal('Transaction(s) accepted');
				});
				goodTransactionsEnforcement.push(
					transaction1,
					transaction2,
					transaction3,
					transaction4
				);
			});
		});
	});

	describe('confirm validation', () => {
		phases.confirmation(
			goodTransactionsEnforcement,
			badTransactionsEnforcement
		);
	});
});
