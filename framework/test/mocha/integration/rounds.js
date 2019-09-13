/*
 * Copyright © 2019 Lisk Foundation
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
const _ = require('lodash');
const { promisify } = require('util');
const {
	transfer,
	castVotes,
	registerDelegate,
} = require('@liskhq/lisk-transactions');
const BigNum = require('@liskhq/bignum');
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const Promise = require('bluebird');
const { hexToBuffer } = require('@liskhq/lisk-cryptography');
const { Slots } = require('../../../src/modules/chain/dpos');
const accountsFixtures = require('../fixtures/accounts');
const randomUtil = require('../common/utils/random');
const QueriesHelper = require('../common/integration/sql/queries_helper');
const localCommon = require('./common');

const { ACTIVE_DELEGATES } = global.constants;

describe('rounds', () => {
	const slots = new Slots({
		epochTime: __testContext.config.constants.EPOCH_TIME,
		interval: __testContext.config.constants.BLOCK_TIME,
		blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
	});
	let library;
	let Queries;
	let addTransactionsAndForgePromise;

	localCommon.beforeBlock('rounds', lib => {
		library = lib;
		// Set rewards start at 150-th block
		library.modules.blocks.blockRewardArgs.rewardOffset = 150;
		Queries = new QueriesHelper(lib, lib.components.storage);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge,
		);
	});

	function getMemAccounts() {
		return Queries.getAccounts().then(rows => {
			const accounts = {};
			_.map(rows, acc => {
				acc.nameExist = acc.nameexist;
				acc.multiLifetime = acc.multilifetime;
				delete acc.nameexist;
				delete acc.multilifetime;

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
		const lastBlock = library.modules.blocks.lastBlock;

		// Update last block forger account
		const found = _.find(accounts, {
			publicKey: hexToBuffer(lastBlock.generatorPublicKey),
		});
		if (found) {
			found.producedBlocks += 1;
		}

		// Mutate states - apply every transaction to expected states
		_.each(transactions, transaction => {
			// SENDER: Get address from senderId or if not available - get from senderPublicKey
			let address =
				transaction.senderId ||
				getAddressFromPublicKey(transaction.senderPublicKey);

			// If account with address exists - set expected values
			if (accounts[address]) {
				// Update sender
				accounts[address].balance = new BigNum(accounts[address].balance)
					.minus(
						new BigNum(transaction.fee).plus(new BigNum(transaction.amount)),
					)
					.toString();

				// Set public key if not present
				if (!accounts[address].publicKey) {
					accounts[address].publicKey = Buffer.from(
						transaction.senderPublicKey,
						'hex',
					);
				}

				// Apply register delegate transaction
				if (transaction.type === 2) {
					accounts[address].username = transaction.asset.delegate.username;
					accounts[address].isDelegate = 1;
				}
			}

			// RECIPIENT: Get address from recipientId
			address = transaction.recipientId;
			// Perform only when address exists (exclude non-standard tyransaction types)
			if (address) {
				// If account with address exists - set expected values
				if (accounts[address]) {
					// Update recipient
					accounts[address].balance = new BigNum(accounts[address].balance)
						.plus(new BigNum(transaction.amount))
						.toString();
				} else {
					// Funds sent to new account - create account with default values
					accounts[address] = accountsFixtures.dbAccount({
						address,
						balance: new BigNum(transaction.amount).toString(),
					});
				}
			}
		});
		return accounts;
	}

	function getExpectedRoundRewards(blocks) {
		const rewards = {};

		const feesTotal = _.reduce(
			blocks,
			(fees, block) => {
				return new BigNum(fees).plus(block.totalFee);
			},
			0,
		);

		const rewardsTotal = _.reduce(
			blocks,
			(reward, block) => {
				return new BigNum(reward).plus(block.reward);
			},
			0,
		);

		const feesPerDelegate = new BigNum(feesTotal.toPrecision(15))
			.dividedBy(ACTIVE_DELEGATES)
			.floor();
		const feesRemaining = new BigNum(feesTotal.toPrecision(15)).minus(
			feesPerDelegate.times(ACTIVE_DELEGATES),
		);

		__testContext.debug(
			`	Total fees: ${feesTotal} Fees per delegates: ${feesPerDelegate} Remaining fees: ${feesRemaining} Total rewards: ${rewardsTotal}`,
		);

		_.each(blocks, (block, index) => {
			const publicKey = block.generatorPublicKey.toString('hex');
			if (rewards[publicKey]) {
				rewards[publicKey].fees = rewards[publicKey].fees.plus(feesPerDelegate);
				rewards[publicKey].rewards = rewards[publicKey].rewards.plus(
					block.reward,
				);
			} else {
				rewards[publicKey] = {
					publicKey,
					fees: new BigNum(feesPerDelegate),
					rewards: new BigNum(block.reward),
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

	function applyRoundRewards(_accounts, blocks) {
		const accounts = _.cloneDeep(_accounts);
		const expectedRewards = getExpectedRoundRewards(blocks);
		_.each(expectedRewards, reward => {
			const found = _.find(accounts, {
				publicKey: hexToBuffer(reward.publicKey),
			});
			if (found) {
				found.fees = new BigNum(found.fees)
					.plus(new BigNum(reward.fees))
					.toString();
				found.rewards = new BigNum(found.rewards)
					.plus(new BigNum(reward.rewards))
					.toString();
				found.balance = new BigNum(found.balance)
					.plus(new BigNum(reward.fees))
					.plus(new BigNum(reward.rewards))
					.toString();
			}
		});

		return accounts;
	}

	function recalculateVoteWeight(_accounts, voters) {
		const accounts = _.cloneDeep(_accounts);

		// Reset voteWeight for all accounts
		_.each(accounts, account => {
			account.voteWeight = '0';
		});

		// Recalculate voteWeight
		_.each(voters, delegate => {
			let votes = '0';
			const found = _.find(accounts, {
				publicKey: hexToBuffer(delegate.dependentId),
			});

			_.each(delegate.array_agg, voter => {
				const foundAccount = _.find(accounts, {
					address: voter,
				});
				votes = new BigNum(votes)
					.plus(new BigNum(foundAccount.balance))
					.toString();
			});
			found.voteWeight = votes;
		});

		return accounts;
	}

	function applyOutsiders(_accounts, delegatesList, blocks) {
		const accounts = _.cloneDeep(_accounts);

		// Get all public keys of delegates that forged blocks in current round
		const blockGeneratorsPublicKeys = blocks.map(b =>
			b.generatorPublicKey.toString('hex'),
		);
		// Get public keys of delegates who were expected to forge in current round but they didn't
		const roundOutsidersList = _.difference(
			delegatesList,
			blockGeneratorsPublicKeys,
		);

		// Increase missed blocks counter for every outsider
		roundOutsidersList.forEach(publicKey => {
			const account = _.find(accounts, {
				publicKey: hexToBuffer(publicKey),
			});
			account.missedBlocks += 1;
		});

		return accounts;
	}

	function tickAndValidate(transactions) {
		const tick = { before: {}, after: {} };

		describe('new block', () => {
			before(() => {
				tick.before.block = library.modules.blocks.lastBlock;
				tick.before.round = slots.calcRound(tick.before.block.height);

				return Promise.join(
					getMemAccounts(),
					getDelegates(),
					library.modules.dpos.getRoundDelegates(tick.before.round),
					Queries.getDelegatesOrderedByVoteWeight(),
					(_accounts, _delegates, _delegatesList, _delegatesOrderedByVote) => {
						tick.before.accounts = _.cloneDeep(_accounts);
						tick.before.delegates = _.cloneDeep(_delegates);
						tick.before.delegatesList = _.cloneDeep(_delegatesList);
						tick.before.delegatesOrderedByVoteWeight = _.cloneDeep(
							_delegatesOrderedByVote,
						);
					},
				).then(() => {
					return addTransactionsAndForgePromise(library, transactions, 0).then(
						async () => {
							tick.after.block = library.modules.blocks.lastBlock;
							tick.after.round = slots.calcRound(tick.after.block.height);
							// Detect if round changed
							tick.isRoundChanged = tick.before.round !== tick.after.round;
							// Detect last block of round
							tick.isLastBlockOfRound =
								tick.after.block.height % ACTIVE_DELEGATES === 0;

							return Promise.join(
								getMemAccounts(),
								getDelegates(),
								library.modules.dpos.getRoundDelegates(
									slots.calcRound(tick.after.block.height + 1),
								),
								Queries.getDelegatesOrderedByVoteWeight(),
								(
									_accounts,
									_delegates,
									_delegatesList,
									_delegatesOrderedByVote,
								) => {
									tick.after.accounts = _.cloneDeep(_accounts);
									tick.after.delegates = _.cloneDeep(_delegates);
									tick.after.delegatesList = _.cloneDeep(_delegatesList);
									tick.after.delegatesOrderedByVoteWeight = _.cloneDeep(
										_delegatesOrderedByVote,
									);

									if (tick.isLastBlockOfRound) {
										return Promise.join(
											Queries.getBlocks(tick.after.round),
											Queries.getVoters(),
											(_blocks, _voters) => {
												tick.roundBlocks = _blocks;
												tick.roundVoters = _voters;
												tick.currentVoters = _voters;
											},
										);
									}

									return Queries.getVoters().then(_voters => {
										tick.currentVoters = _voters;
									});
								},
							);
						},
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
					tick.before.block.height + 1,
				);
			});

			it('should contain all expected transactions', async () => {
				return expect(transactions.map(t => t.id).sort()).to.be.deep.equal(
					tick.after.block.transactions.map(t => t.id).sort(),
				);
			});

			describe('mem_accounts table', () => {
				it('if block contains at least one transaction states before and after block should be different', done => {
					if (transactions.length > 0) {
						expect(tick.before.accounts).to.not.deep.equal(tick.after.accounts);
					}
					done();
				});

				it('delegates ordered by voteWeight should change when round changes', async () => {
					if (tick.isRoundChanged) {
						return expect(
							tick.before.delegatesOrderedByVoteWeight,
						).to.not.deep.equal(tick.after.delegatesOrderedByVoteWeight);
					}
					return true;
				});

				it('delegates list should be the same for same round', async () => {
					if (tick.isLastBlockOfRound || tick.isRoundChanged) {
						return expect(tick.before.delegatesList).to.not.deep.equal(
							tick.after.delegatesList,
						);
					}

					return expect(tick.before.delegatesList).to.deep.equal(
						tick.after.delegatesList,
					);
				});

				it('accounts table states should match expected states', done => {
					let expected;

					expected = expectedMemState(transactions, tick.before.accounts);
					expected = recalculateVoteWeight(expected, tick.currentVoters);

					// Last block of round - apply round expectactions
					if (tick.isLastBlockOfRound) {
						expected = applyRoundRewards(expected, tick.roundBlocks);
						expected = applyOutsiders(
							expected,
							tick.before.delegatesList,
							tick.roundBlocks,
						);
					}

					expect(tick.after.accounts).to.deep.equal(expected);
					done();
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
			const lastBlock = library.modules.blocks.lastBlock;

			// Copy initial states for later comparison
			return Promise.join(
				getMemAccounts(),
				getDelegates(),
				library.modules.dpos.getRoundDelegates(
					slots.calcRound(lastBlock.height),
				),
				(_accounts, _delegates, _delegatesList) => {
					// Get genesis accounts address - should be senderId from first transaction
					const genesisAddress =
						library.genesisBlock.block.transactions[0].senderId;
					// Inject and normalize genesis account to delegates (it's not a delegate, but will get rewards split from first round)
					const genesisPublicKey = _accounts[genesisAddress].publicKey.toString(
						'hex',
					);
					_delegates[genesisPublicKey] = _accounts[genesisAddress];
					_delegates[genesisPublicKey].publicKey = genesisPublicKey;

					round.delegatesList = _delegatesList;
					round.accounts = _.cloneDeep(_accounts);
					round.delegates = _.cloneDeep(_delegates);
				},
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
						} transactions`,
					);
					tickAndValidate(transactions);
					untilCb();
				},
				err => {
					return err || blocksProcessed >= blocksToForge;
				},
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
				const lastBlock = library.modules.blocks.lastBlock;
				return expect(lastBlock.height).to.be.equal(ACTIVE_DELEGATES);
			});

			it('should calculate rewards for round 1 correctly - all should be the same (calculated, rounds_rewards, mem_accounts)', async () => {
				return Promise.join(
					getMemAccounts(),
					Queries.getBlocks(round.current),
					Queries.getRoundRewards(round.current, ACTIVE_DELEGATES),
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
						// Rewards from database should match calculated rewards
						expect(_rewards).to.deep.equal(expectedRewards);

						// Because first block of round 1 is genesis block - there will be always 1 outsider in first round
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							1,
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
					},
				);
			});

			it('should generate a different delegate list than one generated at the beginning of round 1', async () => {
				const lastBlock = library.modules.blocks.lastBlock;
				const delegatesList = await library.modules.dpos.getRoundDelegates(
					slots.calcRound(lastBlock.height + 1),
				);

				return expect(delegatesList).to.not.deep.equal(round.delegatesList);
			});
		});

		describe('delete last block of round 1, block contains 1 transaction type SEND', () => {
			let lastBlock;

			before(async () => {
				lastBlock = _.cloneDeep(library.modules.blocks.lastBlock);
				await library.modules.processor.deleteLastBlock();
			});

			// eslint-disable-next-line mocha/no-skipped-tests
			it.skip('transactions from deleted block should be added back to transaction pool', done => {
				const transactionPool = library.modules.transactionPool;

				_.each(lastBlock.transactions, transaction => {
					// Transaction should be present in transaction pool
					expect(transactionPool.transactionInPool(transaction.id)).to.equal(
						true,
					);
					// Remove transaction from pool
					transactionPool.onConfirmedTransactions([transaction]);
				});
				done();
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
				const freshLastBlock = library.modules.blocks.lastBlock;
				const delegatesList = await library.modules.dpos.getRoundDelegates(
					slots.calcRound(freshLastBlock.height + 1),
				);
				return expect(delegatesList).to.deep.equal(round.delegatesList);
			});
		});

		describe('deleting last block of round twice in a row', () => {
			before(() => {
				return addTransactionsAndForgePromise(library, [], 0);
			});

			it('should be able to delete last block of round again', async () => {
				await library.modules.processor.deleteLastBlock();
			});

			it('mem_accounts table should be equal to one generated before last block of round deletion', async () => {
				return getMemAccounts().then(_accounts => {
					expect(_accounts).to.deep.equal(round.accountsBeforeLastBlock);
				});
			});

			it('delegates list should be equal to one generated at the beginning of round 1', async () => {
				const lastBlock = library.modules.blocks.lastBlock;
				const delegatesList = await library.modules.dpos.getRoundDelegates(
					slots.calcRound(lastBlock.height + 1),
				);
				return expect(delegatesList).to.deep.equal(round.delegatesList);
			});
		});

		describe('round rollback when forger of last block of round is unvoted', () => {
			let lastBlock;
			let lastBlockForger;
			const transactions = [];

			before(async () => {
				// Set last block forger
				const promisifiedGetNextForger = promisify(localCommon.getNextForger);
				const delegatePublicKey = await promisifiedGetNextForger(library, null);
				lastBlockForger = delegatePublicKey;

				// Create unvote transaction
				const transaction = castVotes({
					passphrase: accountsFixtures.genesis.passphrase,
					unvotes: [lastBlockForger],
				});
				transactions.push(transaction);

				lastBlock = library.modules.blocks.lastBlock;

				// Delete one block more
				await library.modules.processor.deleteLastBlock();
			});

			it('last block height should be at height 99 after deleting one more block', async () => {
				const freshLastBlock = library.modules.blocks.lastBlock;
				return expect(freshLastBlock.height).to.equal(99);
			});

			// eslint-disable-next-line mocha/no-skipped-tests
			it.skip('transactions from deleted block should be added back to transaction pool', done => {
				const transactionPool = library.modules.transactionPool;

				_.each(lastBlock.transactions, transaction => {
					// Transaction should be present in transaction pool
					expect(transactionPool.transactionInPool(transaction.id)).to.equal(
						true,
					);
					// Remove transaction from pool
					transactionPool.onConfirmedTransactions([transaction]);
				});
				done();
			});

			it('expected forger of last block of round to have voteWeight > 0', async () => {
				return getDelegates().then(delegates => {
					const delegate = delegates[lastBlockForger];
					return expect(Number(delegate.voteWeight)).to.be.above(0);
				});
			});

			tickAndValidate(transactions);

			describe('after forging 1 block', () => {
				it('should unvote expected forger of last block of round (block data)', async () => {
					const freshLastBlock = library.modules.blocks.lastBlock;
					return Queries.getFullBlock(freshLastBlock.height).then(blocks => {
						expect(blocks[0].transactions[0].asset.votes[0]).to.equal(
							`-${lastBlockForger}`,
						);
					});
				});

				it('expected forger of last block of round to have voteWeight = 0', async () => {
					return getDelegates().then(delegates => {
						const delegate = delegates[lastBlockForger];
						expect(delegate.voteWeight).to.equal('0');
					});
				});
			});

			tickAndValidate([]);

			describe('after round finish', () => {
				it('delegates list should be different than one generated at the beginning of round 1', async () => {
					const freshLastBlock = library.modules.blocks.lastBlock;
					const delegatesList = await library.modules.dpos.getRoundDelegates(
						slots.calcRound(freshLastBlock.height + 1),
					);
					return expect(delegatesList).to.not.deep.equal(round.delegatesList);
				});

				it('expected forger of last block of round to have voteWeight = 0', async () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							1,
						);
						return expect(_delegates[lastBlockForger].voteWeight).to.equal('0');
					});
				});
			});

			describe('after last block of round is deleted', () => {
				it('delegates list should be equal to one generated at the beginning of round 1', async () => {
					return library.modules.processor.deleteLastBlock().then(() => {
						const freshLastBlock = _.cloneDeep(
							library.modules.blocks.lastBlock,
						);
						return library.modules.dpos
							.getRoundDelegates(slots.calcRound(freshLastBlock.height))
							.then(delegatesList => {
								expect(delegatesList).to.deep.equal(round.delegatesList);
							});
					});
				});

				it('expected forger of last block of round to have voteWeight = 0', async () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							0,
						);
						return expect(_delegates[lastBlockForger].voteWeight).to.equal('0');
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
					lastBlock = library.modules.blocks.lastBlock;
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

					const transactionPool = library.modules.transactionPool;
					// Delete two blocks more
					lastBlock = _.cloneDeep(library.modules.blocks.lastBlock);
					library.modules.processor
						.deleteLastBlock()
						.then(() => {
							_.each(lastBlock.transactions, eachTransaction => {
								// Remove transaction from pool
								transactionPool.onConfirmedTransactions([eachTransaction]);
							});
							lastBlock = _.cloneDeep(library.modules.blocks.lastBlock);
							library.modules.processor
								.deleteLastBlock()
								.then(() => {
									_.each(lastBlock.transactions, eachTransaction => {
										// Remove transaction from pool
										transactionPool.onConfirmedTransactions([eachTransaction]);
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
					lastBlock = library.modules.blocks.lastBlock;

					return Promise.join(
						getDelegates(),
						library.modules.dpos.getRoundDelegates(
							slots.calcRound(lastBlock.height + 1),
						),
						(_delegates, _delegatesList) => {
							delegatesList = _delegatesList;
							delegates = _delegates;
						},
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

				it('forger of last block of previous round should have voteWeight = 0', async () => {
					expect(delegates[round.outsiderPublicKey].missedBlocks).to.equal(1);
					return expect(delegates[lastBlockForger].voteWeight).to.equal('0');
				});

				it('delegate who replaced last block forger should have proper votes', async () => {
					return expect(
						Number(delegates[tmpAccount.publicKey].voteWeight),
					).to.be.above(0);
				});
			});

			describe('after last block of round is deleted', () => {
				it('delegates list should be equal to one generated at the beginning of round 1', async () => {
					return library.modules.processor.deleteLastBlock().then(() => {
						lastBlock = _.cloneDeep(library.modules.blocks.lastBlock);
						return library.modules.dpos
							.getRoundDelegates(slots.calcRound(lastBlock.height))
							.then(delegatesList => {
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
							0,
						);
						return expect(
							Number(_delegates[lastBlockForger].voteWeight),
						).to.be.above(0);
					});
				});

				it('delegate who replaced last block forger should have voteWeight, producedBlocks, missedBlocks = 0', async () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[tmpAccount.publicKey].voteWeight).to.equal('0');
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
					const transactionPool = library.modules.transactionPool;
					transactionPool.resetPool();

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
							} transactions`,
						);
						tickAndValidate(transactions);
						untilCb();
					},
					err => {
						return err || blocksProcessed >= blocksToForge;
					},
				);
			});

			describe('before rewards start', () => {
				it('last block height should be at height 149', async () => {
					const lastBlock = library.modules.blocks.lastBlock;
					return expect(lastBlock.height).to.equal(149);
				});

				it('block just before rewards start should have reward = 0', async () => {
					const lastBlock = library.modules.blocks.lastBlock;
					return expect(lastBlock.reward.equals(expectedRewardsPerBlock)).to.be
						.true;
				});
			});

			describe('after rewards start', () => {
				const blocksToForge = 53;
				let blocksProcessed = 0;
				const transactionsPerBlock = 1;

				before(done => {
					const transactionPool = library.modules.transactionPool;
					transactionPool.resetPool();

					// Set expected reward per block as first milestone
					expectedRewardsPerBlock =
						library.modules.blocks.blockRewardArgs.milestones[0];
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
							} transactions`,
						);
						tickAndValidate(transactions);

						describe('rewards check', () => {
							it('all blocks from now until round end should have proper rewards (5 LSK)', async () => {
								const lastBlock = library.modules.blocks.lastBlock;
								return expect(lastBlock.reward.equals(expectedRewardsPerBlock))
									.to.be.true;
							});
						});

						untilCb();
					},
					err => {
						return err || blocksProcessed >= blocksToForge;
					},
				);
			});

			describe('after finish round', () => {
				it('should calculate rewards for round 2 correctly - all should be the same (native, rounds_rewards)', async () => {
					return Promise.join(
						Queries.getBlocks(2),
						Queries.getRoundRewards(2, ACTIVE_DELEGATES),
						(_blocks, _rewards) => {
							// Get expected rewards for round (native)
							const expectedRewards = getExpectedRoundRewards(_blocks);
							// Rewards from database table rounds_rewards should match native rewards
							expect(_rewards).to.deep.equal(expectedRewards);
						},
					);
				});
			});
		});
	});

	describe('rollback more than 1 round of blocks', () => {
		let lastBlock;

		before(() => {
			return Promise.mapSeries([...Array(102)], async () => {
				return library.modules.processor.deleteLastBlock();
			});
		});

		it('last block height should be at height 100', async () => {
			lastBlock = library.modules.blocks.lastBlock;
			return expect(lastBlock.height).to.equal(100);
		});
	});

	describe('deleting last block of round twice in a row - no transactions during round', () => {
		before(() => {
			return Promise.mapSeries([...Array(202)], async () => {
				return addTransactionsAndForgePromise(library, [], 0);
			});
		});

		it('should be able to delete last block of round', async () => {
			await library.modules.processor.deleteLastBlock();
		});

		it('should be able to delete last block of round again', async () => {
			await addTransactionsAndForgePromise(library, [], 0);
			await library.modules.processor.deleteLastBlock();
		});
	});
});
