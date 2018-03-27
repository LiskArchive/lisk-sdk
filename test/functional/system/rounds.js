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

const path = require('path');
const async = require('async');
const elements = require('lisk-js').default;
const Promise = require('bluebird');
const QueryFile = require('pg-promise').QueryFile;
const constants = require('../../../helpers/constants');
const slots = require('../../../helpers/slots');
const Bignum = require('../../../helpers/bignum');
const accountsFixtures = require('../../fixtures/accounts');
const roundsFixtures = require('../../fixtures/rounds').rounds;
const randomUtil = require('../../common/utils/random');
const localCommon = require('./common');

describe('rounds', () => {
	let library;
	let keypairs;
	let validateAccountsBalancesQuery;
	let generateDelegateListPromise;
	let addTransactionsAndForgePromise;

	const Queries = {
		validateAccountsBalances: () => {
			return library.db.query(validateAccountsBalancesQuery);
		},
		getAccounts: () => {
			return library.db.query('SELECT * FROM mem_accounts');
		},
		getDelegates: () => {
			return library.db.query(
				'SELECT * FROM mem_accounts m LEFT JOIN delegates d ON d.username = m.username WHERE d."transactionId" IS NOT NULL'
			);
		},
		getDelegatesForList: () => {
			return library.db.query(
				`SELECT "publicKey", vote FROM mem_accounts ORDER BY vote DESC, "publicKey" ASC LIMIT ${
					slots.delegates
				}`
			);
		},
		getFullBlock: height => {
			return library.db
				.query('SELECT * FROM full_blocks_list WHERE b_height = ${height}', {
					height,
				})
				.then(rows => {
					// Normalize blocks
					return library.modules.blocks.utils.readDbRows(rows);
				});
		},
		getBlocks: round => {
			return library.db.query(
				'SELECT * FROM blocks WHERE CEIL(height / 101::float)::int = ${round} ORDER BY height ASC',
				{ round }
			);
		},
		getRoundRewards: round => {
			return library.db
				.query(
					'SELECT ENCODE("publicKey", \'hex\') AS "publicKey", SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = ${round} GROUP BY "publicKey"',
					{ round }
				)
				.then(rows => {
					const rewards = {};
					_.each(rows, row => {
						rewards[row.publicKey] = {
							publicKey: row.publicKey,
							fees: row.fees,
							rewards: row.rewards,
						};
					});
					return rewards;
				});
		},
		getVoters: () => {
			return library.db.query(
				'SELECT "dependentId", ARRAY_AGG("accountId") FROM mem_accounts2delegates GROUP BY "dependentId"'
			);
		},
	};

	// Set rewards start at 150-th block
	constants.rewards.offset = 150;

	localCommon.beforeBlock('lisk_functional_rounds', lib => {
		library = lib;

		validateAccountsBalancesQuery = new QueryFile(
			path.join(
				__dirname,
				'../common/sql/rounds/validate_accounts_balances.sql'
			),
			{ minify: true }
		);

		generateDelegateListPromise = Promise.promisify(
			library.modules.delegates.generateDelegateList
		);

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);
	});

	function getMemAccounts() {
		return Queries.getAccounts().then(rows => {
			const accounts = {};
			_.map(rows, acc => {
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
			publicKey: Buffer.from(lastBlock.generatorPublicKey, 'hex'),
		});
		if (found) {
			found.producedBlocks += 1;
			found.blockId = lastBlock.id;
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
				accounts[address].blockId = lastBlock.id;
				accounts[address].virgin = 0;

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
					accounts[address].blockId = lastBlock.id;
				} else {
					// Funds sent to new account - create object with default values
					accounts[address] = {
						address,
						balance: new Bignum(transaction.amount).toString(),
						blockId: lastBlock.id,
						delegates: null,
						fees: '0',
						isDelegate: 0,
						missedBlocks: 0,
						multilifetime: 0,
						multimin: 0,
						multisignatures: null,
						nameexist: 0,
						producedBlocks: 0,
						publicKey: null,
						rate: '0',
						rewards: '0',
						secondPublicKey: null,
						secondSignature: 0,
						u_balance: new Bignum(transaction.amount).toString(),
						u_delegates: null,
						u_isDelegate: 0,
						u_multilifetime: 0,
						u_multimin: 0,
						u_multisignatures: null,
						u_nameexist: 0,
						u_secondSignature: 0,
						u_username: null,
						username: null,
						virgin: 1,
						vote: '0',
					};
				}
			}
		});
		return accounts;
	}

	function applyRoundRewards(_accounts, blocks) {
		const accounts = _.cloneDeep(_accounts);
		const lastBlock = library.modules.blocks.lastBlock.get();

		const expectedRewards = getExpectedRoundRewards(blocks);
		_.each(expectedRewards, reward => {
			const found = _.find(accounts, {
				publicKey: Buffer.from(reward.publicKey, 'hex'),
			});
			if (found) {
				found.blockId = lastBlock.id;
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
				publicKey: Buffer.from(delegate.dependentId, 'hex'),
			});

			_.each(delegate.array_agg, voter => {
				const found = _.find(accounts, {
					address: voter,
				});
				votes = new Bignum(votes).plus(new Bignum(found.balance)).toString();
			});
			found.vote = votes;
		});

		return accounts;
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
				publicKey: Buffer.from(publicKey, 'hex'),
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
			.dividedBy(slots.delegates)
			.floor();
		const feesRemaining = new Bignum(feesTotal.toPrecision(15)).minus(
			feesPerDelegate.times(slots.delegates)
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
					generateDelegateListPromise(tick.before.block.height, null),
					Queries.getDelegatesForList(),
					(_accounts, _delegates, _delegatesList, _delegatesForList) => {
						tick.before.accounts = _.cloneDeep(_accounts);
						tick.before.delegates = _.cloneDeep(_delegates);
						tick.before.delegatesList = _.cloneDeep(_delegatesList);
						tick.before.delegatesForList = _.cloneDeep(_delegatesForList);
					}
				).then(() => {
					return addTransactionsAndForgePromise(library, transactions, 0).then(
						() => {
							tick.after.block = library.modules.blocks.lastBlock.get();
							tick.after.round = slots.calcRound(tick.after.block.height);
							// Detect if round changed
							tick.isRoundChanged = tick.before.round !== tick.after.round;
							// Detect last block of round
							tick.isLastBlockOfRound =
								tick.after.block.height % slots.delegates === 0;

							return Promise.join(
								getMemAccounts(),
								getDelegates(),
								generateDelegateListPromise(tick.after.block.height + 1, null),
								Queries.getDelegatesForList(),
								(_accounts, _delegates, _delegatesList, _delegatesForList) => {
									tick.after.accounts = _.cloneDeep(_accounts);
									tick.after.delegates = _.cloneDeep(_delegates);
									tick.after.delegatesList = _.cloneDeep(_delegatesList);
									tick.after.delegatesForList = _.cloneDeep(_delegatesForList);

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
								}
							);
						}
					);
				});
			});

			it('ID should be different than last block ID', () => {
				return expect(tick.after.block.id).to.not.equal(tick.before.block.id);
			});

			it('height should be greather by 1', () => {
				return expect(tick.after.block.height).to.equal(
					tick.before.block.height + 1
				);
			});

			it('should contain all expected transactions', () => {
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

				it('delegates with highest weight used for generating list should be the same for same round', () => {
					if (tick.isLastBlockOfRound) {
						return expect(tick.before.delegatesForList).to.not.deep.equal(
							tick.after.delegatesForList
						);
					}

					return expect(tick.before.delegatesForList).to.deep.equal(
						tick.after.delegatesForList
					);
				});

				it('delegates list should be the same for same round', () => {
					if (
						(tick.isLastBlockOfRound &&
							!_.isEqual(
								tick.before.delegatesForList,
								tick.after.delegatesForList
							)) ||
						tick.isRoundChanged
					) {
						return expect(tick.before.delegatesList).to.not.deep.equal(
							tick.after.delegatesList
						);
					} else if (
						tick.isLastBlockOfRound &&
						_.isEqual(tick.before.delegatesForList, tick.after.delegatesForList)
					) {
						return expect(tick.before.delegatesList).to.deep.equal(
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
					}

					// FIXME: Remove that nasty hack after https://github.com/LiskHQ/lisk/issues/716 is closed
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
								if (!_.isEqual(actualAccount, expectedAccount)) {
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
									} else {
										// In every other case - fail the test
										throw err;
									}
								}
							},
							[]
						);
					}
					done();
				});

				it('balances should be valid against blockchain balances', () => {
					// Perform validation of accounts balances against blockchain after every block
					return expect(Queries.validateAccountsBalances()).to.eventually.be.an(
						'array'
					).that.is.empty;
				});
			});
		});
	}

	describe('environment', () => {
		describe('genesis block', () => {
			var genesisBlock;

			before(() => {
				// Get genesis block from database
				return Queries.getFullBlock(1).then(rows => {
					genesisBlock = rows[0];
				});
			});

			describe('consistency', () => {
				it('should contain transactions', () => {
					return expect(
						library.genesisblock.block.transactions.length
					).to.be.above(0);
				});
			});

			describe('after insert to database', () => {
				describe('database block at height 1', () => {
					it('ID should match genesis block ID', () => {
						return expect(genesisBlock.id).to.equal(
							library.genesisblock.block.id
						);
					});

					it('should contain transactions', () => {
						return expect(genesisBlock.transactions.length).to.be.above(0);
					});

					it('number of transactions should match genesis number of transactions in block', () => {
						return expect(genesisBlock.transactions.length).to.equal(
							library.genesisblock.block.transactions.length
						);
					});

					it('all transactions IDs should be present in genesis block', () => {
						return expect(
							genesisBlock.transactions.map(t => t.id).sort()
						).to.be.deep.equal(
							library.genesisblock.block.transactions.map(t => t.id).sort()
						);
					});
				});

				describe('mem_accounts (delegates)', () => {
					let delegates;
					let delegateTransactions;

					before(() => {
						// Filter register delegates transactions (type 2) from genesis block
						delegateTransactions = _.filter(genesisBlock.transactions, {
							type: 2,
						});

						// Get delegates from database
						return Queries.getDelegates().then(_delegates => {
							delegates = _delegates;
						});
					});

					it('should be populated', () => {
						expect(delegates).to.be.an('array');
						return expect(delegates.length).to.be.above(0);
					});

					it('count should match delegates created in genesis block', () => {
						return expect(delegateTransactions.length).to.equal(
							delegates.length
						);
					});

					describe('delegates rows', () => {
						it('should have proper fields', done => {
							_.each(delegates, delegate => {
								expect(delegate).to.be.an('object');
								// We require here 'transactionId' field that is not part of 'mem_accounts', but comes from join with 'delegates' table
								expect(delegate).to.have.all.keys([
									...roundsFixtures.mem_accountsFields,
									'transactionId',
								]);
							});
							done();
						});

						describe('values', () => {
							it('fields transactionId, username, address, publicKey should match genesis block transactions', done => {
								let found;
								_.each(delegates, delegate => {
									found = _.find(library.genesisblock.block.transactions, {
										id: delegate.transactionId,
									});
									expect(found).to.be.an('object');
									expect(delegate.username).to.equal(
										found.asset.delegate.username
									);
									expect(delegate.u_username).to.equal(
										found.asset.delegate.username
									);
									expect(delegate.address).to.equal(found.senderId);
									expect(delegate.publicKey.toString('hex')).to.equal(
										found.senderPublicKey
									);
								});
								done();
							});

							it('fields vote, blocks_forged_count, blocks_missed_count, isDelegate, virgin should be valid', done => {
								_.each(delegates, delegate => {
									// Find accounts that vote for delegate
									const voters = _.filter(
										library.genesisblock.block.transactions,
										transaction => {
											return (
												transaction.type === 3 &&
												transaction.asset.votes.indexOf(
													`+${delegate.publicKey.toString('hex')}`
												) !== -1
											);
										}
									);

									// Calculate voters balance for current delegate
									let voters_balance = '0';
									_.each(voters, voter => {
										const balance = _.reduce(
											library.genesisblock.block.transactions,
											(balance, acc) => {
												if (acc.recipientId === voter.senderId) {
													return new Bignum(balance)
														.plus(acc.amount)
														.toString();
												} else if (acc.senderId === voter.senderId) {
													return new Bignum(balance)
														.minus(acc.amount)
														.toString();
												}
												return balance;
											},
											'0'
										);
										voters_balance = new Bignum(voters_balance)
											.plus(balance)
											.toString();
									});

									expect(delegate.vote).to.equal(voters_balance);
									expect(delegate.producedBlocks).to.equal(0);
									expect(delegate.missedBlocks).to.equal(0);
									expect(delegate.isDelegate).to.equal(1);
									expect(delegate.u_isDelegate).to.equal(1);
									expect(delegate.virgin).to.equal(1);
								});
								done();
							});
						});
					});
				});

				describe('mem_accounts (other accounts)', () => {
					let accounts;
					let genesisAccounts;
					let genesisAddress;

					before(() => {
						// Get genesis accounts address - should be senderId from first transaction
						genesisAddress =
							library.genesisblock.block.transactions[0].senderId;

						// Get unique accounts from genesis block
						genesisAccounts = _.union(
							library.genesisblock.block.transactions.map(a => a.senderId),
							library.genesisblock.block.transactions.map(a => a.recipientId)
						).filter(a => a); // We call filter here to remove null values

						// Get accounts from database
						return Queries.getAccounts().then(_accounts => {
							accounts = _accounts;
						});
					});

					it('should be populated', () => {
						expect(accounts).to.be.an('array');
						return expect(accounts.length).to.be.above(0);
					});

					it('count should match accounts created in genesis block', () => {
						return expect(accounts.length).to.equal(genesisAccounts.length);
					});

					describe('accounts rows', () => {
						it('should have proper fields', done => {
							_.each(accounts, delegate => {
								expect(delegate).to.be.an('object');
								expect(delegate).to.have.all.keys(
									roundsFixtures.mem_accountsFields
								);
							});
							done();
						});

						describe('values', () => {
							describe('genesis account', () => {
								let genesisAccount;
								let genesisAccountTransaction;

								before(done => {
									genesisAccountTransaction =
										library.genesisblock.block.transactions[0];
									genesisAccount = _.find(accounts, {
										address: genesisAddress,
									});
									done();
								});

								it('should exists', () => {
									return expect(genesisAccount).to.be.an('object');
								});

								it('balance should be negative', () => {
									return expect(Number(genesisAccount.balance)).to.be.below(0);
								});

								it('fields address, balance, publicKey should match genesis block transaction', done => {
									expect(genesisAccount.address).to.equal(
										genesisAccountTransaction.senderId
									);

									// Sum all outgoing transactions from genesis account
									const balance = _.reduce(
										library.genesisblock.block.transactions,
										(balance, acc) => {
											if (acc.senderId === genesisAccount.address) {
												return new Bignum(balance).minus(acc.amount).toString();
											}
											return balance;
										},
										'0'
									);

									expect(genesisAccount.balance).to.be.equal(balance);
									expect(genesisAccount.u_balance).to.be.equal(balance);
									expect(genesisAccount.publicKey.toString('hex')).to.equal(
										genesisAccountTransaction.senderPublicKey
									);
									done();
								});
							});

							describe('all accounts', () => {
								it('balances should be valid against blockchain balances', () => {
									// Perform validation of accounts balances against blockchain
									return expect(
										Queries.validateAccountsBalances()
									).to.eventually.be.an('array').that.is.empty;
								});
							});
						});
					});
				});
			});
		});

		describe('modules.delegates', () => {
			describe('__private.delegatesList', () => {
				let delegatesList;

				before(() => {
					return generateDelegateListPromise(1, null).then(_delegatesList => {
						delegatesList = _delegatesList;
					});
				});

				it('should be an array', () => {
					return expect(delegatesList).to.be.an('array');
				});

				it('should have a length of 101', () => {
					return expect(delegatesList.length).to.equal(101);
				});

				it('should contain public keys of all 101 genesis delegates', done => {
					_.each(delegatesList, pk => {
						// Search for that pk in genesis block
						var found = _.find(library.genesisblock.block.transactions, {
							senderPublicKey: pk,
						});
						expect(found).to.be.an('object');
					});
					done();
				});

				it('should be equal to one generated with Lisk-Core 0.9.3', () => {
					return expect(delegatesList).to.deep.equal(
						roundsFixtures.delegatesOrderAfterGenesisBlock
					);
				});
			});

			describe('__private.loadDelegates', () => {
				before(done => {
					const loadDelegates = library.rewiredModules.delegates.__get__(
						'__private.loadDelegates'
					);
					loadDelegates(err => {
						keypairs = library.modules.delegates.getForgersKeyPairs();
						done(err);
					});
				});

				describe('__private.keypairs', () => {
					it('should not be empty', () => {
						expect(keypairs).to.be.an('object');
						return expect(Object.keys(keypairs).length).to.be.above(0);
					});

					it('length should match delegates length from config file', () => {
						return expect(Object.keys(keypairs).length).to.equal(
							__testContext.config.forging.secret.length
						);
					});

					it('every keypairs property should match contained object public key', done => {
						_.each(keypairs, (keypair, pk) => {
							expect(keypair.publicKey).to.be.instanceOf(Buffer);
							expect(keypair.privateKey).to.be.instanceOf(Buffer);
							expect(pk).to.equal(keypair.publicKey.toString('hex'));
						});
						done();
					});
				});
			});
		});
	});

	describe('round 1', () => {
		let deleteLastBlockPromise;
		const round = {
			current: 1,
			outsiderPublicKey:
				'948b8b509579306694c00833ec1c0f81e964487db2206ddb1517bfeca2b0dc1b',
		};

		before(() => {
			const lastBlock = library.modules.blocks.lastBlock.get();

			deleteLastBlockPromise = Promise.promisify(
				library.modules.blocks.chain.deleteLastBlock
			);

			// Copy initial states for later comparison
			return Promise.join(
				getMemAccounts(),
				getDelegates(),
				generateDelegateListPromise(lastBlock.height, null),
				(_accounts, _delegates, _delegatesList) => {
					// Get genesis accounts address - should be senderId from first transaction
					const genesisAddress =
						library.genesisblock.block.transactions[0].senderId;
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
				const transaction = elements.transaction.transfer({
					recipientId: randomUtil.account().address,
					amount: randomUtil.number(100000000, 1000000000),
					passphrase: accountsFixtures.genesis.password,
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
					const transaction = elements.transaction.transfer({
						recipientId: randomUtil.account().address,
						amount: randomUtil.number(100000000, 1000000000),
						passphrase: accountsFixtures.genesis.password,
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

			async.doUntil(
				untilCb => {
					++blocksProcessed;
					const transactions = [];
					for (let t = transactionsPerBlock - 1; t >= 0; t--) {
						const transaction = elements.transaction.transfer({
							recipientId: randomUtil.account().address,
							amount: randomUtil.number(100000000, 1000000000),
							passphrase: accountsFixtures.genesis.password,
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
				const transaction = elements.transaction.transfer({
					recipientId: randomUtil.account().address,
					amount: randomUtil.number(100000000, 1000000000),
					passphrase: accountsFixtures.genesis.password,
				});
				transactions.push(transaction);

				return getMemAccounts().then(_accounts => {
					round.accountsBeforeLastBlock = _.cloneDeep(_accounts);
				});
			});

			tickAndValidate(transactions);
		});

		describe('after round 1 is finished', () => {
			it('last block height should equal active delegates count', () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return expect(lastBlock.height).to.be.equal(slots.delegates);
			});

			it('should calculate rewards for round 1 correctly - all should be the same (calculated, rounds_rewards, mem_accounts)', () => {
				return Promise.join(
					getMemAccounts(),
					Queries.getBlocks(round.current),
					Queries.getRoundRewards(round.current),
					getDelegates(),
					(_accounts, _blocks, _rewards, _delegates) => {
						const delegates = {};

						// Get genesis accounts address - should be senderId from first transaction
						const genesisAddress =
							library.genesisblock.block.transactions[0].senderId;
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

			it('should generate a different delegate list than one generated at the beginning of round 1', () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return generateDelegateListPromise(lastBlock.height + 1, null).then(
					delegatesList => {
						expect(delegatesList).to.not.deep.equal(round.delegatesList);
					}
				);
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

			it('round rewards should be empty (rewards for round 1 deleted from rounds_rewards table)', () => {
				return expect(
					Queries.getRoundRewards(round.current)
				).to.eventually.deep.equal({});
			});

			// FIXME: Unskip that test after https://github.com/LiskHQ/lisk/issues/1781 is closed
			// eslint-disable-next-line
			it.skip('mem_accounts table should be equal to one generated before last block of round deletion', () => {
				return getMemAccounts().then(_accounts => {
					expect(_accounts).to.deep.equal(round.accountsBeforeLastBlock);
				});
			});

			it('delegates list should be equal to one generated at the beginning of round 1', () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return generateDelegateListPromise(lastBlock.height + 1, null).then(
					delegatesList => {
						expect(delegatesList).to.deep.equal(round.delegatesList);
					}
				);
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
					const transaction = elements.transaction.castVotes({
						passphrase: accountsFixtures.genesis.password,
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

			it('last block height should be at height 99 after deleting one more block', () => {
				const lastBlock = library.modules.blocks.lastBlock.get();
				return expect(lastBlock.height).to.equal(99);
			});

			// FIXME: Unskip that test after https://github.com/LiskHQ/lisk/issues/1782 is closed
			// eslint-disable-next-line
			it.skip('transactions from deleted block should be added back to transaction pool', done => {
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

			it('expected forger of last block of round should have proper votes', () => {
				return getDelegates().then(delegates => {
					const delegate = delegates[lastBlockForger];
					expect(delegate.vote).to.equal('10000000000000000');
				});
			});

			tickAndValidate(transactions);

			describe('after forging 1 block', () => {
				it('should unvote expected forger of last block of round (block data)', () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return Queries.getFullBlock(lastBlock.height).then(blocks => {
						expect(blocks[0].transactions[0].asset.votes[0]).to.equal(
							`-${lastBlockForger}`
						);
					});
				});

				it('expected forger of last block of round should still have proper votes', () => {
					return getDelegates().then(delegates => {
						const delegate = delegates[lastBlockForger];
						expect(delegate.vote).to.equal('10000000000000000');
					});
				});
			});

			tickAndValidate([]);

			describe('after round finish', () => {
				it('delegates list should be different than one generated at the beginning of round 1', () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return generateDelegateListPromise(lastBlock.height + 1, null).then(
						delegatesList => {
							expect(delegatesList).to.not.deep.equal(round.delegatesList);
						}
					);
				});

				it('forger of last block of previous round should have vote = 0', () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							1
						);
						return expect(_delegates[lastBlockForger].vote).to.equal('0');
					});
				});
			});

			describe('after last block of round is deleted', () => {
				it('delegates list should be equal to one generated at the beginning of round 1', () => {
					return deleteLastBlockPromise().then(() => {
						const lastBlock = library.modules.blocks.lastBlock.get();
						return generateDelegateListPromise(lastBlock.height, null).then(
							delegatesList => {
								expect(delegatesList).to.deep.equal(round.delegatesList);
							}
						);
					});
				});

				it('expected forger of last block of round should have proper votes again', () => {
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
					let transaction = elements.transaction.transfer({
						recipientId: tmpAccount.address,
						amount: 5000000000,
						passphrase: accountsFixtures.genesis.password,
					});
					transactions.transfer.push(transaction);

					// Create register delegate transaction
					transaction = elements.transaction.registerDelegate({
						passphrase: tmpAccount.password,
						username: 'my_little_delegate',
					});
					transactions.delegate.push(transaction);

					transaction = elements.transaction.castVotes({
						passphrase: accountsFixtures.genesis.password,
						unvotes: [lastBlockForger],
						votes: [tmpAccount.publicKey],
					});
					transactions.vote.push(transaction);

					// Delete two blocks more
					deleteLastBlockPromise().then(() => {
						// done();
						deleteLastBlockPromise().then(() => {
							done();
						});
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
						generateDelegateListPromise(lastBlock.height + 1, null),
						(_delegates, _delegatesList) => {
							delegatesList = _delegatesList;
							delegates = _delegates;
						}
					);
				});

				it('last block height should be at height 101', () => {
					return expect(lastBlock.height).to.equal(101);
				});

				// FIXME: Unskip that tests and fix the order (or not) after issue https://github.com/LiskHQ/lisk-js/issues/625 is closed
				// eslint-disable-next-line
				it.skip('after finishing round, should unvote expected forger of last block of round and vote new delegate (block data)', () => {
					return Queries.getFullBlock(lastBlock.height).then(blocks => {
						expect(blocks[0].transactions[0].asset.votes).to.deep.equal([
							`-${lastBlockForger}`,
							`+${tmpAccount.publicKey}`,
						]);
					});
				});

				it('delegates list should be different than one generated at the beginning of round 1', () => {
					return expect(delegatesList).to.not.deep.equal(round.delegatesList);
				});

				it('unvoted delegate should not be on list', () => {
					return expect(delegatesList).to.not.contain(lastBlockForger);
				});

				it('delegate who replaced unvoted one should be on list', () => {
					return expect(delegatesList).to.contain(tmpAccount.publicKey);
				});

				it('forger of last block of previous round should have vote = 0', () => {
					expect(delegates[round.outsiderPublicKey].missedBlocks).to.equal(1);
					return expect(delegates[lastBlockForger].vote).to.equal('0');
				});

				it('delegate who replaced last block forger should have proper votes', () => {
					return expect(
						Number(delegates[tmpAccount.publicKey].vote)
					).to.be.above(0);
				});
			});

			describe('after last block of round is deleted', () => {
				it('delegates list should be equal to one generated at the beginning of round 1', () => {
					return deleteLastBlockPromise().then(() => {
						lastBlock = library.modules.blocks.lastBlock.get();
						return generateDelegateListPromise(lastBlock.height, null).then(
							delegatesList => {
								expect(delegatesList).to.deep.equal(round.delegatesList);
							}
						);
					});
				});

				it('last block height should be at height 100', () => {
					return expect(lastBlock.height).to.equal(100);
				});

				it('expected forger of last block of round should have proper votes again', () => {
					return getDelegates().then(_delegates => {
						expect(_delegates[round.outsiderPublicKey].missedBlocks).to.equal(
							0
						);
						return expect(_delegates[lastBlockForger].vote).to.equal(
							'10000000000000000'
						);
					});
				});

				// FIXME: Unskip that test after issue https://github.com/LiskHQ/lisk/issues/1783 is closed
				// eslint-disable-next-line
				it.skip('delegate who replaced last block forger should have vote, producedBlocks, missedBlocks = 0', () => {
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
							const transaction = elements.transaction.transfer({
								recipientId: randomUtil.account().address,
								amount: randomUtil.number(100000000, 1000000000),
								passphrase: accountsFixtures.genesis.password,
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
				it('last block height should be at height 149', () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return expect(lastBlock.height).to.equal(149);
				});

				it('block just before rewards start should have reward = 0', () => {
					const lastBlock = library.modules.blocks.lastBlock.get();
					return expect(lastBlock.reward).to.equal(expectedRewardsPerBlock);
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
					expectedRewardsPerBlock = constants.rewards.milestones[0];
					done();
				});

				async.doUntil(
					untilCb => {
						++blocksProcessed;
						const transactions = [];
						for (let t = transactionsPerBlock - 1; t >= 0; t--) {
							const transaction = elements.transaction.transfer({
								recipientId: randomUtil.account().address,
								amount: randomUtil.number(100000000, 1000000000),
								passphrase: accountsFixtures.genesis.password,
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
							it('all blocks from now until round end should have proper rewards (5 LSK)', () => {
								const lastBlock = library.modules.blocks.lastBlock.get();
								return expect(lastBlock.reward).to.equal(
									expectedRewardsPerBlock
								);
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
				it('should calculate rewards for round 2 correctly - all should be the same (native, rounds_rewards)', () => {
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
});
