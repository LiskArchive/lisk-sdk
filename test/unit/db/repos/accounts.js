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
const randomstring = require('randomstring');
const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const accountFixtures = require('../../../fixtures/accounts');

let db;
let dbSandbox;
let validAccount;

function createAccount() {
	validAccount = accountFixtures.Account();

	return db
		.query(db.$config.pgp.helpers.insert(validAccount, db.accounts.cs.insert))
		.then(() => {
			return validAccount;
		});
}

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_accounts');

		dbSandbox.create((err, __db) => {
			db = __db;

			done(err);
		});
	});

	after(() => {
		dbSandbox.destroy();
	});

	describe('accounts', () => {
		describe('initialization', () => {
			it('should initialize properly', () => {
				expect(db.accounts).to.not.null;
			});
		});

		describe('methods', () => {
			describe('resetMemTables', () => {
				it('should process without any error', () => {
					return db.accounts.resetMemTables();
				});

				it('should empty the table "mem_round"', () => {
					return db.accounts
						.resetMemTables()
						.then(() => {
							return db.one('SELECT COUNT(*)::int AS count FROM mem_round');
						})
						.then(row => {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2delegates"', () => {
					return db.accounts
						.resetMemTables()
						.then(() => {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2delegates'
							);
						})
						.then(row => {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2u_delegates"', () => {
					return db.accounts
						.resetMemTables()
						.then(() => {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2u_delegates'
							);
						})
						.then(row => {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2multisignatures"', () => {
					return db.accounts
						.resetMemTables()
						.then(() => {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2multisignatures'
							);
						})
						.then(row => {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2u_multisignatures"', () => {
					return db.accounts
						.resetMemTables()
						.then(() => {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2u_multisignatures'
							);
						})
						.then(row => {
							expect(row.count).to.equal(0);
						});
				});
			});

			describe('list', () => {
				before(() => {
					return createAccount().then(account => {
						validAccount = account;
					});
				});

				it('should return data without any error', () => {
					return db.accounts.list();
				});

				describe('fields', () => {
					it('should return all table fields if no field is specified', () => {
						return db.accounts.list().then(data => {
							var columnNames = _.map(db.accounts.cs.select.columns, function(
								column
							) {
								return column.prop || column.name;
							});

							expect(data[0]).to.have.all.keys(columnNames);
						});
					});

					it('should return only "address" if fields specify ["address"]', () => {
						return db.accounts.list({}, ['address']).then(data => {
							data.forEach(account => {
								expect(account).to.have.all.keys(['address']);
							});
						});
					});

					it('should return only "address" and "isDelegate" if fields specify ["address", "isDelegate"]', () => {
						return db.accounts
							.list({}, ['address', 'isDelegate'])
							.then(data => {
								data.forEach(account => {
									expect(account).to.have.all.keys(['isDelegate', 'address']);
								});
							});
					});

					it('should skip any unknown field specified ["address", "unKnownField"]', () => {
						return db.accounts
							.list({}, ['address', 'unKnownField'])
							.then(data => {
								data.forEach(account => {
									expect(account).to.have.all.keys(['address']);
								});
							});
					});

					describe('property names', () => {
						it('should return "producedBlocks" column if "producedBlocks" is asked', () => {
							var actualResult;

							return db.accounts.list({}, ['producedBlocks']).then(data => {
								actualResult = data;

								return db
									.query(
										'SELECT producedblocks::bigint AS "producedBlocks" FROM mem_accounts'
									)
									.then(result => {
										expect(actualResult).to.eql(result);
									});
							});
						});

						it('should return "missedBlocks" column if "missedBlocks" is asked', () => {
							var actualResult;

							return db.accounts.list({}, ['missedBlocks']).then(data => {
								actualResult = data;

								return db
									.query(
										'SELECT missedblocks::bigint AS "missedBlocks" FROM mem_accounts'
									)
									.then(result => {
										expect(actualResult).to.eql(result);
									});
							});
						});
					});

					describe('dynamic fields', () => {
						it('should fetch "rank" based on query \'(SELECT m.row_number FROM (SELECT row_number() OVER (ORDER BY r."vote" DESC, r."publicKey" ASC), address FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address FROM mem_accounts AS d WHERE d."isDelegate" = 1) AS r) m WHERE m."address" = "mem_accounts"."address")::int\'', () => {
							var actualResult;

							return db.accounts.list({}, ['rank']).then(data => {
								actualResult = data;

								return db
									.query(
										'SELECT (SELECT m.row_number FROM (SELECT row_number() OVER (ORDER BY r."vote" DESC, r."publicKey" ASC), address FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address FROM mem_accounts AS d WHERE d."isDelegate" = 1) AS r) m WHERE m."address" = "mem_accounts"."address")::bigint AS rank FROM mem_accounts'
									)
									.then(result => {
										expect(actualResult).to.eql(result);
									});
							});
						});

						it('should fetch "delegates" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2delegates WHERE "accountId" = "mem_accounts"."address")', () => {
							return db.accounts
								.list({}, ['address', 'delegates'])
								.then(data => {
									return Promise.map(data, account => {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "delegates" FROM mem_accounts2delegates WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(result => {
												expect(account.delegates).to.be.eql(result.delegates);
											});
									});
								});
						});

						it('should fetch "u_delegates" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_delegates WHERE "accountId" = "mem_accounts"."address")', () => {
							return db.accounts
								.list({}, ['address', 'u_delegates'])
								.then(data => {
									return Promise.map(data, account => {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "u_delegates" FROM mem_accounts2u_delegates WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(result => {
												expect(account.u_delegates).to.be.eql(
													result.u_delegates
												);
											});
									});
								});
						});

						it('should fetch "multisignatures" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2multisignatures WHERE "accountId" = "mem_accounts"."address")', () => {
							return db.accounts
								.list({}, ['address', 'multisignatures'])
								.then(data => {
									return Promise.map(data, account => {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "multisignatures" FROM mem_accounts2multisignatures WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(result => {
												expect(account.multisignatures).to.be.eql(
													result.multisignatures
												);
											});
									});
								});
						});

						it('should fetch "u_multisignatures" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_multisignatures WHERE "accountId" = "mem_accounts"."address")', () => {
							return db.accounts
								.list({}, ['address', 'u_multisignatures'])
								.then(data => {
									return Promise.map(data, account => {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "u_multisignatures" FROM mem_accounts2u_multisignatures WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(result => {
												expect(account.u_multisignatures).to.be.eql(
													result.u_multisignatures
												);
											});
									});
								});
						});
					});

					describe('data casting', () => {
						it('should return "isDelegate" as "boolean"', () => {
							return db.accounts
								.list({}, ['isDelegate'], { limit: 1 })
								.then(data => {
									expect(data[0].isDelegate).to.be.a('boolean');
								});
						});

						it('should return "u_isDelegate" as "boolean"', () => {
							return db.accounts
								.list({}, ['u_isDelegate'], { limit: 1 })
								.then(data => {
									expect(data[0].u_isDelegate).to.be.a('boolean');
								});
						});

						it('should return "secondSignature" as "boolean"', () => {
							return db.accounts
								.list({}, ['secondSignature'], { limit: 1 })
								.then(data => {
									expect(data[0].secondSignature).to.be.a('boolean');
								});
						});

						it('should return "u_secondSignature" as "boolean"', () => {
							return db.accounts
								.list({}, ['u_secondSignature'], { limit: 1 })
								.then(data => {
									expect(data[0].u_secondSignature).to.be.a('boolean');
								});
						});

						it('should return "balance" as "bigint"', () => {
							return db.accounts
								.list({}, ['balance'], { limit: 1 })
								.then(data => {
									expect(data[0].balance).to.be.a('string');
								});
						});

						it('should return "u_balance" as "bigint"', () => {
							return db.accounts
								.list({}, ['u_balance'], { limit: 1 })
								.then(data => {
									expect(data[0].u_balance).to.be.a('string');
								});
						});

						it('should return "rate" as "bigint"', () => {
							return db.accounts.list({}, ['rate'], { limit: 1 }).then(data => {
								expect(data[0].rate).to.be.a('string');
							});
						});

						it('should return "fees" as "bigint"', () => {
							return db.accounts.list({}, ['fees'], { limit: 1 }).then(data => {
								expect(data[0].fees).to.be.a('string');
							});
						});

						it('should return "rewards" as "bigint"', () => {
							return db.accounts
								.list({}, ['rewards'], { limit: 1 })
								.then(data => {
									expect(data[0].rewards).to.be.a('string');
								});
						});

						it('should return "vote" as "bigint"', () => {
							return db.accounts.list({}, ['vote'], { limit: 1 }).then(data => {
								expect(data[0].vote).to.be.a('string');
							});
						});

						it('should return "producedBlocks" as "bigint"', () => {
							return db.accounts
								.list({}, ['producedBlocks'], { limit: 1 })
								.then(data => {
									expect(data[0].producedBlocks).to.be.a('string');
								});
						});

						it('should return "missedBlocks" as "bigint"', () => {
							return db.accounts
								.list({}, ['missedBlocks'], { limit: 1 })
								.then(data => {
									expect(data[0].missedBlocks).to.be.a('string');
								});
						});

						it('should return "virgin" as "boolean"', () => {
							return db.accounts
								.list({}, ['virgin'], { limit: 1 })
								.then(data => {
									expect(data[0].virgin).to.be.a('boolean');
								});
						});
					});

					describe('functions', () => {
						it('should always return "address" as "UPPER(address)"', () => {
							return db.accounts.list({}, ['address']).then(data => {
								data.forEach(account => {
									expect(account.address).to.eql(account.address.toUpperCase());
								});
							});
						});

						it('should always return "publicKey" as "ENCODE(publicKey, \'hex\')"', () => {
							return db.accounts.list({}, ['publicKey']).then(data => {
								data.forEach(account => {
									expect(account.publicKey).to.be.a('string');
								});
							});
						});

						it('should always return "secondPublicKey" as "ENCODE(secondPublicKey, \'hex\')"', () => {
							return db.accounts.list({}, ['secondPublicKey']).then(data => {
								data.forEach(account => {
									if (account.secondPublicKey) {
										expect(account.secondPublicKey).to.be.a('string');
									}
								});
							});
						});
					});
				});

				describe('filters', () => {
					it('should return valid result if filter.username is provided', () => {
						return db.accounts
							.list({ username: validAccount.username })
							.then(data => {
								data.forEach(account => {
									expect(account.username).to.be.eql(validAccount.username);
								});
							});
					});

					it('should return valid result with composite conditions if filter.username AND filter.address is provided', () => {
						return db.accounts
							.list({
								username: validAccount.username,
								address: validAccount.address,
							})
							.then(data => {
								data.forEach(account => {
									expect(account.username).to.be.eql(validAccount.username);
									expect(account.address).to.be.eql(validAccount.address);
								});
							});
					});

					it('should throw error if unknown field is provided as filter', done => {
						db.accounts
							.list({ username: validAccount.username, unknownField: 'Alpha' })
							.then(() => {
								done('Error was expected');
							})
							.catch(reason => {
								expect(reason).to.eql('Unknown filter field provided to list');
								done();
							});
					});
				});

				describe('options', () => {
					describe('sort', () => {
						it('should sort by address in descending if options.sortField="address"', () => {
							return db.accounts
								.list({}, ['address'], { sortField: 'address', limit: 10 })
								.then(data => {
									var actualData = _.map(data, 'address');

									expect(actualData).to.be.eql(_(actualData).dbSort('desc'));
								});
						});

						it('should sort by address in ascending if options.sortField="address" and options.sortMethod="ASC"', () => {
							return db.accounts
								.list({}, ['address'], {
									sortField: 'address',
									sortMethod: 'ASC',
									limit: 10,
								})
								.then(data => {
									var actualData = _.map(data, 'address');

									expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
								});
						});

						it('should sort by username in ascending if options.sortField="username" and options.sortMethod="ASC"', () => {
							return db.accounts
								.list({}, ['address'], {
									sortField: 'username',
									sortMethod: 'ASC',
									limit: 10,
								})
								.then(data => {
									var actualData = _.map(data, 'username');

									expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
								});
						});

						it('should fail if unknown sort field is specified', done => {
							db.accounts
								.list({}, ['address'], { sortField: 'unknownField', limit: 10 })
								.then(() => {
									done('Error was expected');
								})
								.catch(reason => {
									expect(reason.message).to.eql(
										'column "unknownField" does not exist'
									);
									done();
								});
						});
					});

					describe('limit & offset', () => {
						beforeEach(() => {
							// Create 15 random accounts
							return Promise.map(new Array(15), () => {
								return createAccount();
							});
						});

						it('should return all results if no limit is specified', () => {
							var count;

							return db.accounts.list({}, ['address']).then(data => {
								count = data.length;

								return db
									.one('SELECT COUNT(*)::int as count from mem_accounts')
									.then(result => {
										expect(result.count).to.be.equal(count);
									});
							});
						});

						it('should return 10 results if options.limit=10', () => {
							return db.accounts
								.list({}, ['address'], { limit: 10 })
								.then(data => {
									expect(data.length).to.be.equal(10);
								});
						});

						it('should skip first 10 results if options.offset=10', () => {
							var previousData;

							return db.accounts
								.list({}, ['address'], { limit: 11 })
								.then(data => {
									previousData = data;

									expect(data.length).to.be.equal(11);
									return db.accounts.list({}, ['address'], {
										limit: 1,
										offset: 10,
									});
								})
								.then(data => {
									expect(data.length).to.be.equal(1);
									expect(data[0]).to.be.eql(previousData[10]);
								});
						});
					});
				});
			});

			describe('upsert', () => {
				it('should throw error if no conflict field is specified', done => {
					var account = accountFixtures.Account();

					db.accounts
						.upsert(account)
						.then(value => {
							done(value);
						})
						.catch(error => {
							expect(error.message).to.be.eql(
								'Error: db.accounts.upsert - invalid conflictingFields argument'
							);
							done();
						});
				});

				it('should succeed with null', () => {
					var account = accountFixtures.Account();

					return db.accounts.upsert(account, 'address').then(result => {
						expect(result).to.be.null;
					});
				});

				it('should insert account if conflictField="address" not found', () => {
					var account = accountFixtures.Account();

					return db.accounts.upsert(account, 'address').then(() => {
						return db.accounts
							.list({ address: account.address })
							.then(result => {
								expect(result.length).to.be.eql(1);
								expect(account).to.be.eql(_.omit(result[0], 'rank'));
							});
					});
				});

				it('should update account if conflictField="address" found', () => {
					var account1 = accountFixtures.Account();
					var account2 = accountFixtures.Account();

					// Since DB trigger protects from updating username only if it was null before
					delete account1.username;
					delete account1.u_username;

					account2.address = account1.address;

					return db.accounts.upsert(account1, 'address').then(() => {
						return db.accounts.upsert(account2, 'address').then(() => {
							return db.accounts
								.list({ address: account2.address })
								.then(result => {
									expect(result.length).to.be.eql(1);

									expect(result[0]).to.not.be.eql(account1);

									var omittedFields = db.accounts.getImmutableFields();
									omittedFields.push('rank');

									expect(_.omit(result[0], omittedFields)).to.be.eql(
										_.omit(account2, omittedFields)
									);
								});
						});
					});
				});

				it('should insert only the columns specified in columnSet.insert', () => {
					var account = accountFixtures.Account({
						delegates: [randomstring.generate(10).toLowerCase()],
					});

					return db.accounts.upsert(account, 'address').then(() => {
						return db.accounts
							.list({ address: account.address })
							.then(result => {
								expect(result.length).to.eql(1);
								expect(result[0].delegates).to.be.null;
							});
					});
				});

				it('should update only the columns specified in columnSet.update', () => {
					var originalAccount = accountFixtures.Account();
					var updatedAccount = accountFixtures.Account();

					// Since DB trigger protects from updating username only if it was null before
					delete originalAccount.username;
					delete originalAccount.u_username;

					return db.accounts.upsert(originalAccount, 'address').then(() => {
						return db.accounts
							.upsert(originalAccount, 'address', updatedAccount)
							.then(() => {
								return db.accounts
									.list({ address: originalAccount.address })
									.then(result => {
										expect(result.length).to.eql(1);

										var immutableFields = db.accounts.getImmutableFields();

										Object.keys(_.omit(result[0], 'rank')).forEach(function(
											field
										) {
											if (immutableFields.indexOf(field) !== -1) {
												// If it's an immutable field
												expect(result[0][field], field).to.eql(
													originalAccount[field]
												);
											} else {
												// If it's not an immutable field
												expect(result[0][field], field).to.eql(
													updatedAccount[field]
												);
											}
										});
									});
							});
					});
				});

				it('should update data attributes specified as "data" if argument "updateData" is missing', () => {
					var originalAccount = accountFixtures.Account();
					var updatedAccount = accountFixtures.Account();

					// Since DB trigger protects from updating username only if it was null before
					delete originalAccount.username;
					delete originalAccount.u_username;

					updatedAccount.address = originalAccount.address;

					return db.accounts.upsert(originalAccount, 'address').then(() => {
						return db.accounts.upsert(updatedAccount, 'address').then(() => {
							return db.accounts
								.list({ address: originalAccount.address })
								.then(result => {
									expect(result.length).to.eql(1);

									var immutableFields = db.accounts.getImmutableFields();

									Object.keys(_.omit(result[0], 'rank')).forEach(function(
										field
									) {
										if (immutableFields.indexOf(field) !== -1) {
											// If it's an immutable field
											expect(result[0][field], field).to.eql(
												originalAccount[field]
											);
										} else {
											// If it's not an immutable field
											expect(result[0][field], field).to.eql(
												updatedAccount[field]
											);
										}
									});
								});
						});
					});
				});

				it('should match the values for conflict keys case sensitively', () => {
					var originalAccount = accountFixtures.Account();
					var updatedAccount = accountFixtures.Account({
						username: originalAccount.username.toUpperCase(),
					});

					return db.accounts.upsert(originalAccount, 'username').then(() => {
						return db.accounts.upsert(updatedAccount, 'username').then(() => {
							return db.accounts
								.list({ username: updatedAccount.username })
								.then(result => {
									expect(result.length).to.eql(1);

									expect(_.omit(result[0], 'rank')).to.eql(updatedAccount);
								});
						});
					});
				});

				it('should match the multiple conflict keys with AND composite', () => {
					var originalAccount = accountFixtures.Account();
					var updatedAccount = accountFixtures.Account({
						username: originalAccount.username,
						u_username: originalAccount.u_username,
					});

					return db.accounts.upsert(originalAccount, 'address').then(() => {
						return db.accounts
							.upsert(updatedAccount, ['username', 'u_username'])
							.then(() => {
								return db.accounts
									.list({ username: updatedAccount.username })
									.then(result => {
										expect(result.length).to.eql(1);

										expect(result[0].address).to.eql(originalAccount.address);
									});
							});
					});
				});
			});

			describe('insert', () => {
				it('should insert account without any error', () => {
					var account = accountFixtures.Account();

					return db.accounts.insert(account);
				});

				it('should succeed with null', () => {
					var account = accountFixtures.Account();

					return db.accounts.insert(account).then(result => {
						expect(result).to.be.null;
					});
				});

				it('should insert all columns specified in db.accounts.cs.insert', () => {
					var account = accountFixtures.Account();

					return db.accounts.insert(account).then(() => {
						return db.accounts
							.list({ address: account.address })
							.then(result => {
								db.accounts.cs.insert.columns.forEach(column => {
									expect(result.length).to.eql(1);

									expect(result[0][column.prop || column.name]).to.eql(
										account[column.prop || column.name]
									);
								});
							});
					});
				});

				it('should not throw error when any unknown attribute is passed', () => {
					var account = accountFixtures.Account();
					account.unknownColumn = 'unnownValue';

					return db.accounts.insert(account);
				});
			});

			describe('update', () => {
				it('should update account without any error', () => {
					var account = accountFixtures.Account();

					return db.accounts.insert(account).then(() => {
						return db.accounts.update(account.address, account);
					});
				});

				it('should succeed with null', () => {
					var account = accountFixtures.Account();
					var updateAccount = accountFixtures.Account();

					return db.accounts.insert(account).then(() => {
						return db.accounts
							.update(account.address, updateAccount)
							.then(result => {
								expect(result).to.be.null;
							});
					});
				});

				it('should throw error if called without an address', done => {
					var account = accountFixtures.Account();

					db.accounts
						.update(null, account)
						.then(() => {
							done('should raise error if no address specified');
						})
						.catch(reason => {
							expect(reason.message).to.eql(
								'Error: db.accounts.update - invalid address argument'
							);
							done();
						});
				});

				it('should update all columns specified in db.accounts.cs.update', () => {
					var account = accountFixtures.Account();
					var updateAccount = accountFixtures.Account();

					// Since DB trigger protects from updating username only if it was null before
					delete account.username;
					delete account.u_username;

					return db.accounts.insert(account).then(() => {
						return db.accounts
							.update(account.address, updateAccount)
							.then(() => {
								return db.accounts
									.list({ address: account.address })
									.then(result => {
										db.accounts.cs.update.columns.forEach(column => {
											expect(result.length).to.eql(1);

											expect(result[0][column.prop || column.name]).to.eql(
												updateAccount[column.prop || column.name]
											);
										});
									});
							});
					});
				});

				it('should not throw error when any unknown attribute is passed', () => {
					var account = accountFixtures.Account();
					var updateAccount = accountFixtures.Account();

					updateAccount.unkownAttr = 'unknownAttr';

					return db.accounts.insert(account).then(() => {
						return db.accounts.update(account.address, updateAccount);
					});
				});
			});
		});
	});
});
