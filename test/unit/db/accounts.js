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

var application = require('../../common/application');
var Promise = require('bluebird');
var randomstring = require('randomstring');
var db;
var validAccount;

function generateAccount() {
	return {
		username: randomstring.generate(10).toLowerCase(),
		isDelegate: true,
		u_isDelegate: false,
		secondSignature: false,
		u_secondSignature: false,
		u_username: randomstring.generate(10).toLowerCase(),
		address: `${randomstring.generate({ charset: 'numeric', length: 20 })}L`,
		publicKey: randomstring
			.generate({ charset: '0123456789ABCDE', length: 32 })
			.toLowerCase(),
		secondPublicKey: null,
		balance: '0',
		u_balance: '0',
		vote: '10000000000000000',
		rate: '0',
		delegates: null,
		u_delegates: null,
		multisignatures: null,
		u_multisignatures: null,
		multimin: 0,
		u_multimin: 0,
		multilifetime: 0,
		u_multilifetime: 0,
		blockId: randomstring.generate({ charset: 'numeric', length: 20 }),
		nameexist: 0,
		u_nameexist: 0,
		producedBlocks: '9',
		missedBlocks: '0',
		fees: '0',
		rewards: '0',
		virgin: true,
	};
}

function createAccount() {
	validAccount = generateAccount();

	return db
		.query(db.$config.pgp.helpers.insert(validAccount, db.accounts.cs.insert))
		.then(function() {
			return validAccount;
		});
}

