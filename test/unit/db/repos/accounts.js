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
const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const accountFixtures = require('../../../fixtures').accounts;
const seeder = require('../../../common/db_seed');

let db;
let dbSandbox;
let validAccount;

function createAccount() {
	validAccount = new accountFixtures.Account();

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

	after(done => {
		dbSandbox.destroy();
		done();
	});

	beforeEach(done => {
		seeder
			.seed(db)
			.then(() => done(null))
			.catch(done);
	});

	afterEach(done => {
		sinonSandbox.restore();
		seeder
			.reset(db)
			.then(() => done(null))
			.catch(done);
	});

	it('should initialize db.accounts repo', () => {
		return expect(db.accounts).to.be.not.null;
	});

	describe('AccountsRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.accounts.db).to.be.eql(db);
				expect(db.accounts.pgp).to.be.eql(db.$config.pgp);
				expect(db.accounts.dbTable).to.be.eql('mem_accounts');

				expect(db.accounts.dbFields).to.an('array');
				expect(db.accounts.dbFields).to.have.lengthOf(27);

				expect(db.accounts.cs).to.an('object');
				expect(db.accounts.cs).to.not.empty;
				expect(db.accounts.cs).to.have.all.keys(['select', 'insert', 'update']);
				expect(db.accounts.cs.select.columns.map(c => c.name)).to.be.eql([
					'isDelegate',
					'u_isDelegate',
					'secondSignature',
					'u_secondSignature',
					'balance',
					'u_balance',
					'multimin',
					'u_multimin',
					'multilifetime',
					'u_multilifetime',
					'nameexist',
					'u_nameexist',
					'fees',
					'rewards',
					'vote',
					'producedBlocks',
					'missedBlocks',
					'username',
					'u_username',
					'publicKey',
					'secondPublicKey',
					'address',
					'rank',
					'delegates',
					'u_delegates',
					'multisignatures',
					'u_multisignatures',
				]);
				expect(db.accounts.cs.insert.columns.map(c => c.name)).to.be.eql([
					'isDelegate',
					'u_isDelegate',
					'secondSignature',
					'u_secondSignature',
					'balance',
					'u_balance',
					'multimin',
					'u_multimin',
					'multilifetime',
					'u_multilifetime',
					'nameexist',
					'u_nameexist',
					'fees',
					'rewards',
					'vote',
					'producedBlocks',
					'missedBlocks',
					'username',
					'u_username',
					'publicKey',
					'secondPublicKey',
					'address',
					'rank',
				]);
				return expect(db.accounts.cs.update.columns.map(c => c.name)).to.be.eql(
					[
						'isDelegate',
						'u_isDelegate',
						'secondSignature',
						'u_secondSignature',
						'balance',
						'u_balance',
						'multimin',
						'u_multimin',
						'multilifetime',
						'u_multilifetime',
						'nameexist',
						'u_nameexist',
						'fees',
						'rewards',
						'vote',
						'producedBlocks',
						'missedBlocks',
						'username',
						'u_username',
						'publicKey',
						'secondPublicKey',
					]
				);
			});
		});

		describe('getDBFields()', () => {
			it('should return all db fields', () => {
				const dbFields = db.accounts.getDBFields();

				expect(dbFields).to.not.empty;
				return expect(dbFields).to.have.lengthOf(db.accounts.dbFields.length);
			});
		});

		describe('getImmutableFields()', () => {
			it('should return only immutable account fields', () => {
				const immutableFields = db.accounts.getImmutableFields();

				return expect(immutableFields).to.eql(['address', 'rank']);
			});
		});

		describe('list()', () => {
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
						const columnNames = _.map(db.accounts.cs.select.columns, column => {
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
					return db.accounts.list({}, ['address', 'isDelegate']).then(data => {
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

				describe('dynamic fields', () => {
					it('should fetch "rank" based on query \'(SELECT m.row_number FROM (SELECT row_number() OVER (ORDER BY r."vote" DESC, r."publicKey" ASC), address FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address FROM mem_accounts AS d WHERE d."isDelegate" = 1) AS r) m WHERE m."address" = "mem_accounts"."address")::int\'', () => {
						let actualResult;

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
						return db.accounts.list({}, ['address', 'delegates']).then(data => {
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
											expect(account.u_delegates).to.be.eql(result.u_delegates);
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

					it('should return "rank" as null', () => {
						return db.accounts.list({}, ['rank'], { limit: 1 }).then(data => {
							expect(data[0].rank).to.eql(null);
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

					it('should return "producedBlocks" as "number"', () => {
						return db.accounts
							.list({}, ['producedBlocks'], { limit: 1 })
							.then(data => {
								expect(data[0].producedBlocks).to.be.a('number');
							});
					});

					it('should return "missedBlocks" as "number"', () => {
						return db.accounts
							.list({}, ['missedBlocks'], { limit: 1 })
							.then(data => {
								expect(data[0].missedBlocks).to.be.a('number');
							});
					});
				});

				describe('functions', () => {
					it('should always return "publicKey" as "encode(publicKey, \'hex\')"', () => {
						return db.accounts.list({}, ['publicKey']).then(data => {
							data.forEach(account => {
								expect(account.publicKey).to.be.a('string');
							});
						});
					});

					it('should always return "secondPublicKey" as "encode(secondPublicKey, \'hex\')"', () => {
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
				it('should use pgp.helpers.sets with correct parameters', function*() {
					sinonSandbox.spy(db.$config.pgp.helpers, 'sets');

					const account = new accountFixtures.Account();
					yield db.accounts.insert(account);
					yield db.accounts.list({ address: account.address }, [
						'address',
						'publicKey',
					]);

					return expect(db.$config.pgp.helpers.sets).to.be.calledWithExactly(
						{ address: account.address },
						db.accounts.cs.select.columns.filter(
							column => column.name === 'address'
						)
					);
				});

				it('should return a multisig account if filter.multisig is provided', function*() {
					const account = new accountFixtures.Account();
					account.multimin = 1;

					yield db.accounts.insert(account);
					const accounts = yield db.accounts.list({ multisig: true });

					expect(accounts).to.lengthOf(1);
					return expect(accounts[0].address).to.eql(account.address);
				});

				it('should return a multiple accounts if filter.address is provided as array', function*() {
					const account1 = new accountFixtures.Account();
					const account2 = new accountFixtures.Account();

					yield db.accounts.insert(account1);
					yield db.accounts.insert(account2);
					const accounts = yield db.accounts.list({
						address: [account1.address, account2.address],
					});

					expect(accounts).to.lengthOf(2);
					expect(accounts[0].address).to.eql(account1.address);
					return expect(accounts[1].address).to.eql(account2.address);
				});

				it('should return valid result if filter.username is provided', () => {
					return db.accounts
						.list({ username: validAccount.username })
						.then(data => {
							data.forEach(account => {
								expect(account.username).to.be.eql(validAccount.username);
							});
						});
				});

				it('should return valid result if filter.username is provided with $like object', function*() {
					const account1 = new accountFixtures.Account({
						username: 'AlphaBravo',
					});
					const account2 = new accountFixtures.Account({
						username: 'BravoCharlie',
					});

					yield db.accounts.insert(account1);
					yield db.accounts.insert(account2);

					const accounts = yield db.accounts.list({
						username: { $like: '%Bravo%' },
					});

					expect(accounts).to.lengthOf(2);
					expect(accounts[0].address).to.eql(account1.address);
					return expect(accounts[1].address).to.eql(account2.address);
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

				it('should throw error if unknown field is provided as filter', () => {
					return expect(
						db.accounts.list({
							username: validAccount.username,
							unknownField: 'Alpha',
						})
					).to.be.rejectedWith('Unknown filter field provided to list');
				});
			});

			describe('options', () => {
				describe('sort', () => {
					it('should sort by address in descending if options.sortField="address"', () => {
						return db.accounts
							.list({}, ['address'], { sortField: 'address', limit: 10 })
							.then(data => {
								const actualData = _.map(data, 'address');

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
								const actualData = _.map(data, 'address');

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
								const actualData = _.map(data, 'username');

								expect(actualData).to.be.eql(_(actualData).dbSort('asc'));
							});
					});

					it('should sort by multiple keys if sortField and sortField is provided as array', function*() {
						const accounts = yield db.accounts.list(
							{},
							['address', 'username'],
							{
								sortField: ['username', 'address'],
								sortMethod: ['DESC', 'ASC'],
							}
						);

						const sortedAccounts = _.orderBy(
							Object.assign({}, accounts),
							['username', 'address'],
							['desc', 'asc']
						);

						expect(accounts).to.lengthOf.above(0);
						return expect(accounts).to.eql(sortedAccounts);
					});

					it('should fail if unknown sort field is specified', () => {
						return expect(
							db.accounts.list({}, ['address'], {
								sortField: 'unknownField',
								limit: 10,
							})
						).to.be.rejectedWith('column "unknownField" does not exist');
					});
				});

				describe('extraCondition', () => {
					it('should use additional SQL condition if options.extraCondition is provided', function*() {
						const account = new accountFixtures.Account({
							username: 'AlphaBravo',
						});

						yield db.accounts.insert(account);

						const accounts = yield db.accounts.list({}, ['address'], {
							extraCondition: `"username" = 'AlphaBravo' AND "address" = '${
								account.address
							}'`,
						});

						expect(accounts).to.lengthOf(1);
						return expect(accounts[0].address).to.eql(account.address);
					});
				});

				describe('limit & offset', () => {
					it('should return all results if no limit is specified', () => {
						let count;

						return db.accounts.list({}, ['address']).then(data => {
							count = data.length;

							return db
								.one('SELECT COUNT(*)::int as count from mem_accounts')
								.then(result => {
									expect(result.count).to.be.equal(count);
								});
						});
					});

					it('should return 1 result if options.limit=1', () => {
						return db.accounts
							.list({}, ['address'], { limit: 1 })
							.then(data => {
								expect(data.length).to.be.equal(1);
							});
					});

					it('should skip first result if options.offset=1', () => {
						let previousData;

						return db.accounts
							.list({}, ['address'], { limit: 2 })
							.then(data => {
								previousData = data;
								return db.accounts.list({}, ['address'], {
									limit: 1,
									offset: 1,
								});
							})
							.then(data => {
								expect(previousData.length).to.eql(2);
								expect(data.length).to.eql(1);
								expect(data[0]).to.eql(previousData[1]);
							});
					});
				});
			});
		});
	});
});
