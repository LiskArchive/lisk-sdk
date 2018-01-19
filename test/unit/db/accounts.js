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

function createAccount () {
	var validAccount = {
		'username': randomstring.generate(10).toLowerCase(),
		'isDelegate': true,
		'u_isDelegate': false,
		'secondSignature': false,
		'u_secondSignature': false,
		'u_username': randomstring.generate(10).toLowerCase(),
		'address': randomstring.generate({charset: 'numeric', length: 20}) + 'L',
		'publicKey': randomstring.generate({charset: '0123456789ABCDE', length: 32}),
		'secondPublicKey': null,
		'balance': '0',
		'u_balance': '0',
		'vote': '10000000000000000',
		'rate': '0',
		'delegates': null,
		'u_delegates': null,
		'multisignatures': null,
		'u_multisignatures': null,
		'multimin': 0,
		'u_multimin': 0,
		'multilifetime': 0,
		'u_multilifetime': 0,
		'blockId': randomstring.generate({charset: 'numeric', length: 20}),
		'nameexist': 0,
		'u_nameexist': 0,
		'producedBlocks': 9,
		'missedBlocks': 0,
		'fees': '0',
		'rewards': '0',
		'virgin': true
	};

	return db.query(db.$config.pgp.helpers.insert(validAccount, db.accounts.cs.insert)).then(function () {
		return validAccount;
	});
}

