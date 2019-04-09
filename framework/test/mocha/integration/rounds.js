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

const async = require('async');
const {
	transfer,
	castVotes,
	registerDelegate,
} = require('@liskhq/lisk-transactions');
const Promise = require('bluebird');
const ed = require('../../../src/modules/chain/helpers/ed');
const slots = require('../../../src/modules/chain/helpers/slots');
const Bignum = require('../../../src/modules/chain/helpers/bignum');
const accountsFixtures = require('../fixtures/accounts');
const randomUtil = require('../common/utils/random');
const QueriesHelper = require('../common/integration/sql/queries_helper');
const localCommon = require('./common');

const { REWARDS, ACTIVE_DELEGATES } = global.constants;

describe('rounds', () => {
	let library;
	let Queries;
	let generateDelegateListPromise;
	let addTransactionsAndForgePromise;
	let deleteLastBlockPromise;

	// Set rewards start at 150-th block
	REWARDS.OFFSET = 150;

	localCommon.beforeBlock('rounds', lib => {
		library = lib;
		Queries = new QueriesHelper(lib, lib.components.storage);

		generateDelegateListPromise = Promise.promisify(
			library.modules.delegates.generateDelegateList
		);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);

		deleteLastBlockPromise = Promise.promisify(
			library.modules.blocks.chain.deleteLastBlock
		);
	});

	function getMemAccounts() {
		return Queries.getAccounts().then(rows => {
			const accounts = {};
			_.map(rows, acc => {
				acc.nameExist = acc.nameexist;
				acc.u_nameExist = acc.u_nameexist;
				acc.multiLifetime = acc.multilifetime;
				acc.u_multiLifetime = acc.u_multilifetime;
				delete acc.nameexist;
				delete acc.u_nameexist;
				delete acc.multilifetime;
				delete acc.u_multilifetime;

				accounts[acc.address] = acc;
			});
			return _.cloneDeep(accounts);
		});
	}

	function getDelegates() {
		return Queries.getDelegates().then(rows => {
			const delegates = {};
			_.map(rows, d => {
				d.publicKey = d.publicKey.toString('hex');
				delegates[d.publicKey] = d;
			});
			return _.cloneDeep(delegates);
		});
	}

	function expectedMemState(transactions, _accounts) {
		const accounts = _.cloneDeep(_accounts);
		const lastBlock = library.modules.blocks.lastBlock.get();

		// Update last block forger account
		const found = _.find(accounts, {
			publicKey: ed.hexToBuffer(lastBlock.generatorPublicKey),
		});
		if (found) {
			found.producedBlocks += 1;
		}

		// Mutate states - apply every transaction to expected states
		_.each(transactions, transaction => {
			// SENDER: Get address from senderId or if not available - get from senderPublicKey
			let address =
				transaction.senderId ||
				library.modules.accounts.generateAddressByPublicKey(
					transaction.senderPublicKey
				);

			// If account with address exists - set expected values
			if (accounts[address]) {
				// Update sender
				accounts[address].balance = new Bignum(accounts[address].balance)
					.minus(
						new Bignum(transaction.fee).plus(new Bignum(transaction.amount))
					)
					.toString();
				accounts[address].u_balance = new Bignum(accounts[address].u_balance)
					.minus(
						new Bignum(transaction.fee).plus(new Bignum(transaction.amount))
					)
					.toString();

				// Set public key if not present
				if (!accounts[address].publicKey) {
					accounts[address].publicKey = Buffer.from(
						transaction.senderPublicKey,
						'hex'
					);
				}

				// Apply register delegate transaction
				if (transaction.type === 2) {
					accounts[address].username = transaction.asset.delegate.username;
					accounts[address].u_username = accounts[address].username;
					accounts[address].isDelegate = 1;
					accounts[address].u_isDelegate = 1;
				}
			}

			// RECIPIENT: Get address from recipientId
			address = transaction.recipientId;
			// Perform only when address exists (exclude non-standard tyransaction types)
			if (address) {
				// If account with address exists - set expected values
				if (accounts[address]) {
					// Update recipient
					accounts[address].balance = new Bignum(accounts[address].balance)
						.plus(new Bignum(transaction.amount))
						.toString();
					accounts[address].u_balance = new Bignum(accounts[address].u_balance)
						.plus(new Bignum(transaction.amount))
						.toString();
				} else {
					// Funds sent to new account - create account with default values
					accounts[address] = accountsFixtures.dbAccount({
						address,
						balance: new Bignum(transaction.amount).toString(),
					});
				}
			}
		});
		return accounts;
	}

	function applyRoundRewards(_accounts, blocks) {
		const accounts = _.cloneDeep(_accounts);
		const expectedRewards = getExpectedRoundRewards(blocks);
		_.each(expectedRewards, reward => {
			const found = _.find(accounts, {
				publicKey: ed.hexToBuffer(reward.publicKey),
			});
			if (found) {
				found.fees = new Bignum(found.fees)
					.plus(new Bignum(reward.fees))
					.toString();
				found.rewards = new Bignum(found.rewards)
					.plus(new Bignum(reward.rewards))
					.toString();
				found.balance = new Bignum(found.balance)
					.plus(new Bignum(reward.fees))
					.plus(new Bignum(reward.rewards))
					.toString();
				found.u_balance = new Bignum(found.u_balance)
					.plus(new Bignum(reward.fees))
					.plus(new Bignum(reward.rewards))
					.toString();
			}
		});

		return accounts;
	}

	function recalculateVoteWeights(_accounts, voters) {
		const accounts = _.cloneDeep(_accounts);

		// Reset vote for all accounts
		_.each(accounts, account => {
			account.vote = '0';
		});

		// Recalculate vote
		_.each(voters, delegate => {
			let votes = '0';
			const found = _.find(accounts, {
				publicKey: ed.hexToBuffer(delegate.dependentId),
			});

			_.each(delegate.array_agg, voter => {
				const foundAccount = _.find(accounts, {
					address: voter,
				});
				votes = new Bignum(votes)
					.plus(new Bignum(foundAccount.balance))
					.toString();
			});
			found.vote = votes;
		});

		return accounts;
	}

	function recalculateRanks(_accounts) {
		let accounts = _.cloneDeep(_accounts);

		// Sort accounts - vote DESC, publicKey ASC
		accounts = Object.keys(accounts)
			.sort((a, b) => {
				const aVote = new Bignum(accounts[a].vote);
				const bVote = new Bignum(accounts[b].vote);
				const aPK = accounts[a].publicKey;
				const bPK = accounts[b].publicKey;
				// Compare vote weights first:
				// if first is less than second - return -1,
				// if first is greather than second - return 1,
				// if both are equal - compare public keys
				if (aVote.lt(bVote)) {
					return -1;
				}
				if (aVote.gt(bVote)) {
					return 1;
				}
				// If both are buffers
				// Return result of the compare
				if (aPK && bPK) {
					return Buffer.compare(bPK, aPK);
				}
				// If both are null - return 0
				if (aPK === null && bPK === null) {
					return 0;
				}
				// If first is null - return -1,
				if (aPK === null) {
					return -1;
				}
				// if not return 1;
				return 1;
			})
			.map(key => accounts[key])
			.reverse();

		const tmpAccounts = {};
		let rank = 0;
		_.each(accounts, account => {
			if (account.isDelegate) {
				++rank;
				account.rank = rank.toString();
			} else {
				account.rank = null;
			}
			tmpAccounts[account.address] = account;
		});

		return tmpAccounts;
	}

	function applyOutsiders(_accounts, delegatesList, blocks) {
		const accounts = _.cloneDeep(_accounts);

		// Get all public keys of delegates that forged blocks in current round
		const blockGeneratorsPublicKeys = blocks.map(b =>
			b.generatorPublicKey.toString('hex')
		);
		// Get public keys of delegates who were expected to forge in current round but they didn't
		const roundOutsidersList = _.difference(
			delegatesList,
			blockGeneratorsPublicKeys
		);

		// Increase missed blocks counter for every outsider
		roundOutsidersList.forEach(publicKey => {
			const account = _.find(accounts, {
				publicKey: ed.hexToBuffer(publicKey),
			});
			account.missedBlocks += 1;
		});

		return accounts;
	}

	function getExpectedRoundRewards(blocks) {
		const rewards = {};

		const feesTotal = _.reduce(
			blocks,
			(fees, block) => {
				return new Bignum(fees).plus(block.totalFee);
			},
			0
		);

		const rewardsTotal = _.reduce(
			blocks,
			(reward, block) => {
				return new Bignum(reward).plus(block.reward);
			},
			0
		);

		const feesPerDelegate = new Bignum(feesTotal.toPrecision(15))
			.dividedBy(ACTIVE_DELEGATES)
			.integerValue(Bignum.ROUND_FLOOR);
		const feesRemaining = new Bignum(feesTotal.toPrecision(15)).minus(
			feesPerDelegate.multipliedBy(ACTIVE_DELEGATES)
		);

		__testContext.debug(
			`	Total fees: ${feesTotal} Fees per delegates: ${feesPerDelegate} Remaining fees: ${feesRemaining} Total rewards: ${rewardsTotal}`
		);

		_.each(blocks, (block, index) => {
			const publicKey = block.generatorPublicKey.toString('hex');
			if (rewards[publicKey]) {
				rewards[publicKey].fees = rewards[publicKey].fees.plus(feesPerDelegate);
				rewards[publicKey].rewards = rewards[publicKey].rewards.plus(
					block.reward
				);
			} else {
				rewards[publicKey] = {
					publicKey,
					fees: new Bignum(feesPerDelegate),
					rewards: new Bignum(block.reward),
				};
			}

			if (index === blocks.length - 1) {
				// Apply remaining fees to last delegate
				rewards[publicKey].fees = rewards[publicKey].fees.plus(feesRemaining);
			}
		});

		_.each(rewards, delegate => {
			delegate.fees = delegate.fees.toString();
			delegate.rewards = delegate.rewards.toString();
		});

		return rewards;
	}

	function tickAndValidate(transactions) {
		const tick = { before: {}, after: {} };

		describe('new block', () => {
			before(() => {
				tick.before.block = library.modules.blocks.lastBlock.get();
				tick.before.round = slots.calcRound(tick.before.block.height);

				return Promise.join(
					getMemAccounts(),
					getDelegates(),
					generateDelegateListPromise(tick.before.round, null),
					Queries.getDelegatesOrderedByVote(),
					(_accounts, _delegates, _delegatesList, _delegatesOrderedByVote) => {
						tick.before.accounts = _.cloneDeep(_accounts);
						tick.before.delegates = _.cloneDeep(_delegates);
						tick.before.delegatesList = _.cloneDeep(_delegatesList);
						tick.before.delegatesOrderedByVote = _.cloneDeep(
							_delegatesOrderedByVote
						);
					}
				).then(() => {
					return addTransactionsAndForgePromise(library, transactions, 0).then(
						async () => {
							tick.after.block = library.modules.blocks.lastBlock.get();
							tick.after.round = slots.calcRound(tick.after.block.height);
							// Detect if round changed
							tick.isRoundChanged = tick.before.round !== tick.after.round;
							// Detect last block of round
							tick.isLastBlockOfRound =
								tick.after.block.height % ACTIVE_DELEGATES === 0;

							return Promise.join(
								getMemAccounts(),
								getDelegates(),
								generateDelegateListPromise(
									slots.calcRound(tick.after.block.height + 1),
									null
								),
								Queries.getDelegatesOrderedByVote(),
								(
									_accounts,
									_delegates,
									_delegatesList,
									_delegatesOrderedByVote
								) => {
									tick.after.accounts = _.cloneDeep(_accounts);
									tick.after.delegates = _.cloneDeep(_delegates);
									tick.after.delegatesList = _.cloneDeep(_delegatesList);
									tick.after.delegatesOrderedByVote = _.cloneDeep(
										_delegatesOrderedByVote
									);

									if (tick.isLastBlockOfRound) {
										return Promise.join(
											Queries.getBlocks(tick.after.round),
											Queries.getVoters(),
											(_blocks, _voters) => {
												tick.roundBlocks = _blocks;
												tick.voters = _voters;
											}
										);
									}

									return true;
								}
							);
						}
					);
				});
			});

			it('ID should be different than last block ID', async () => {
				return expect(tick.after.block.id).to.not.equal(tick.before.block.id);
			});

			it('block version should be 1', async () => {
				return expect(tick.after.block.version).to.equal(1);
			});

			it('height should be greather by 1', async () => {
				return expect(tick.after.block.height).to.equal(
					tick.before.block.height + 1
				);
			});

			it('should contain all expected transactions', async () => {
				return expect(transactions.map(t => t.id).sort()).to.be.deep.equal(
					tick.after.block.transactions.map(t => t.id).sort()
				);
			});

			it('unconfirmed account balances should match confirmed account balances', done => {
				_.each(tick.after.accounts, account => {
					expect(account.u_balance).to.be.equal(account.balance);
				});
				done();
			});

			describe('mem_accounts table', () => {
				it('if block contains at least one transaction states before and after block should be different', done => {
					if (transactions.length > 0) {
						expect(tick.before.accounts).to.not.deep.equal(tick.after.accounts);
					}
					done();
				});

				it('delegates with highest weight used for generating list should be the same for same round', async () => {
					if (tick.isLastBlockOfRound) {
						return expect(tick.before.delegatesOrderedByVote).to.not.deep.equal(
							tick.after.delegatesOrderedByVote
						);
					}

					return expect(tick.before.delegatesOrderedByVote).to.deep.equal(
						tick.after.delegatesOrderedByVote
					);
				});

				it('delegates list should be the same for same round', async () => {
					if (
						(tick.isLastBlockOfRound &&
							!_.isEqual(
								tick.before.delegatesOrderedByVote,
								tick.after.delegatesOrderedByVote
							)) ||
						tick.isRoundChanged
					) {
						return expect(tick.before.delegatesList).to.not.deep.equal(
							tick.after.delegatesList
						);
					}

					return expect(tick.before.delegatesList).to.deep.equal(
						tick.after.delegatesList
					);
				});

				it('accounts table states should match expected states', done => {
					let expected;

					expected = expectedMemState(transactions, tick.before.accounts);

					// Last block of round - apply round expectactions
					if (tick.isLastBlockOfRound) {
						expected = applyRoundRewards(expected, tick.roundBlocks);
						expected = recalculateVoteWeights(expected, tick.voters);
						expected = applyOutsiders(
							expected,
							tick.before.delegatesList,
							tick.roundBlocks
						);

						// FIXME: Remove that nasty hack after https://github.com/LiskHQ/lisk/issues/2423 is closed
						try {
							expect(tick.after.accounts).to.deep.equal(expected);
						} catch (err) {
							// When comparison of mem_accounts states fail
							_.reduce(
								tick.after.accounts,
								(result, value, key) => {
									// Clone actual and expected accounts states
									const actualAccount = Object.assign({}, value);
									const expectedAccount = Object.assign({}, expected[key]);
									// Compare actual and expected states
									if (!_.isEqual(actualAccount.vote, expectedAccount.vote)) {
										// When comparison fails - calculate absolute difference of 'vote' values
										const absoluteDiff = Math.abs(
											new Bignum(actualAccount.vote)
												.minus(new Bignum(expectedAccount.vote))
												.toNumber()
										);
										// If absolute value is 1 beddows - pass the test, as reason is related to issue #716
										if (absoluteDiff === 1) {
											__testContext.debug(
												`ERROR: Value of 'vote' for account ${key} doesn't match expectations, actual: ${
													actualAccount.vote
												}, expected: ${
													expectedAccount.vote
												}, diff: ${absoluteDiff} beddows`
											);
											// Overwrite expected vote with current one, so recalculateRanks can be calculated correctly
											expected[key].vote = actualAccount.vote;
										} else {
											// In every other case - fail the test
											throw err;
										}
									}
								},
								[]
							);
						}

						expected = recalculateRanks(expected);
					}

					expect(tick.after.accounts).to.deep.equal(expected);
					done();
				});

				it('balances should be valid against blockchain balances', async () => {
					// Perform validation of accounts balances against blockchain after every block
					return expect(Queries.validateAccountsBalances()).to.eventually.be.an(
						'array'
					).that.is.empty;
				});
			});
		});
	}

	describe('round 1', () => {
		const round = {
			current: 1,
			outsiderPublicKey:
				'948b8b509579306694c00833ec1c0f81e964487db2206ddb1517bfeca2b0dc1b',
		};

		before(() => {
			const lastBlock = library.modules.blocks.lastBlock.get();

			// Copy initial states for later comparison
			return Promise.join(
				getMemAccounts(),
				getDelegates(),
				generateDelegateListPromise(slots.calcRound(lastBlock.height), null),
				(_accounts, _delegates, _delegatesList) => {
					// Get genesis accounts address - should be senderId from first transaction
					const genesisAddress =
						library.genesisBlock.block.transactions[0].senderId;
					// Inject and normalize genesis account to delegates (it's not a delegate, but will get rewards split from first round)
					const genesisPublicKey = _accounts[genesisAddress].publicKey.toString(
						'hex'
					);
					_delegates[genesisPublicKey] = _accounts[genesisAddress];
					_delegates[genesisPublicKey].publicKey = genesisPublicKey;

					round.delegatesList = _delegatesList;
					round.accounts = _.cloneDeep(_accounts);
					round.delegates = _.cloneDeep(_delegates);
				}
			);
		});

		describe('forge block with 1 TRANSFER transaction to random account', () => {
			const transactions = [];

			before(done => {
				const transaction = transfer({
					recipientId: randomUtil.account().address,
					amount: randomUtil.number(100000000, 1000000000).toString(),
					passphrase: accountsFixtures.genesis.passphrase,
				});
				transactions.push(transaction);
				done();
			});

			tickAndValidate(transactions);
		});

		describe('forge block with 25 TRANSFER transactions to random accounts', () => {
			const transactions = [];

			before(done => {
				const transactionsPerBlock = 25;

				for (let i = transactionsPerBlock - 1; i >= 0; i--) {
					const transaction = transfer({
						recipientId: randomUtil.account().address,
						amount: randomUtil.number(100000000, 1000000000).toString(),
						passphrase: accountsFixtures.genesis.passphrase,
					});
					transactions.push(transaction);
				}
				done();
			});

			tickAndValidate(transactions);
		});

		describe('should forge 97 blocks with 1 TRANSFER transaction each to random account', () => {
			const blocksToForge = 97;
			let blocksProcessed = 0;
			const transactionsPerBlock = 1;
			const data = 'Lindsay 💖';

			async.doUntil(
				untilCb => {
					++blocksProcessed;
					const transactions = [];
					for (let t = transactionsPerBlock - 1; t >= 0; t--) {
						const transaction = transfer({
							recipientId: randomUtil.account().address,
							amount: randomUtil.number(100000000, 1000000000).toString(),
							passphrase: accountsFixtures.genesis.passphrase,
							data,
						});
						transactions.push(transaction);
					}

					__testContext.debug(
						`	Processing block ${blocksProcessed} of ${blocksToForge} with ${
							transactions.length
						} transactions`
					);
					tickAndValidate(transactions);
					untilCb();
				},
				err => {
					return err || blocksProcessed >= blocksToForge;
				}
			);
		});

		describe('forge block with 1 TRANSFER transaction to random account (last block of round)', () => {
			const transactions = [];

			before(() => {
				const transaction = transfer({
					recipientId: randomUtil.account().address,
					amount: randomUtil.number(100000000, 1000000000).toString(),
					passphrase: accountsFixtures.genesis.passphrase,
				});
				transactions.push(transaction);

				return getMemAccounts().then(_accounts => {
					round.accountsBeforeLastBlock = _.cloneDeep(_accounts);
				});
			});

			tickAndValidate(transactions);
		});

		describe('after round 1 is finished', () => {
			it('last block height should equal active delegates count', async () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return expect(lastBlock.height).to.be.equal(ACTIVE_DELEGATES);
			});

			it('should calculate rewards for round 1 correctly - all should be the same (calculated, rounds_rewards, mem_accounts)', async () => {
				return Promise.join(
					getMemAccounts(),
					Queries.getBlocks(round.current),
					Queries.getRoundRewards(round.current),
					getDelegates(),
					(_accounts, _blocks, _rewards, _delegates) => {
						const delegates = {};

						// Get genesis accounts address - should be senderId from first transaction
						const genesisAddress =
							library.genesisBlock.block.transactions[0].senderId;
						// Inject and normalize genesis account to delegates (it's not a delegate, but will get rewards split from first round)
						const genesisPublicKey = _accounts[
							genesisAddress
						].publicKey.toString('hex');
						_delegates[genesisPublicKey] = _accounts[genesisAddress];
						_delegates[genesisPublicKey].publicKey = genesisPublicKey;

						// Get expected rewards for round (calculated)
						const expectedRewards = getExpectedRoundRewards(_blocks);
						// Rewards from database table rounds_rewards should match calculated rewards
						expect(_rewards).to.deep.equal(expectedRewards);

						// Because first block of round 1 is genesis block - there will be always 1 outsider in first round
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							1
						);

						_.map(_delegates, d => {
							if (d.fees > 0 || d.rewards > 0) {
								// Normalize database data
								delegates[d.publicKey] = {
									publicKey: d.publicKey,
									fees: d.fees,
									rewards: d.rewards,
								};
							}
						});

						// Compare mem_accounts delegates with calculated
						expect(delegates).to.deep.equal(expectedRewards);
					}
				);
			});

			it('should generate a different delegate list than one generated at the beginning of round 1', async () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return generateDelegateListPromise(
					slots.calcRound(lastBlock.height + 1),
					null
				).then(delegatesList => {
					expect(delegatesList).to.not.deep.equal(round.delegatesList);
				});
			});
		});

		describe('delete last block of round 1, block contains 1 transaction type SEND', () => {
			let lastBlock;

			before(() => {
				lastBlock = library.modules.blocks.lastBlock.get();
				// Delete last block of round
				return deleteLastBlockPromise();
			});

			it('transactions from deleted block should be added back to transaction pool', done => {
				const transactionPool = library.rewiredModules.transactions.__get__(
					'__private.transactionPool'
				);

				_.each(lastBlock.transactions, transaction => {
					// Transaction should be present in transaction pool
					expect(transactionPool.transactionInPool(transaction.id)).to.equal(
						true
					);
					// Transaction should be present in queued list
					expect(transactionPool.queued.index[transaction.id]).to.be.a(
						'number'
					);
					// Remove transaction from pool
					transactionPool.removeUnconfirmedTransaction(transaction.id);
				});
				done();
			});

			it('round rewards should be empty (rewards for round 1 deleted from rounds_rewards table)', async () => {
				return expect(
					Queries.getRoundRewards(round.current)
				).to.eventually.deep.equal({});
			});

			it('mem_accounts table should be equal to one generated before last block of round deletion', async () => {
				return getMemAccounts().then(_accounts => {
					// Add back empty account, created accounts are never deleted
					const address = lastBlock.transactions[0].recipientId;
					round.accountsBeforeLastBlock[address] = accountsFixtures.dbAccount({
						address,
						balance: '0',
					});

					expect(_accounts).to.deep.equal(round.accountsBeforeLastBlock);
				});
			});

			it('delegates list should be equal to one generated at the beginning of round 1', async () => {
				const freshLastBlock = library.modules.blocks.lastBlock.get();
				return generateDelegateListPromise(
					slots.calcRound(freshLastBlock.height + 1),
					null
				).then(delegatesList => {
					expect(delegatesList).to.deep.equal(round.delegatesList);
				});
			});
		});

		describe('deleting last block of round twice in a row', () => {
			before(() => {
				return addTransactionsAndForgePromise(library, [], 0);
			});

			it('should be able to delete last block of round again', async () => {
				return deleteLastBlockPromise();
			});

			it('mem_accounts table should be equal to one generated before last block of round deletion', async () => {
				return getMemAccounts().then(_accounts => {
					expect(_accounts).to.deep.equal(round.accountsBeforeLastBlock);
				});
			});

			it('delegates list should be equal to one generated at the beginning of round 1', async () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return generateDelegateListPromise(
					slots.calcRound(lastBlock.height + 1),
					null
				).then(delegatesList => {
					expect(delegatesList).to.deep.equal(round.delegatesList);
				});
			});
		});

		describe('round rollback when forger of last block of round is unvoted', () => {
			let lastBlock;
			let lastBlockForger;
			const transactions = [];

			before(done => {
				// Set last block forger
				localCommon.getNextForger(library, null, (err, delegatePublicKey) => {
					lastBlockForger = delegatePublicKey;

					// Create unvote transaction
					const transaction = castVotes({
						passphrase: accountsFixtures.genesis.passphrase,
						unvotes: [lastBlockForger],
					});
					transactions.push(transaction);

					lastBlock = library.modules.blocks.lastBlock.get();
					// Delete one block more
					return deleteLastBlockPromise().then(() => {
						done();
					});
				});
			});

			it('last block height should be at height 99 after deleting one more block', async () => {
				const freshLastBlock = library.modules.blocks.lastBlock.get();
				return expect(freshLastBlock.height).to.equal(99);
			});
			// eslint-disable-next-line
			it('transactions from deleted block should be added back to transaction pool', done => {
				const transactionPool = library.rewiredModules.transactions.__get__(
					'__private.transactionPool'
				);

				_.each(lastBlock.transactions, transaction => {
					// Transaction should be present in transaction pool
					expect(transactionPool.transactionInPool(transaction.id)).to.equal(
						true
					);
					// Transaction should be present in queued list
					expect(transactionPool.queued.index[transaction.id]).to.be.a(
						'number'
					);
					// Remove transaction from pool
					transactionPool.removeUnconfirmedTransaction(transaction.id);
				});
				done();
			});

			it('expected forger of last block of round should have proper votes', async () => {
				return getDelegates().then(delegates => {
					const delegate = delegates[lastBlockForger];
					expect(delegate.vote).to.equal('10000000000000000');
				});
			});

			tickAndValidate(transactions);

			describe('after forging 1 block', () => {
				it('should unvote expected forger of last block of round (block data)', async () => {
					const freshLastBlock = library.modules.blocks.lastBlock.get();
					return Queries.getFullBlock(freshLastBlock.height).then(blocks => {
						expect(blocks[0].transactions[0].asset.votes[0]).to.equal(
							`-${lastBlockForger}`
						);
					});
				});

				it('expected forger of last block of round should still have proper votes', async () => {
					return getDelegates().then(delegates => {
						const delegate = delegates[lastBlockForger];
						expect(delegate.vote).to.equal('10000000000000000');
					});
				});
			});

			tickAndValidate([]);

			describe('after round finish', () => {
				it('delegates list should be different than one generated at the beginning of round 1', async () => {
					const freshLastBlock = library.modules.blocks.lastBlock.get();
					return generateDelegateListPromise(
						slots.calcRound(freshLastBlock.height + 1),
						null
					).then(delegatesList => {
						expect(delegatesList).to.not.deep.equal(round.delegatesList);
					});
				});

				it('forger of last block of previous round should have vote = 0', async () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							1
						);
						return expect(_delegates[lastBlockForger].vote).to.equal('0');
					});
				});
			});

			describe('after last block of round is deleted', () => {
				it('delegates list should be equal to one generated at the beginning of round 1', async () => {
					return deleteLastBlockPromise().then(() => {
						const freshLastBlock = library.modules.blocks.lastBlock.get();
						return generateDelegateListPromise(
							slots.calcRound(freshLastBlock.height),
							null
						).then(delegatesList => {
							expect(delegatesList).to.deep.equal(round.delegatesList);
						});
					});
				});

				it('expected forger of last block of round should have proper votes again', async () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							0
						);
						return expect(_delegates[lastBlockForger].vote).to.equal(
							'10000000000000000'
						);
					});
				});
			});
		});

		describe('round rollback when forger of last block of round is replaced in last block of round', () => {
			let lastBlock;
			let lastBlockForger;
			let tmpAccount;
			const transactions = {
				transfer: [],
				delegate: [],
				vote: [],
			};

			before(done => {
				// Set last block forger
				localCommon.getNextForger(library, null, (err, delegatePublicKey) => {
					lastBlock = library.modules.blocks.lastBlock.get();
					lastBlockForger = delegatePublicKey;
					tmpAccount = randomUtil.account();

					// Create transfer transaction (fund new account)
					let transaction = transfer({
						recipientId: tmpAccount.address,
						amount: '5000000000',
						passphrase: accountsFixtures.genesis.passphrase,
					});
					transactions.transfer.push(transaction);

					// Create register delegate transaction
					transaction = registerDelegate({
						passphrase: tmpAccount.passphrase,
						username: 'my_little_delegate',
					});
					transactions.delegate.push(transaction);

					transaction = castVotes({
						passphrase: accountsFixtures.genesis.passphrase,
						unvotes: [lastBlockForger],
						votes: [tmpAccount.publicKey],
					});
					transactions.vote.push(transaction);

					const transactionPool = library.rewiredModules.transactions.__get__(
						'__private.transactionPool'
					);
					// Delete two blocks more
					lastBlock = library.modules.blocks.lastBlock.get();
					deleteLastBlockPromise()
						.then(() => {
							_.each(lastBlock.transactions, eachTransaction => {
								// Remove transaction from pool
								transactionPool.removeUnconfirmedTransaction(
									eachTransaction.id
								);
							});
							lastBlock = library.modules.blocks.lastBlock.get();
							deleteLastBlockPromise()
								.then(() => {
									_.each(lastBlock.transactions, eachTransaction => {
										// Remove transaction from pool
										transactionPool.removeUnconfirmedTransaction(
											eachTransaction.id
										);
									});
									done();
								})
								.catch(deleteLastBlockPromiseErr => {
									done(deleteLastBlockPromiseErr);
								});
						})
						.catch(unexpectedErr => {
							done(unexpectedErr);
						});
				});
			});

			tickAndValidate(transactions.transfer);
			tickAndValidate(transactions.delegate);
			tickAndValidate(transactions.vote);

			describe('after round finish', () => {
				let delegatesList;
				let delegates;

				before(() => {
					lastBlock = library.modules.blocks.lastBlock.get();

					return Promise.join(
						getDelegates(),
						generateDelegateListPromise(
							slots.calcRound(lastBlock.height + 1),
							null
						),
						(_delegates, _delegatesList) => {
							delegatesList = _delegatesList;
							delegates = _delegates;
						}
					);
				});

				it('last block height should be at height 101', async () => {
					return expect(lastBlock.height).to.equal(101);
				});

				it('after finishing round, should unvote expected forger of last block of round and vote new delegate (block data)', async () => {
					return Queries.getFullBlock(lastBlock.height).then(blocks => {
						expect(blocks[0].transactions[0].asset.votes).to.deep.equal([
							`+${tmpAccount.publicKey}`,
							`-${lastBlockForger}`,
						]);
					});
				});

				it('delegates list should be different than one generated at the beginning of round 1', async () => {
					return expect(delegatesList).to.not.deep.equal(round.delegatesList);
				});

				it('unvoted delegate should not be on list', async () => {
					return expect(delegatesList).to.not.contain(lastBlockForger);
				});

				it('delegate who replaced unvoted one should be on list', async () => {
					return expect(delegatesList).to.contain(tmpAccount.publicKey);
				});

				it('forger of last block of previous round should have vote = 0', async () => {
					expect(delegates[round.outsiderPublicKey].missedBlocks).to.equal(1);
					return expect(delegates[lastBlockForger].vote).to.equal('0');
				});

				it('delegate who replaced last block forger should have proper votes', async () => {
					return expect(
						Number(delegates[tmpAccount.publicKey].vote)
					).to.be.above(0);
				});
			});

			describe('after last block of round is deleted', () => {
				it('delegates list should be equal to one generated at the beginning of round 1', async () => {
					return deleteLastBlockPromise().then(() => {
						lastBlock = library.modules.blocks.lastBlock.get();
						return generateDelegateListPromise(
							slots.calcRound(lastBlock.height),
							null
						).then(delegatesList => {
							expect(delegatesList).to.deep.equal(round.delegatesList);
						});
					});
				});

				it('last block height should be at height 100', async () => {
					return expect(lastBlock.height).to.equal(100);
				});

				it('expected forger of last block of round should have proper votes again', async () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							0
						);
						return expect(_delegates[lastBlockForger].vote).to.equal(
							'10000000000000000'
						);
					});
				});

				it('delegate who replaced last block forger should have vote, producedBlocks, missedBlocks = 0', async () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[tmpAccount.publicKey].vote).to.equal('0');
						expect(_delegates[tmpAccount.publicKey].producedBlocks).to.equal(0);
						expect(_delegates[tmpAccount.publicKey].missedBlocks).to.equal(0);
					});
				});
			});
		});
	});

	describe('round 2', () => {
		describe('rounds rewards consistency', () => {
			let expectedRewardsPerBlock;

			describe('should forge 49 blocks with 1 TRANSFER transaction each to random account', () => {
				const blocksToForge = 49;
				let blocksProcessed = 0;
				const transactionsPerBlock = 1;

				before(done => {
					const transactionPool = library.rewiredModules.transactions.__get__(
						'__private.transactionPool'
					);
					transactionPool.queued.transactions = [];

					// Set expected reward per block
					expectedRewardsPerBlock = 0;
					done();
				});

				async.doUntil(
					untilCb => {
						++blocksProcessed;
						const transactions = [];
						for (let t = transactionsPerBlock - 1; t >= 0; t--) {
							const transaction = transfer({
								recipientId: randomUtil.account().address,
								amount: randomUtil.number(100000000, 1000000000).toString(),
								passphrase: accountsFixtures.genesis.passphrase,
							});
							transactions.push(transaction);
						}

						__testContext.debug(
							`	Processing block ${blocksProcessed} of ${blocksToForge} with ${
								transactions.length
							} transactions`
						);
						tickAndValidate(transactions);
						untilCb();
					},
					err => {
						return err || blocksProcessed >= blocksToForge;
					}
				);
			});

			describe('before rewards start', () => {
				it('last block height should be at height 149', async () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return expect(lastBlock.height).to.equal(149);
				});

				it('block just before rewards start should have reward = 0', async () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return expect(lastBlock.reward.isEqualTo(expectedRewardsPerBlock)).to
						.be.true;
				});
			});

			describe('after rewards start', () => {
				const blocksToForge = 53;
				let blocksProcessed = 0;
				const transactionsPerBlock = 1;

				before(done => {
					const transactionPool = library.rewiredModules.transactions.__get__(
						'__private.transactionPool'
					);
					transactionPool.queued.transactions = [];

					// Set expected reward per block as first milestone
					expectedRewardsPerBlock = REWARDS.MILESTONES[0];
					done();
				});

				async.doUntil(
					untilCb => {
						++blocksProcessed;
						const transactions = [];
						for (let t = transactionsPerBlock - 1; t >= 0; t--) {
							const transaction = transfer({
								recipientId: randomUtil.account().address,
								amount: randomUtil.number(100000000, 1000000000).toString(),
								passphrase: accountsFixtures.genesis.passphrase,
							});
							transactions.push(transaction);
						}

						__testContext.debug(
							`	Processing block ${blocksProcessed} of ${blocksToForge} with ${
								transactions.length
							} transactions`
						);
						tickAndValidate(transactions);

						describe('rewards check', () => {
							it('all blocks from now until round end should have proper rewards (5 LSK)', async () => {
								const lastBlock = library.modules.blocks.lastBlock.get();
								return expect(
									lastBlock.reward.isEqualTo(expectedRewardsPerBlock)
								).to.be.true;
							});
						});

						untilCb();
					},
					err => {
						return err || blocksProcessed >= blocksToForge;
					}
				);
			});

			describe('after finish round', () => {
				it('should calculate rewards for round 2 correctly - all should be the same (native, rounds_rewards)', async () => {
					return Promise.join(
						Queries.getBlocks(2),
						Queries.getRoundRewards(2),
						(_blocks, _rewards) => {
							// Get expected rewards for round (native)
							const expectedRewards = getExpectedRoundRewards(_blocks);
							// Rewards from database table rounds_rewards should match native rewards
							expect(_rewards).to.deep.equal(expectedRewards);
						}
					);
				});
			});
		});
	});

	describe('rollback more than 1 round of blocks', () => {
		let lastBlock;

		before(() => {
			return Promise.mapSeries([...Array(101)], async () => {
				return deleteLastBlockPromise();
			});
		});

		it('last block height should be at height 101', async () => {
			lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.equal(101);
		});

		it('should fail when try to delete one more block (last block of round 1)', async () => {
			return expect(deleteLastBlockPromise()).to.eventually.be.rejectedWith(
				'Snapshot for round 1 not available'
			);
		});

		it('last block height should be still at height 101', async () => {
			lastBlock = library.modules.blocks.lastBlock.get();
			return expect(lastBlock.height).to.equal(101);
		});
	});

	describe('deleting last block of round twice in a row - no transactions during round', () => {
		before(() => {
			return Promise.mapSeries([...Array(202)], async () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('should be able to delete last block of round', async () => {
			return deleteLastBlockPromise();
		});

		it('should be able to delete last block of round again', async () => {
			return addTransactionsAndForgePromise(library, [], 0).then(() => {
				return deleteLastBlockPromise();
			});
		});
	});
});