describe('db', function() {
	before(function(done) {
		application.init({ sandbox: { name: 'lisk_test_db_accounts' } }, function(
			err,
			scope
		) {
			db = scope.db;
			done(err);
		});
	});

	after(function(done) {
		application.cleanup(done);
	});

	describe('accounts', function() {
		describe('initialization', function() {
			it('should initialize properly', function() {
				expect(db.accounts).to.not.null;
			});
		});

		describe('methods', function() {
			describe('resetMemTables', function() {
				it('should process without any error', function() {
					return db.accounts.resetMemTables();
				});

				it('should empty the table "mem_round"', function() {
					return db.accounts
						.resetMemTables()
						.then(function() {
							return db.one('SELECT COUNT(*)::int AS count FROM mem_round');
						})
						.then(function(row) {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2delegates"', function() {
					return db.accounts
						.resetMemTables()
						.then(function() {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2delegates'
							);
						})
						.then(function(row) {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2u_delegates"', function() {
					return db.accounts
						.resetMemTables()
						.then(function() {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2u_delegates'
							);
						})
						.then(function(row) {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2multisignatures"', function() {
					return db.accounts
						.resetMemTables()
						.then(function() {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2multisignatures'
							);
						})
						.then(function(row) {
							expect(row.count).to.equal(0);
						});
				});

				it('should empty the table "mem_accounts2u_multisignatures"', function() {
					return db.accounts
						.resetMemTables()
						.then(function() {
							return db.one(
								'SELECT COUNT(*)::int AS count FROM mem_accounts2u_multisignatures'
							);
						})
						.then(function(row) {
							expect(row.count).to.equal(0);
						});
				});
			});

			describe('list', function() {
				before(function() {
					return createAccount().then(function(account) {
						validAccount = account;
					});
				});

				it('should return data without any error', function() {
					return db.accounts.list();
				});

				describe('fields', function() {
					it('should return all table fields if no field is specified', function() {
						return db.accounts.list().then(function(data) {
							var columnNames = _.map(db.accounts.cs.select.columns, function(
								column
							) {
								return column.prop || column.name;
							});

							expect(data[0]).to.have.all.keys(columnNames);
						});
					});

					it('should return only "address" if fields specify ["address"]', function() {
						return db.accounts.list({}, ['address']).then(function(data) {
							data.forEach(function(account) {
								expect(account).to.have.all.keys(['address']);
							});
						});
					});

					it('should return only "address" and "isDelegate" if fields specify ["address", "isDelegate"]', function() {
						return db.accounts
							.list({}, ['address', 'isDelegate'])
							.then(function(data) {
								data.forEach(function(account) {
									expect(account).to.have.all.keys(['isDelegate', 'address']);
								});
							});
					});

					it('should skip any unknown field specified ["address", "unKnownField"]', function() {
						return db.accounts
							.list({}, ['address', 'unKnownField'])
							.then(function(data) {
								data.forEach(function(account) {
									expect(account).to.have.all.keys(['address']);
								});
							});
					});

					describe('property names', function() {
						it('should return "producedBlocks" column if "producedBlocks" is asked', function() {
							var actualResult;

							return db.accounts
								.list({}, ['producedBlocks'])
								.then(function(data) {
									actualResult = data;

									return db
										.query(
											'SELECT producedblocks::bigint AS "producedBlocks" FROM mem_accounts'
										)
										.then(function(result) {
											expect(actualResult).to.eql(result);
										});
								});
						});

						it('should return "missedBlocks" column if "missedBlocks" is asked', function() {
							var actualResult;

							return db.accounts
								.list({}, ['missedBlocks'])
								.then(function(data) {
									actualResult = data;

									return db
										.query(
											'SELECT missedblocks::bigint AS "missedBlocks" FROM mem_accounts'
										)
										.then(function(result) {
											expect(actualResult).to.eql(result);
										});
								});
						});
					});

					describe('dynamic fields', function() {
						it('should fetch "rank" based on query \'(SELECT m.row_number FROM (SELECT row_number() OVER (ORDER BY r."vote" DESC, r."publicKey" ASC), address FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address FROM mem_accounts AS d WHERE d."isDelegate" = 1) AS r) m WHERE m."address" = "mem_accounts"."address")::int\'', function() {
							var actualResult;

							return db.accounts.list({}, ['rank']).then(function(data) {
								actualResult = data;

								return db
									.query(
										'SELECT (SELECT m.row_number FROM (SELECT row_number() OVER (ORDER BY r."vote" DESC, r."publicKey" ASC), address FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address FROM mem_accounts AS d WHERE d."isDelegate" = 1) AS r) m WHERE m."address" = "mem_accounts"."address")::bigint AS rank FROM mem_accounts'
									)
									.then(function(result) {
										expect(actualResult).to.eql(result);
									});
							});
						});

						it('should fetch "delegates" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2delegates WHERE "accountId" = "mem_accounts"."address")', function() {
							return db.accounts
								.list({}, ['address', 'delegates'])
								.then(function(data) {
									return Promise.map(data, function(account) {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "delegates" FROM mem_accounts2delegates WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(function(result) {
												expect(account.delegates).to.be.eql(result.delegates);
											});
									});
								});
						});

						it('should fetch "u_delegates" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_delegates WHERE "accountId" = "mem_accounts"."address")', function() {
							return db.accounts
								.list({}, ['address', 'u_delegates'])
								.then(function(data) {
									return Promise.map(data, function(account) {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "u_delegates" FROM mem_accounts2u_delegates WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(function(result) {
												expect(account.u_delegates).to.be.eql(
													result.u_delegates
												);
											});
									});
								});
						});

						it('should fetch "multisignatures" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2multisignatures WHERE "accountId" = "mem_accounts"."address")', function() {
							return db.accounts
								.list({}, ['address', 'multisignatures'])
								.then(function(data) {
									return Promise.map(data, function(account) {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "multisignatures" FROM mem_accounts2multisignatures WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(function(result) {
												expect(account.multisignatures).to.be.eql(
													result.multisignatures
												);
											});
									});
								});
						});

						it('should fetch "u_multisignatures" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_multisignatures WHERE "accountId" = "mem_accounts"."address")', function() {
							return db.accounts
								.list({}, ['address', 'u_multisignatures'])
								.then(function(data) {
									return Promise.map(data, function(account) {
										return db
											.one(
												`SELECT (ARRAY_AGG("dependentId")) AS "u_multisignatures" FROM mem_accounts2u_multisignatures WHERE "accountId" = '${
													account.address
												}'`
											)
											.then(function(result) {
												expect(account.u_multisignatures).to.be.eql(
													result.u_multisignatures
												);
											});
									});
								});
						});
					});

					describe('data casting', function() {
						it('should return "isDelegate" as "boolean"', function() {
							return db.accounts
								.list({}, ['isDelegate'], { limit: 1 })
								.then(function(data) {
									expect(data[0].isDelegate).to.be.a('boolean');
								});
						});

						it('should return "u_isDelegate" as "boolean"', function() {
							return db.accounts
								.list({}, ['u_isDelegate'], { limit: 1 })
								.then(function(data) {
									expect(data[0].u_isDelegate).to.be.a('boolean');
								});
						});

						it('should return "secondSignature" as "boolean"', function() {
							return db.accounts
								.list({}, ['secondSignature'], { limit: 1 })
								.then(function(data) {
									expect(data[0].secondSignature).to.be.a('boolean');
								});
						});

						it('should return "u_secondSignature" as "boolean"', function() {
							return db.accounts
								.list({}, ['u_secondSignature'], { limit: 1 })
								.then(function(data) {
									expect(data[0].u_secondSignature).to.be.a('boolean');
								});
						});

						it('should return "balance" as "bigint"', function() {
							return db.accounts
								.list({}, ['balance'], { limit: 1 })
								.then(function(data) {
									expect(data[0].balance).to.be.a('string');
								});
						});

						it('should return "u_balance" as "bigint"', function() {
							return db.accounts
								.list({}, ['u_balance'], { limit: 1 })
								.then(function(data) {
									expect(data[0].u_balance).to.be.a('string');
								});
						});

						it('should return "rate" as "bigint"', function() {
							return db.accounts
								.list({}, ['rate'], { limit: 1 })
								.then(function(data) {
									expect(data[0].rate).to.be.a('string');
								});
						});

						it('should return "fees" as "bigint"', function() {
							return db.accounts
								.list({}, ['fees'], { limit: 1 })
								.then(function(data) {
									expect(data[0].fees).to.be.a('string');
								});
						});

						it('should return "rewards" as "bigint"', function() {
							return db.accounts
								.list({}, ['rewards'], { limit: 1 })
								.then(function(data) {
									expect(data[0].rewards).to.be.a('string');
								});
						});

						it('should return "vote" as "bigint"', function() {
							return db.accounts
								.list({}, ['vote'], { limit: 1 })
								.then(function(data) {
									expect(data[0].vote).to.be.a('string');
								});
						});

						it('should return "producedBlocks" as "bigint"', function() {
							return db.accounts
								.list({}, ['producedBlocks'], { limit: 1 })
								.then(function(data) {
									expect(data[0].producedBlocks).to.be.a('string');
								});
						});

						it('should return "missedBlocks" as "bigint"', function() {
							return db.accounts
								.list({}, ['missedBlocks'], { limit: 1 })
								.then(function(data) {
									expect(data[0].missedBlocks).to.be.a('string');
								});
						});

						it('should return "virgin" as "boolean"', function() {
							return db.accounts
								.list({}, ['virgin'], { limit: 1 })
								.then(function(data) {
									expect(data[0].virgin).to.be.a('boolean');
								});
						});
					});

					describe('functions', function() {
						it('should always return "address" as "UPPER(address)"', function() {
							return db.accounts.list({}, ['address']).then(function(data) {
								data.forEach(function(account) {
									expect(account.address).to.eql(account.address.toUpperCase());
								});
							});
						});

						it('should always return "publicKey" as "ENCODE(publicKey, \'hex\')"', function() {
							return db.accounts.list({}, ['publicKey']).then(function(data) {
								data.forEach(function(account) {
									expect(account.publicKey).to.be.a('string');
								});
							});
						});

						it('should always return "secondPublicKey" as "ENCODE(secondPublicKey, \'hex\')"', function() {
							return db.accounts
								.list({}, ['secondPublicKey'])
								.then(function(data) {
									data.forEach(function(account) {
										if (account.secondPublicKey) {
											expect(account.secondPublicKey).to.be.a('string');
										}
									});
								});
						});
					});
				});

				describe('filters', function() {
					it('should return valid result if filter.username is provided', function() {
						return db.accounts
							.list({ username: validAccount.username })
							.then(function(data) {
								data.forEach(function(account) {
									expect(account.username).to.be.eql(validAccount.username);
								});
							});
					});

					it('should return valid result with composite conditions if filter.username AND filter.address is provided', function() {
						return db.accounts
							.list({
								username: validAccount.username,
								address: validAccount.address,
							})
							.then(function(data) {
								data.forEach(function(account) {
									expect(account.username).to.be.eql(validAccount.username);
									expect(account.address).to.be.eql(validAccount.address);
								});
							});
					});

					it('should throw error if unknown field is provided as filter', function(done) {
						db.accounts
							.list({ username: validAccount.username, unknownField: 'Alpha' })
							.then(function() {
								done('Error was expected');
							})
							.catch(function(reason) {
								expect(reason).to.eql('Unknown filter field provided to list');
								done();
							});
					});
				});

				describe('options', function() {
					describe('sort', function() {
						it('should sort by address in descending if options.sortField="address"', function() {
							return db.accounts
								.list({}, ['address'], { sortField: 'address', limit: 10 })
								.then(function(data) {
									var actualData = _.map(data, 'address');

									expect(actualData).to.be.eql(_(actualData).dbSort('desc'));
								});
						});

						it('should sort by address in ascending if options.sortField="address" and options.sortMethod="ASC"', function() {
							return db.accounts
								.list({}, ['address'], {
									sortField: 'address',
									sortMethod: 'ASC',
									limit: 10,
								})
								.then(function(data) {
									var actualData = _.map(data, 'address');

									expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
								});
						});

						it('should sort by username in ascending if options.sortField="username" and options.sortMethod="ASC"', function() {
							return db.accounts
								.list({}, ['address'], {
									sortField: 'username',
									sortMethod: 'ASC',
									limit: 10,
								})
								.then(function(data) {
									var actualData = _.map(data, 'username');

									expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
								});
						});

						it('should fail if unknown sort field is specified', function(done) {
							db.accounts
								.list({}, ['address'], { sortField: 'unknownField', limit: 10 })
								.then(function() {
									done('Error was expected');
								})
								.catch(function(reason) {
									expect(reason.message).to.eql(
										'column "unknownField" does not exist'
									);
									done();
								});
						});
					});

					describe('limit & offset', function() {
						beforeEach(function() {
							// Create 15 random accounts
							return Promise.map(new Array(15), function() {
								return createAccount();
							});
						});

						it('should return all results if no limit is specified', function() {
							var count;

							return db.accounts.list({}, ['address']).then(function(data) {
								count = data.length;

								return db
									.one('SELECT COUNT(*)::int as count from mem_accounts')
									.then(function(result) {
										expect(result.count).to.be.equal(count);
									});
							});
						});

						it('should return 10 results if options.limit=10', function() {
							return db.accounts
								.list({}, ['address'], { limit: 10 })
								.then(function(data) {
									expect(data.length).to.be.equal(10);
								});
						});

						it('should skip first 10 results if options.offset=10', function() {
							var previousData;

							return db.accounts
								.list({}, ['address'], { limit: 11 })
								.then(function(data) {
									previousData = data;

									expect(data.length).to.be.equal(11);
									return db.accounts.list({}, ['address'], {
										limit: 1,
										offset: 10,
									});
								})
								.then(function(data) {
									expect(data.length).to.be.equal(1);
									expect(data[0]).to.be.eql(previousData[10]);
								});
						});
					});
				});
			});

			describe('upsert', function() {
				it('should throw error if no conflict field is specified', function(done) {
					var account = generateAccount();

					db.accounts
						.upsert(account)
						.then(function(value) {
							done(value);
						})
						.catch(function(error) {
							expect(error.message).to.be.eql(
								'Error: db.accounts.upsert - invalid conflictingFields argument'
							);
							done();
						});
				});

				it('should succeed with null', function() {
					var account = generateAccount();

					return db.accounts.upsert(account, 'address').then(function(result) {
						expect(result).to.be.null;
					});
				});

				it('should insert account if conflictField="address" not found', function() {
					var account = generateAccount();

					return db.accounts.upsert(account, 'address').then(function() {
						return db.accounts
							.list({ address: account.address })
							.then(function(result) {
								expect(result.length).to.be.eql(1);
								expect(account).to.be.eql(_.omit(result[0], 'rank'));
							});
					});
				});

				it('should update account if conflictField="address" found', function() {
					var account1 = generateAccount();
					var account2 = generateAccount();

					// Since DB trigger protects from updating username only if it was null before
					delete account1.username;
					delete account1.u_username;

					account2.address = account1.address;

					return db.accounts.upsert(account1, 'address').then(function() {
						return db.accounts.upsert(account2, 'address').then(function() {
							return db.accounts
								.list({ address: account2.address })
								.then(function(result) {
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

				it('should insert only the columns specified in columnSet.insert', function() {
					var account = generateAccount();

					// Delegates is not mentioned in cs.insert so it should be skipped
					account.delegates = [randomstring.generate(10).toLowerCase()];

					return db.accounts.upsert(account, 'address').then(function() {
						return db.accounts
							.list({ address: account.address })
							.then(function(result) {
								expect(result.length).to.eql(1);
								expect(result[0].delegates).to.be.null;
							});
					});
				});

				it('should update only the columns specified in columnSet.update', function() {
					var originalAccount = generateAccount();
					var updatedAccount = generateAccount();

					// Since DB trigger protects from updating username only if it was null before
					delete originalAccount.username;
					delete originalAccount.u_username;

					return db.accounts
						.upsert(originalAccount, 'address')
						.then(function() {
							return db.accounts
								.upsert(originalAccount, 'address', updatedAccount)
								.then(function() {
									return db.accounts
										.list({ address: originalAccount.address })
										.then(function(result) {
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

				it('should update data attributes specified as "data" if argument "updateData" is missing', function() {
					var originalAccount = generateAccount();
					var updatedAccount = generateAccount();

					// Since DB trigger protects from updating username only if it was null before
					delete originalAccount.username;
					delete originalAccount.u_username;

					updatedAccount.address = originalAccount.address;

					return db.accounts
						.upsert(originalAccount, 'address')
						.then(function() {
							return db.accounts
								.upsert(updatedAccount, 'address')
								.then(function() {
									return db.accounts
										.list({ address: originalAccount.address })
										.then(function(result) {
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

				it('should match the values for conflict keys case sensitively', function() {
					var originalAccount = generateAccount();
					var updatedAccount = generateAccount();

					updatedAccount.username = originalAccount.username.toUpperCase();

					return db.accounts
						.upsert(originalAccount, 'username')
						.then(function() {
							return db.accounts
								.upsert(updatedAccount, 'username')
								.then(function() {
									return db.accounts
										.list({ username: updatedAccount.username })
										.then(function(result) {
											expect(result.length).to.eql(1);

											expect(_.omit(result[0], 'rank')).to.eql(updatedAccount);
										});
								});
						});
				});

				it('should match the multiple conflict keys with AND composite', function() {
					var originalAccount = generateAccount();
					var updatedAccount = generateAccount();

					updatedAccount.username = originalAccount.username;
					updatedAccount.u_username = originalAccount.u_username;

					return db.accounts
						.upsert(originalAccount, 'address')
						.then(function() {
							return db.accounts
								.upsert(updatedAccount, ['username', 'u_username'])
								.then(function() {
									return db.accounts
										.list({ username: updatedAccount.username })
										.then(function(result) {
											expect(result.length).to.eql(1);

											expect(result[0].address).to.eql(originalAccount.address);
										});
								});
						});
				});
			});

			describe('insert', function() {
				it('should insert account without any error', function() {
					var account = generateAccount();

					return db.accounts.insert(account);
				});

				it('should succeed with null', function() {
					var account = generateAccount();

					return db.accounts.insert(account).then(function(result) {
						expect(result).to.be.null;
					});
				});

				it('should insert all columns specified in db.accounts.cs.insert', function() {
					var account = generateAccount();

					return db.accounts.insert(account).then(function() {
						return db.accounts
							.list({ address: account.address })
							.then(function(result) {
								db.accounts.cs.insert.columns.forEach(function(column) {
									expect(result.length).to.eql(1);

									expect(result[0][column.prop || column.name]).to.eql(
										account[column.prop || column.name]
									);
								});
							});
					});
				});

				it('should not throw error when any unknown attribute is passed', function() {
					var account = generateAccount();
					account.unknownColumn = 'unnownValue';

					return db.accounts.insert(account);
				});
			});

			describe('update', function() {
				it('should update account without any error', function() {
					var account = generateAccount();

					return db.accounts.insert(account).then(function() {
						return db.accounts.update(account.address, account);
					});
				});

				it('should succeed with null', function() {
					var account = generateAccount();
					var updateAccount = generateAccount();

					return db.accounts.insert(account).then(function() {
						return db.accounts
							.update(account.address, updateAccount)
							.then(function(result) {
								expect(result).to.be.null;
							});
					});
				});

				it('should throw error if called without an address', function(done) {
					var account = generateAccount();

					db.accounts
						.update(null, account)
						.then(function() {
							done('should raise error if no address specified');
						})
						.catch(function(reason) {
							expect(reason.message).to.eql(
								'Error: db.accounts.update - invalid address argument'
							);
							done();
						});
				});

				it('should update all columns specified in db.accounts.cs.update', function() {
					var account = generateAccount();
					var updateAccount = generateAccount();

					// Since DB trigger protects from updating username only if it was null before
					delete account.username;
					delete account.u_username;

					return db.accounts.insert(account).then(function() {
						return db.accounts
							.update(account.address, updateAccount)
							.then(function() {
								return db.accounts
									.list({ address: account.address })
									.then(function(result) {
										db.accounts.cs.update.columns.forEach(function(column) {
											expect(result.length).to.eql(1);

											expect(result[0][column.prop || column.name]).to.eql(
												updateAccount[column.prop || column.name]
											);
										});
									});
							});
					});
				});

				it('should not throw error when any unknown attribute is passed', function() {
					var account = generateAccount();
					var updateAccount = generateAccount();

					updateAccount.unkownAttr = 'unknownAttr';

					return db.accounts.insert(account).then(function() {
						return db.accounts.update(account.address, updateAccount);
					});
				});
			});
		});
	});
});
