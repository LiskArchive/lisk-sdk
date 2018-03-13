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
const elements = require('lisk-js');
const Promise = require('bluebird');
const QueryFile = require('pg-promise').QueryFile;
const application = require('../../common/application');
const constants = require('../../../helpers/constants');
const slots = require('../../../helpers/slots');
const Bignum = require('../../../helpers/bignum');
const accountsFixtures = require('../../fixtures/accounts');
const roundsFixtures = require('../../fixtures/rounds').rounds;
const randomUtil = require('../../common/utils/random');

describe('rounds', () => {
	var library;
	var keypairs;
	var validateAccountsBalancesQuery;

	const Queries = {
		validateAccountsBalances: () => {
			return library.db.query(validateAccountsBalancesQuery).then(rows => {
				return rows;
			});
		},
		getAccounts: () => {
			return library.db.query('SELECT * FROM mem_accounts').then(rows => {
				return rows;
			});
		},
		getDelegates: () => {
			return library.db
				.query(
					'SELECT * FROM mem_accounts m LEFT JOIN delegates d ON d.username = m.username WHERE d."transactionId" IS NOT NULL'
				)
				.then(rows => {
					return rows;
				});
		},
		getFullBlock: height => {
			return library.db
				.query('SELECT * FROM full_blocks_list WHERE b_height = ${height}', {
					height,
				})
				.then(rows => {
					return rows;
				});
		},
		getBlocks: round => {
			return library.db
				.query(
					'SELECT * FROM blocks WHERE CEIL(height / 101::float)::int = ${round} ORDER BY height ASC',
					{ round }
				)
				.then(rows => {
					return rows;
				});
		},
		getRoundRewards: round => {
			return library.db
				.query(
					'SELECT ENCODE("publicKey", \'hex\') AS "publicKey", SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = ${round} GROUP BY "publicKey"',
					{ round }
				)
				.then(rows => {
					var rewards = {};
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
			return library.db
				.query(
					'SELECT "dependentId", ARRAY_AGG("accountId") FROM mem_accounts2delegates GROUP BY "dependentId"'
				)
				.then(rows => {
					return rows;
				});
		},
	};

	before(done => {
		validateAccountsBalancesQuery = new QueryFile(
			path.join(
				__dirname,
				'../common/sql/rounds/validate_accounts_balances.sql'
			),
			{ minify: true }
		);

		// Set rewards start at 150-th block
		constants.rewards.offset = 150;
		application.init(
			{ sandbox: { name: 'lisk_functional_rounds' } },
			(err, scope) => {
				library = scope;
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('environment', () => {
		describe('genesis block', () => {
			var genesisBlock;

			before(() => {
				// Get genesis block from database
				return Queries.getFullBlock(1).then(rows => {
					genesisBlock = library.modules.blocks.utils.readDbRows(rows)[0];
				});
			});

			describe('consistency', () => {
				it('should contain transactions', () => {
					return expect(library.genesisblock.block.transactions.length).to.be.above(0);
				});
			});

			describe('insert to database', () => {
				describe('database block at height 1', () => {
					it('ID should match genesis block ID', () => {
						return expect(genesisBlock.id).to.equal(library.genesisblock.block.id);
					});

					it('should contain transactions', () => {
						return expect(genesisBlock.transactions.length).to.be.above(0);
					});

					it('number of transactions should match genesis number of transactions in block', () => {
						return expect(genesisBlock.transactions.length).to.equal(
							library.genesisblock.block.transactions.length
						);
					});

					it('all transactions IDs should be present in genesis block', done => {
						var found;
						_.each(genesisBlock.transactions, databaseTransaction => {
							found = _.find(library.genesisblock.block.transactions, {
								id: databaseTransaction.id,
							});
							expect(found).to.be.an('object');
							expect(found).to.have.an.own.property('id');
							expect(found.id).to.equal(databaseTransaction.id);
						});
						done();
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
						return expect(delegateTransactions.length).to.equal(delegates.length);
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
						genesisAccounts = _.reduce(
							library.genesisblock.block.transactions,
							(accounts, transaction) => {
								if (
									transaction.senderId &&
									accounts.indexOf(transaction.senderId) === -1
								) {
									accounts.push(transaction.senderId);
								}
								if (
									transaction.recipientId &&
									accounts.indexOf(transaction.recipientId) === -1
								) {
									accounts.push(transaction.recipientId);
								}
								return accounts;
							},
							[]
						);

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

				before(done => {
					library.modules.delegates.generateDelegateList(
						1,
						null,
						(err, list) => {
							delegatesList = list;
							done(err);
						}
					);
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
						roundsFixtures.expectedDelegatesOrder
					);
				});
			});

			describe('__private.loadDelegates', () => {
				before(done => {
					const loadDelegates = library.rewiredModules.delegates.__get__(
						'__private.loadDelegates'
					);
					loadDelegates(err => {
						keypairs = library.rewiredModules.delegates.__get__(
							'__private.keypairs'
						);
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
		let generateDelegateListPromise;
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

			generateDelegateListPromise = Promise.promisify(
				library.modules.delegates.generateDelegateList
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

		function getMemAccounts() {
			return Queries.getAccounts().then(rows => {
				return _.cloneDeep(normalizeMemAccounts(rows));
			});
		}

		function normalizeMemAccounts(_accounts) {
			const accounts = {};
			_.map(_accounts, acc => {
				accounts[acc.address] = acc;
			});
			return accounts;
		}

		function getDelegates() {
			return Queries.getDelegates().then(rows => {
				return _.cloneDeep(normalizeDelegates(rows));
			});
		}

		function normalizeDelegates(_delegates) {
			const delegates = {};
			_.map(_delegates, d => {
				d.publicKey = d.publicKey.toString('hex');
				delegates[d.publicKey] = d;
			});
			return delegates;
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

			_.each(transactions, transaction => {
				let address = transaction.senderId;
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
				}

				address = transaction.recipientId;
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
					// Funds sent to new account
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

			_.each(voters, delegate => {
				let votes = '0';
				const found = _.find(accounts, {
					publicKey: Buffer.from(delegate.dependentId, 'hex'),
				});
				expect(found).to.be.an('object');
				_.each(delegate.array_agg, voter => {
					const found = _.find(accounts, {
						address: voter,
					});
					votes = new Bignum(votes).plus(found.balance).toString();
				});
				found.vote = votes;
			});

			return accounts;
		}

		function applyOutsiders(_accounts, delegatesList, blocks) {
			const accounts = _.cloneDeep(_accounts);

			_.each(delegatesList, publicKey => {
				const found = _.find(blocks, {
					generatorPublicKey: Buffer.from(publicKey, 'hex'),
				});
				const account = _.find(accounts, {
					publicKey: Buffer.from(publicKey, 'hex'),
				});
				if (!found) {
					account.missedBlocks += 1;
				}
			});

			return accounts;
		}
		describe('forge block with 1 TRANSFER transaction to random account', () => {
		});

		describe('forge block with 25 TRANSFER transactions to random accounts', () => {
		});

		describe('should forge 97 blocks with 1 TRANSFER transaction each to random account', () => {
		});

		describe('forge block with 1 TRANSFER transaction to random account (last block of round)', () => {
		});

		describe('after round 1 is finished', () => {
			it('last block height should equal active delegates count', () => {
			});

			it('should calculate rewards for round 1 correctly - all should be the same (native, rounds_rewards, mem_accounts)', () => {
			});

			it('should generate a different delegate list than one generated at the beginning of round 1', () => {
			});
		});

		describe('delete last block of round 1, block contains 1 transaction type SEND', () => {
			it('round rewards should be empty (rewards for round 1 deleted from rounds_rewards table)', () => {
			});

			it('mem_accounts table should be equal to one generated before last block of round deletion', () => {
			});

			it('mem_accounts table should not contain changes from transaction included in deleted block', () => {
			});

			it('delegates list should be equal to one generated at the beginning of round 1', () => {
			});
		});
	});
});
