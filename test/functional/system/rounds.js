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
const elements = require('lisk-js');
const path = require('path');
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
							fees: Number(row.fees),
							rewards: Number(row.rewards),
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
					expect(library.genesisblock.block.transactions.length).to.be.above(0);
				});
			});

			describe('insert to database', () => {
				describe('database block at height 1', () => {
					it('ID should match genesis block ID', () => {
						expect(genesisBlock.id).to.equal(library.genesisblock.block.id);
					});

					it('should contain transactions', () => {
						expect(genesisBlock.transactions.length).to.be.above(0);
					});

					it('number of transactions should match genesis number of transactions in block', () => {
						expect(genesisBlock.transactions.length).to.equal(
							library.genesisblock.block.transactions.length
						);
					});

					it('all transactions IDs should be present in genesis block', () => {
						var found;
						_.each(genesisBlock.transactions, databaseTransaction => {
							found = _.find(library.genesisblock.block.transactions, {
								id: databaseTransaction.id,
							});
							expect(found).to.be.an('object');
							expect(found).to.have.an.own.property('id');
							expect(found.id).to.equal(databaseTransaction.id);
						});
					});
				});

				describe('mem_accounts (delegates)', () => {
					var delegates;
					var delegateTransactions;

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
						expect(delegates.length).to.be.above(0);
					});

					it('count should match delegates created in genesis block', () => {
						expect(delegateTransactions.length).to.equal(delegates.length);
					});

					describe('delegates rows', () => {
						it('should have proper fields', () => {
							_.each(delegates, delegate => {
								expect(delegate).to.be.an('object');
								// We require here 'transactionId' field that is not part of 'mem_accounts', but comes from join with 'delegates' table
								expect(delegate).to.have.all.keys([
									...roundsFixtures.mem_accountsFields,
									'transactionId',
								]);
							});
						});

						describe('values', () => {
							it('fields transactionId, username, address, publicKey should match genesis block transactions', () => {
								var found;
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
							});

							it('fields vote, blocks_forged_count, blocks_missed_count, isDelegate, virgin should be valid', () => {
								_.each(delegates, delegate => {
									// Find accounts that vote for delegate
									var voters = _.filter(
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
									var voters_balance = '0';
									_.each(voters, voter => {
										var balance = _.reduce(
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
							});
						});
					});
				});

				describe('mem_accounts (other accounts)', () => {
					var accounts;
					var genesisAccounts;
					var genesisAddress;

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
						expect(accounts.length).to.be.above(0);
					});

					it('count should match accounts created in genesis block', () => {
						expect(accounts.length).to.equal(genesisAccounts.length);
					});

					describe('accounts rows', () => {
						it('should have proper fields', () => {
							_.each(accounts, delegate => {
								expect(delegate).to.be.an('object');
								expect(delegate).to.have.all.keys(
									roundsFixtures.mem_accountsFields
								);
							});
						});

						describe('values', () => {
							describe('genesis account', () => {
								var genesisAccount;
								var genesisAccountTransaction;

								before(() => {
									genesisAccountTransaction =
										library.genesisblock.block.transactions[0];
									genesisAccount = _.find(accounts, {
										address: genesisAddress,
									});
								});

								it('should exists', () => {
									expect(genesisAccount).to.be.an('object');
								});

								it('balance should be negative', () => {
									expect(Number(genesisAccount.balance)).to.be.below(0);
								});

								it('fields address, balance, publicKey should match genesis block transaction', () => {
									expect(genesisAccount.address).to.equal(
										genesisAccountTransaction.senderId
									);

									// Sum all outgoing transactions from genesis account
									var balance = _.reduce(
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
				var delegatesList;

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
					expect(delegatesList).to.be.an('array');
				});

				it('should have a length of 101', () => {
					expect(delegatesList.length).to.equal(101);
				});

				it('should contain public keys of all 101 genesis delegates', () => {
					_.each(delegatesList, pk => {
						// Search for that pk in genesis block
						var found = _.find(library.genesisblock.block.transactions, {
							senderPublicKey: pk,
						});
						expect(found).to.be.an('object');
					});
				});

				it('should be equal to one generated with Lisk-Core 0.9.3', () => {
					expect(delegatesList).to.deep.equal(
						roundsFixtures.expectedDelegatesOrder
					);
				});
			});

			describe('__private.loadDelegates', () => {
				before(done => {
					var loadDelegates = library.rewiredModules.delegates.__get__(
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
						expect(Object.keys(keypairs).length).to.be.above(0);
					});

					it('length should match delegates length from config file', () => {
						expect(Object.keys(keypairs).length).to.equal(
							__testContext.config.forging.secret.length
						);
					});

					it('every keypairs property should match contained object public key', () => {
						_.each(keypairs, (keypair, pk) => {
							expect(keypair.publicKey).to.be.instanceOf(Buffer);
							expect(keypair.privateKey).to.be.instanceOf(Buffer);
							expect(pk).to.equal(keypair.publicKey.toString('hex'));
						});
					});
				});
			});
		});
	});
});
