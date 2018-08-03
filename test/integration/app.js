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

const Promise = require('bluebird');
const Bignum = require('../../helpers/bignum.js');
const application = require('../common/application');
const queriesHelper = require('../common/integration/sql/queriesHelper.js');
const accountsFixtures = require('../fixtures/accounts');
const roundsFixtures = require('../fixtures/rounds').rounds;

describe('app', () => {
	let library;
	let keypairs;
	let Queries;

	describe('init', () => {
		it('should init successfully without any error', done => {
			application.init({ sandbox: { name: 'lisk_test_app' } }, (err, lib) => {
				library = lib;
				Queries = new queriesHelper(lib, lib.db);
				done(err);
			});
		});
	});

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
					library.genesisBlock.block.transactions.length
				).to.be.above(0);
			});
		});

		describe('after insert to database', () => {
			describe('database block at height 1', () => {
				it('ID should match genesis block ID', () => {
					return expect(genesisBlock.id).to.equal(
						library.genesisBlock.block.id
					);
				});

				it('should contain transactions', () => {
					return expect(genesisBlock.transactions.length).to.be.above(0);
				});

				it('number of transactions should match genesis number of transactions in block', () => {
					return expect(genesisBlock.transactions.length).to.equal(
						library.genesisBlock.block.transactions.length
					);
				});

				it('all transactions IDs should be present in genesis block', () => {
					return expect(
						genesisBlock.transactions.map(t => t.id).sort()
					).to.be.deep.equal(
						library.genesisBlock.block.transactions.map(t => t.id).sort()
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
					return expect(delegateTransactions.length).to.equal(delegates.length);
				});

				describe('delegates rows', () => {
					it('should have proper fields', done => {
						_.each(delegates, delegate => {
							expect(delegate).to.be.an('object');
							// We require here 'transactionId' field that is not part of 'mem_accounts', but comes from join with 'delegates' table
							expect(delegate).to.have.all.keys([
								...accountsFixtures.mem_accountsFields,
								'transactionId',
							]);
						});
						done();
					});

					describe('values', () => {
						it('fields transactionId, username, address, publicKey should match genesis block transactions', done => {
							let found;
							_.each(delegates, delegate => {
								found = _.find(library.genesisBlock.block.transactions, {
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

						it('fields vote, blocks_forged_count, blocks_missed_count, isDelegate should be valid', done => {
							_.each(delegates, delegate => {
								// Find accounts that vote for delegate
								const voters = _.filter(
									library.genesisBlock.block.transactions,
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
										library.genesisBlock.block.transactions,
										(balance, acc) => {
											if (acc.recipientId === voter.senderId) {
												return new Bignum(balance).plus(acc.amount).toString();
											} else if (acc.senderId === voter.senderId) {
												return new Bignum(balance).minus(acc.amount).toString();
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
					genesisAddress = library.genesisBlock.block.transactions[0].senderId;

					// Get unique accounts from genesis block
					genesisAccounts = _.union(
						library.genesisBlock.block.transactions.map(a => a.senderId),
						library.genesisBlock.block.transactions.map(a => a.recipientId)
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
								accountsFixtures.mem_accountsFields
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
									library.genesisBlock.block.transactions[0];
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
									library.genesisBlock.block.transactions,
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
		let generateDelegateListPromise;

		before(done => {
			generateDelegateListPromise = Promise.promisify(
				library.modules.delegates.generateDelegateList
			);
			done();
		});

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
					var found = _.find(library.genesisBlock.block.transactions, {
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
						__testContext.config.forging.delegates.length
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

	describe('cleanup', () => {
		it('should cleanup sandboxed application successfully', done => {
			application.cleanup(done);
		});
	});
});