describe('db', function () {

	before(function (done) {
		application.init({sandbox: {name: 'lisk_test_db_accounts'}}, function (err, scope) {
			db = scope.db;
			done(err);
		});
	});

	describe('accounts', function () {

		describe('initialization', function () {

			it('should initialize properly', function () {
				db.accounts.should.not.null;
			});
		});

		describe('methods', function () {

			describe('resetMemTables', function () {

				it('process without any error', function () {
					return db.accounts.resetMemTables();
				});

				it('empty the table "mem_round"', function () {
					return db.accounts.resetMemTables().then(function () {
						return db.one('SELECT COUNT(*)::int as count FROM mem_round');
					}).then(function (row) {
						row.count.should.equal(0);
					});
				});

				it('empty the table "mem_accounts2delegates"', function () {
					return db.accounts.resetMemTables().then(function () {
						return db.one('SELECT COUNT(*)::int as count FROM mem_accounts2delegates');
					}).then(function (row) {
						row.count.should.equal(0);
					});
				});

				it('empty the table "mem_accounts2u_delegates"', function () {
					return db.accounts.resetMemTables().then(function () {
						return db.one('SELECT COUNT(*)::int as count FROM mem_accounts2u_delegates');
					}).then(function (row) {
						row.count.should.equal(0);
					});
				});

				it('empty the table "mem_accounts2multisignatures"', function () {
					return db.accounts.resetMemTables().then(function () {
						return db.one('SELECT COUNT(*)::int as count FROM mem_accounts2multisignatures');
					}).then(function (row) {
						row.count.should.equal(0);
					});
				});

				it('empty the table "mem_accounts2u_multisignatures"', function () {
					return db.accounts.resetMemTables().then(function () {
						return db.one('SELECT COUNT(*)::int as count FROM mem_accounts2u_multisignatures');
					}).then(function (row) {
						row.count.should.equal(0);
					});
				});
			});

			describe('list', function (){

				before(function () {
					return createAccount().then(function (account) {
						validAccount = account;
					});
				});

				it('should return data without any error', function () {
					return db.accounts.list();
				});

				describe('fields', function () {

					it('should return all table fields if no field is specified', function () {
						return db.accounts.list().then(function (data) {

							var columnNames = _.map(db.accounts.cs.select.columns, function (column) {
								return column.prop || column.name;
							});

							data[0].should.have.all.keys(columnNames);
						});
					});

					it('should return only "address" if fields specify ["address"]', function () {
						return db.accounts.list({}, ['address']).then(function (data) {
							data.forEach(function (account) {
								account.should.have.all.keys(['address']);
							});
						});
					});

					it('should return only "address" and "isDelegate" if fields specify ["address", "isDelegate"]', function () {
						return db.accounts.list({}, ['address', 'isDelegate']).then(function (data) {
							data.forEach(function (account) {
								account.should.have.all.keys(['isDelegate', 'address']);
							});
						});
					});

					it('should skip if any unkown field specified ["address", "unKnownField"]', function () {
						return db.accounts.list({}, ['address', 'unKnownField']).then(function (data) {
							data.forEach(function (account) {
								account.should.have.all.keys(['address']);
							});
						});
					});

					describe('property names', function () {

						it('should return "producedblokcs" column if "producedBlocks" is asked', function () {
							var actualResult;

							return db.accounts.list({}, ['producedBlocks']).then(function (data) {
								actualResult = data;

								return db.query('SELECT producedblocks::bigint as "producedBlocks" FROM mem_accounts').then(function (result) {
									actualResult.should.eql(result);
								});
							});
						});

						it('should return "missedblocks" column if "missedBlocks" is asked', function () {
							var actualResult;

							return db.accounts.list({}, ['missedBlocks']).then(function (data) {
								actualResult = data;

								return db.query('SELECT missedblocks::bigint as "missedBlocks" FROM mem_accounts').then(function (result) {
									actualResult.should.eql(result);
								});
							});
						});
					});

					describe('dynamic fields', function () {

						it('should fetch "rank" based on query (row_number() OVER (ORDER BY "vote" DESC, "publicKey" ASC))', function () {
							var actualResult;

							return db.accounts.list({}, ['rank']).then(function (data) {
								actualResult = data;

								return db.query('SELECT row_number() OVER (ORDER BY "vote" DESC, "publicKey" ASC) as rank FROM mem_accounts').then(function (result) {
									actualResult.should.eql(result);
								});
							});
						});

						it('should fetch "delegates" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2delegates WHERE "accountId" = "mem_accounts"."address")', function () {
							return db.accounts.list({}, ['address', 'delegates']).then(function (data) {
								return Promise.map(data, function (account) {
									return db.one('SELECT (ARRAY_AGG("dependentId")) as "delegates" FROM mem_accounts2delegates WHERE "accountId" = \''+ account.address +'\'').then(function (result) {
										expect(account.delegates).to.be.eql(result.delegates);
									});
								});
							});
						});

						it('should fetch "u_delegates" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_delegates WHERE "accountId" = "mem_accounts"."address")', function () {
							return db.accounts.list({}, ['address', 'u_delegates']).then(function (data) {
								return Promise.map(data, function (account) {
									return db.one('SELECT (ARRAY_AGG("dependentId")) as "u_delegates" FROM mem_accounts2u_delegates WHERE "accountId" = \''+ account.address +'\'').then(function (result) {
										expect(account.u_delegates).to.be.eql(result.u_delegates);
									});
								});
							});
						});

						it('should fetch "multisignatures" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2multisignatures WHERE "accountId" = "mem_accounts"."address")', function () {
							return db.accounts.list({}, ['address', 'multisignatures']).then(function (data) {
								return Promise.map(data, function (account) {
									return db.one('SELECT (ARRAY_AGG("dependentId")) as "multisignatures" FROM mem_accounts2multisignatures WHERE "accountId" = \''+ account.address +'\'').then(function (result) {
										expect(account.multisignatures).to.be.eql(result.multisignatures);
									});
								});
							});
						});

						it('should fetch "u_multisignatures" based on query (SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_multisignatures WHERE "accountId" = "mem_accounts"."address")', function () {
							return db.accounts.list({}, ['address', 'u_multisignatures']).then(function (data) {
								return Promise.map(data, function (account) {
									return db.one('SELECT (ARRAY_AGG("dependentId")) as "u_multisignatures" FROM mem_accounts2u_multisignatures WHERE "accountId" = \''+ account.address +'\'').then(function (result) {
										expect(account.u_multisignatures).to.be.eql(result.u_multisignatures);
									});
								});
							});
						});
					});

					describe('data casting', function () {

						it('should return "isDelegate"  as "boolean"', function () {
							return db.accounts.list({}, ['isDelegate'], {limit: 1}).then(function (data) {
								data[0].isDelegate.should.be.a('boolean');
							});
						});

						it('should return "u_isDelegate"  as "boolean"', function () {
							return db.accounts.list({}, ['u_isDelegate'], {limit: 1}).then(function (data) {
								data[0].u_isDelegate.should.be.a('boolean');
							});
						});

						it('should return "secondSignature"  as "boolean"', function () {
							return db.accounts.list({}, ['secondSignature'], {limit: 1}).then(function (data) {
								data[0].secondSignature.should.be.a('boolean');
							});
						});

						it('should return "u_secondSignature"  as "boolean"', function () {
							return db.accounts.list({}, ['u_secondSignature'], {limit: 1}).then(function (data) {
								data[0].u_secondSignature.should.be.a('boolean');
							});
						});

						it('should return "balance"  as "bigint"', function () {
							return db.accounts.list({}, ['balance'], {limit: 1}).then(function (data) {
								data[0].balance.should.be.a('string');
							});
						});

						it('should return "u_balance"  as "bigint"', function () {
							return db.accounts.list({}, ['u_balance'], {limit: 1}).then(function (data) {
								data[0].u_balance.should.be.a('string');
							});
						});

						it('should return "rate"  as "bigint"', function () {
							return db.accounts.list({}, ['rate'], {limit: 1}).then(function (data) {
								data[0].rate.should.be.a('string');
							});
						});

						it('should return "fees"  as "bigint"', function () {
							return db.accounts.list({}, ['fees'], {limit: 1}).then(function (data) {
								data[0].fees.should.be.a('string');
							});
						});

						it('should return "rewards"  as "bigint"', function () {
							return db.accounts.list({}, ['rewards'], {limit: 1}).then(function (data) {
								data[0].rewards.should.be.a('string');
							});
						});

						it('should return "vote"  as "bigint"', function () {
							return db.accounts.list({}, ['vote'], {limit: 1}).then(function (data) {
								data[0].vote.should.be.a('string');
							});
						});

						it('should return "producedBlocks"  as "bigint"', function () {
							return db.accounts.list({}, ['producedBlocks'], {limit: 1}).then(function (data) {
								data[0].producedBlocks.should.be.a('string');
							});
						});

						it('should return "missedBlocks"  as "bigint"', function () {
							return db.accounts.list({}, ['missedBlocks'], {limit: 1}).then(function (data) {
								data[0].missedBlocks.should.be.a('string');
							});
						});

						it('should return "virgin"  as "boolean"', function () {
							return db.accounts.list({}, ['virgin'], {limit: 1}).then(function (data) {
								data[0].virgin.should.be.a('boolean');
							});
						});
					});

					describe('functions', function (){

						it('should always return "address" as "UPPER(address)"', function () {
							return db.accounts.list({}, ['address']).then(function (data) {
								data.forEach(function (account) {
									account.address.should.eql(account.address.toUpperCase());
								});
							});
						});

						it('should always return "publicKey" as "ENCODE(publicKey, \'hex\')"', function () {
							return db.accounts.list({}, ['publicKey']).then(function (data) {
								data.forEach(function (account) {
									account.publicKey.should.be.a('string');
								});
							});
						});

						it('should always return "secondPublicKey" as "ENCODE(secondPublicKey, \'hex\')"', function () {
							return db.accounts.list({}, ['secondPublicKey']).then(function (data) {
								data.forEach(function (account) {
									if(account.secondPublicKey) {
										should(account.secondPublicKey).be.a('string');
									}
								});
							});
						});
					});
				});

				describe('filters', function () {

					it('should return valid result if filter.username is provided', function () {
						return db.accounts.list({username: validAccount.username}).then(function (data) {
							data.forEach(function (account) {
								account.username.should.be.eql(validAccount.username);
							});
						});
					});

					it('should return valid result with composite conditions if filter.username AND filter.address is provided', function () {
						return db.accounts.list({username: validAccount.username, address: validAccount.address}).then(function (data) {
							data.forEach(function (account) {
								account.username.should.be.eql(validAccount.username);
								account.address.should.be.eql(validAccount.address);
							});
						});
					});

					it('should skip if unknown field is provided as filter', function () {
						return db.accounts.list({username: validAccount.username, unknownField: 'Alpha'}).then(function (data) {
							data.forEach(function (account) {
								account.username.should.be.eql(validAccount.username);
							});
						});
					});
				});

				describe('options', function () {

					describe('sort', function () {

						it('should sort by address in descending if options.sortField="address"', function () {
							return db.accounts.list({}, ['address'], {sortField: 'address', limit: 10}).then(function (data) {
								var actualData = _.map(data, 'address');

								actualData.should.be.eql(_(actualData).dbSort('desc'));
							});
						});

						it('should sort by address in ascending if options.sortField="address" and options.sortMethod="ASC"', function () {
							return db.accounts.list({}, ['address'], {sortField: 'address', sortMethod: 'ASC', limit: 10}).then(function (data) {
								var actualData = _.map(data, 'address');

								actualData.should.be.eql(_(actualData).dbSort('asc'));
							});
						});

						it('should sort by username in ascending if options.sortField="username" and options.sortMethod="ASC"', function () {
							return db.accounts.list({}, ['address'], {sortField: 'username', sortMethod: 'ASC', limit: 10}).then(function (data) {
								var actualData = _.map(data, 'username');

								actualData.should.be.eql(_(actualData).dbSort('asc'));
							});
						});

						it('should fail if unknown sort field is specified', function (done) {
							db.accounts.list({}, ['address'], {sortField: 'unknownField', limit: 10})
								.then(function (value) {
									done(value);
								})
								.catch(function (reason) {
									reason.message.should.to.be.eql('column "unknownField" does not exist');
									done();
								});
						});
					});

					describe('limit & offset', function () {

						beforeEach(function () {
							// Create 15 random accounts
							return Promise.map(new Array(15), function () {
								return createAccount();
							});
						});

						it('should return all result if no limit is specified', function () {
							var count;

							return db.accounts.list({}, ['address']).then(function (data) {
								count = data.length;

								return db.one('SELECT COUNT(address)::int as count from mem_accounts').then(function (result) {
									result.count.should.be.equal(count);
								});
							});
						});

						it('should return 10 result if options.limit=10', function () {
							return db.accounts.list({}, ['address'], {limit: 10}).then(function (data) {
								data.length.should.be.equal(10);
							});
						});

						it('should skip first 10 result if options.offset=10', function () {
							var previousData;

							return db.accounts.list({}, ['address'], {limit: 11}).then(function (data) {
								previousData = data;

								data.length.should.be.equal(11);
								return db.accounts.list({}, ['address'], {limit: 1, offset: 10});
							}).then(function (data) {

								data.length.should.be.equal(1);
								data[0].should.be.eql(previousData[10]);
							});
						});
					});
				});
			});
		});
	});
});
