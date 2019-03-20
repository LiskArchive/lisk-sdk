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

require('../../functional');
const Promise = require('bluebird');
const {
	transfer,
	registerDelegate,
	castVotes,
} = require('@liskhq/lisk-transactions');
const phases = require('../../../common/phases');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const elements = require('../../../common/utils/elements');
const apiHelpers = require('../../../common/helpers/api');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');
const common = require('./common');

const {
	FEES,
	NORMALIZER,
	ACTIVE_DELEGATES,
	MAX_VOTES_PER_TRANSACTION,
} = global.constants;
const sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 3) votes', () => {
	let transaction;
	let transactionsToWaitFor = [];
	const badTransactions = [];
	const goodTransactions = [];
	const badTransactionsEnforcement = [];
	const goodTransactionsEnforcement = [];

	const delegateAccount = randomUtil.account();
	let accountNoFunds = randomUtil.account();
	const accountMinimalFunds = randomUtil.account();

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
	const accountMaxVotesPerTransaction = randomUtil.account();
	const delegatesMaxVotesPerTransaction = [];
	// Second Scenario
	const accountMaxVotesPerAccount = randomUtil.account();
	const delegatesMaxVotesPerAccount = [];

	before(() => {
		const transactions = [];
		const transaction1 = transfer({
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: delegateAccount.address,
		});
		const transaction2 = transfer({
			amount: FEES.VOTE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMinimalFunds.address,
		});
		const transaction3 = transfer({
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountFixtures.existingDelegate.address,
		});
		const transaction4 = transfer({
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMaxVotesPerTransaction.address,
		});
		const transaction5 = transfer({
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMaxVotesPerAccount.address,
		});
		transactions.push(
			transaction1,
			transaction2,
			transaction4,
			transaction4,
			transaction5
		);

		const promises = [];
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

				const transactionsCreditMaxVotesPerTransaction = [];
				const promisesCreditsMaxVotesPerTransaction = [];
				for (let i = 0; i < MAX_VOTES_PER_TRANSACTION; i++) {
					const tempAccount = randomUtil.account();
					delegatesMaxVotesPerTransaction.push(tempAccount);
					const transfer1 = transfer({
						amount: FEES.DELEGATE,
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: tempAccount.address,
					});
					transactionsCreditMaxVotesPerTransaction.push(transfer1);
					promisesCreditsMaxVotesPerTransaction.push(
						sendTransactionPromise(transfer1)
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
				const transactionsCreditMaxVotesPerAccount = [];
				const promisesCreditsMaxVotesPerAccount = [];
				for (let i = 0; i < ACTIVE_DELEGATES; i++) {
					const tempAccount = randomUtil.account();
					delegatesMaxVotesPerAccount.push(tempAccount);
					const transfer2 = transfer({
						amount: FEES.DELEGATE,
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: tempAccount.address,
					});
					transactionsCreditMaxVotesPerAccount.push(transfer2);
					promisesCreditsMaxVotesPerAccount.push(
						sendTransactionPromise(transfer2)
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
				const delegateRegistration = registerDelegate({
					passphrase: delegateAccount.passphrase,
					username: delegateAccount.username,
				});
				return sendTransactionPromise(delegateRegistration).then(result => {
					expect(result.body.data.message).to.equal('Transaction(s) accepted');
					transactionsToWaitFor.push(delegateRegistration.id);
				});
			})
			.then(() => {
				const promisesDelegatesMaxVotesPerTransaction = [];
				const transactionsDelegateMaxForPerTransaction = [];
				for (let i = 0; i < MAX_VOTES_PER_TRANSACTION; i++) {
					const delegateRegistration = registerDelegate({
						passphrase: delegatesMaxVotesPerTransaction[i].passphrase,
						username: delegatesMaxVotesPerTransaction[i].username,
					});
					transactionsDelegateMaxForPerTransaction.push(delegateRegistration);
					promisesDelegatesMaxVotesPerTransaction.push(
						sendTransactionPromise(delegateRegistration)
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
				const transactionsDelegateMaxVotesPerAccount = [];
				const promisesDelegatesMaxVotesPerAccount = [];
				for (let i = 0; i < ACTIVE_DELEGATES; i++) {
					const delegateRegistration = registerDelegate({
						passphrase: delegatesMaxVotesPerAccount[i].passphrase,
						username: delegatesMaxVotesPerAccount[i].username,
					});
					transactionsDelegateMaxVotesPerAccount.push(delegateRegistration);
					promisesDelegatesMaxVotesPerAccount.push(
						sendTransactionPromise(delegateRegistration)
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
		it('using invalid publicKey should fail', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			transaction.asset.votes[0] = `+L${accountFixtures.existingDelegate.publicKey.slice(
				0,
				-1
			)}`;
			transaction = elements.redoSignature(
				transaction,
				delegateAccount.passphrase
			);

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote format'
				);
				badTransactions.push(transaction);
			});
		});

		it('using invalid vote length (1 extra character) should fail', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				unvotes: [`${accountFixtures.existingDelegate.publicKey}`],
			});
			transaction.asset.votes[0] = `+1${
				accountFixtures.existingDelegate.publicKey
			}`;
			transaction = elements.redoSignature(
				transaction,
				delegateAccount.passphrase
			);

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote format'
				);
				badTransactions.push(transaction);
			});
		});

		it('using invalid vote operator "x" should fail', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});
			transaction.asset.votes[0] = transaction.asset.votes[0].replace('+', 'x');
			transaction = elements.redoSignature(
				transaction,
				delegateAccount.passphrase
			);

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote format'
				);
				badTransactions.push(transaction);
			});
		});

		it('using no vote operator should fail', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});
			transaction.asset.votes[0] = transaction.asset.votes[0].replace('+', '');
			transaction = elements.redoSignature(
				transaction,
				delegateAccount.passphrase
			);

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote format'
				);
				badTransactions.push(transaction);
			});
		});

		it('using a null publicKey inside votes should fail', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});
			transaction.asset.votes[0] = null;
			transaction = elements.redoSignature(
				transaction,
				delegateAccount.passphrase
			);

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid vote at index 0 - Invalid vote type'
				);
				badTransactions.push(transaction);
			});
		});

		it('upvoting with no funds should fail', async () => {
			accountNoFunds = randomUtil.account();
			transaction = castVotes({
				passphrase: accountNoFunds.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Account does not have enough LSK: ${
						accountNoFunds.address
					} balance: 0`
				);
				badTransactions.push(transaction);
			});
		});

		it('upvoting non delegate should be fail', async () => {
			transaction = castVotes({
				passphrase: accountMinimalFunds.passphrase,
				votes: [`${accountMinimalFunds.publicKey}`],
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.equal('Delegate not found');
				badTransactions.push(transaction);
			});
		});

		it('upvoting with minimal required amount of funds should be ok', async () => {
			transaction = castVotes({
				passphrase: accountMinimalFunds.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('downvoting not voted delegate should fail', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				unvotes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Failed to remove vote, delegate "${
						accountFixtures.existingDelegate.delegateName
					}" was not voted for`
				);
				badTransactions.push(transaction);
			});
		});

		it('upvoting with valid params should be ok', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('self upvoting with valid params should be ok', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				votes: [`${delegateAccount.publicKey}`],
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it(`upvoting ${MAX_VOTES_PER_TRANSACTION} delegates (maximum votes per transaction) at once should be ok`, async () => {
			transaction = castVotes({
				passphrase: accountMaxVotesPerTransaction.passphrase,
				votes: delegatesMaxVotesPerTransaction.map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it(`upvoting ${MAX_VOTES_PER_TRANSACTION +
			1} delegates (maximum votes per transaction + 1) at once should fail`, async () => {
			transaction = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				votes: delegatesMaxVotesPerAccount
					.slice(0, MAX_VOTES_PER_TRANSACTION + 1)
					.map(delegate => {
						return `${delegate.publicKey}`;
					}),
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid transaction body - Failed to validate vote schema: Array is too long (34), maximum 33'
				);
				badTransactions.push(transaction);
			});
		});

		it(`upvoting ${ACTIVE_DELEGATES} delegates (number of actived delegates) separately should be ok`, async () => {
			const transaction1 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				votes: delegatesMaxVotesPerAccount.slice(0, 33).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});
			const transaction2 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				votes: delegatesMaxVotesPerAccount.slice(33, 66).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});
			const transaction3 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				votes: delegatesMaxVotesPerAccount.slice(66, 99).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});
			const transaction4 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				votes: delegatesMaxVotesPerAccount.slice(99, 102).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});

			const promises = [];
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
		it('upvoting same delegate twice should fail', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Failed to add vote, delegate "${
						accountFixtures.existingDelegate.delegateName
					}" already voted for`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('downvoting voted delegate should be ok', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				unvotes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it('self downvoting should be ok', async () => {
			transaction = castVotes({
				passphrase: delegateAccount.passphrase,
				unvotes: [`${delegateAccount.publicKey}`],
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it(`exceeding maximum of ${ACTIVE_DELEGATES} votes (number of actived delegates + 1) should fail`, async () => {
			transaction = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				votes: [`${accountFixtures.existingDelegate.publicKey}`],
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Maximum number of ${ACTIVE_DELEGATES} votes exceeded (1 too many)`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it(`downvoting ${MAX_VOTES_PER_TRANSACTION} delegates (maximum votes per transaction) at once should be ok`, async () => {
			transaction = castVotes({
				passphrase: accountMaxVotesPerTransaction.passphrase,
				unvotes: delegatesMaxVotesPerTransaction.map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.equal('Transaction(s) accepted');
				goodTransactionsEnforcement.push(transaction);
			});
		});

		it(`downvoting ${MAX_VOTES_PER_TRANSACTION +
			1} delegates (maximum votes per transaction + 1) at once should fail`, async () => {
			transaction = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				unvotes: delegatesMaxVotesPerAccount.slice(0, 34).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate vote schema: Array is too long (${MAX_VOTES_PER_TRANSACTION +
						1}), maximum ${MAX_VOTES_PER_TRANSACTION}`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it(`downvoting ${ACTIVE_DELEGATES} delegates (number of actived delegates) separately should be ok`, async () => {
			const transaction1 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				unvotes: delegatesMaxVotesPerAccount.slice(0, 33).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});
			const transaction2 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				unvotes: delegatesMaxVotesPerAccount.slice(33, 66).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});
			const transaction3 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				unvotes: delegatesMaxVotesPerAccount.slice(66, 99).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});
			const transaction4 = castVotes({
				passphrase: accountMaxVotesPerAccount.passphrase,
				unvotes: delegatesMaxVotesPerAccount.slice(99, 102).map(delegate => {
					return `${delegate.publicKey}`;
				}),
			});

			const promises = [];
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
