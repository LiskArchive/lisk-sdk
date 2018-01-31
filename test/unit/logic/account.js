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

var rewire = require('rewire');

var constants = require('../../../helpers/constants.js');

var application = require('../../common/application.js');

var modulesLoader = require('../../common/modules_loader');
var Account = rewire('../../../logic/account.js');

var validAccount = {
	username: 'genesis_100',
	isDelegate: 1,
	u_isDelegate: 0,
	secondSignature: 0,
	u_secondSignature: 0,
	u_username: null,
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	secondPublicKey: null,
	balance: 0,
	u_balance: 0,
	rate: 0,
	delegates: null,
	u_delegates: null,
	multisignatures: null,
	u_multisignatures: null,
	multimin: 0,
	u_multimin: 0,
	multilifetime: 1,
	u_multilifetime: 1,
	blockId: '6524861224470851795',
	nameexist: 0,
	u_nameexist: 0,
	fees: 0,
	rank: 70,
	rewards: 0,
	vote: 10000000000000000,
	producedBlocks: 0,
	missedBlocks: 0,
	virgin: 1,
	approval: 100,
	productivity: 0,
};

describe('account', function() {
	var account;
	var accountLogic;

	before(function(done) {
		application.init(
			{ sandbox: { name: 'lisk_test_logic_accounts' } },
			function(err, scope) {
				account = scope.logic.account;
				done();
			}
		);
	});

	after(function(done) {
		application.cleanup(done);
	});

	describe('Account constructor', function() {
		var library;
		var dbStub;

		before(function(done) {
			dbStub = {
				query: sinonSandbox.stub().resolves(),
				migrations: {
					createMemoryTables: sinonSandbox.stub().resolves(),
				},
			};

			new Account(
				dbStub,
				modulesLoader.scope.schema,
				modulesLoader.scope.logger,
				function(err, lgAccount) {
					accountLogic = lgAccount;
					library = Account.__get__('library');
					done();
				}
			);
		});

		it('should attach schema to scope variable', function() {
			expect(accountLogic.scope.schema).to.eql(modulesLoader.scope.schema);
		});

		it('should attach db to scope variable', function() {
			expect(accountLogic.scope.db).to.eql(dbStub);
		});

		it('should attach logger to library variable', function() {
			expect(library.logger).to.eql(modulesLoader.scope.logger);
		});
	});

	describe('resetMemTables', function() {
		it('should remove the tables', function(done) {
			account.resetMemTables(function(err, res) {
				expect(err).to.not.exist;
				expect(res).to.be.undefined;
				done();
			});
		});
	});

	describe('objectNormalize', function() {
		it('should be okay for a valid account object', function() {
			expect(account.objectNormalize(validAccount)).to.be.an('object');
		});
	});

	describe('verifyPublicKey', function() {
		it('should be okay for empty params', function() {
			expect(account.verifyPublicKey()).to.be.undefined;
		});

		it('should throw error if parameter is not a string', function() {
			expect(function() {
				account.verifyPublicKey(1);
			}).to.throw('Invalid public key, must be a string');
		});

		it('should throw error if parameter is of invalid length', function() {
			expect(function() {
				account.verifyPublicKey('231312312321');
			}).to.throw('Invalid public key, must be 64 characters long');
		});

		it('should throw error if parameter is not a hex string', function() {
			expect(function() {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az'
				);
			}).to.throw('Invalid public key, must be a hex string');
		});

		it('should be okay if parameter is in correct format', function() {
			expect(function() {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a2'
				);
			}).to.not.throw();
		});
	});

	describe('toDB', function() {
		it('should normalize address and transform publicKey and secondPublicKey to Buffer hex', function(done) {
			var raw = {
				address: '16313739661670634666l',
				publicKey:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
				secondPublicKey:
					'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
			};
			var toDBRes = _.cloneDeep(raw);

			account.toDB(toDBRes);
			expect(toDBRes.address).to.equal(raw.address.toUpperCase());
			expect(toDBRes.publicKey).to.deep.equal(
				Buffer.from(raw.publicKey, 'hex')
			);
			expect(toDBRes.secondPublicKey).to.deep.equal(
				Buffer.from(raw.secondPublicKey, 'hex')
			);
			done();
		});
	});

	describe('get', function() {
		it('should only get requested fields for account', function(done) {
			var requestedFields = ['username', 'isDelegate', 'address', 'publicKey'];

			account.get({ address: validAccount.address }, requestedFields, function(
				err,
				res
			) {
				expect(err).to.not.exist;
				expect(res).to.be.an('object');
				expect(Object.keys(res).sort()).to.eql(requestedFields.sort());
				done();
			});
		});

		it('should get all fields if fields parameters is not set', function(done) {
			account.get({ address: validAccount.address }, function(err, res) {
				expect(err).to.not.exist;
				expect(Object.keys(res).sort()).to.eql(
					Object.keys(validAccount).sort()
				);
				done();
			});
		});

		it('should return null for non-existent account', function(done) {
			account.get({ address: 'invalid address' }, function(err, res) {
				expect(err).to.not.exist;
				expect(res).to.equal(null);
				done();
			});
		});

		it('should get the correct account against address', function(done) {
			account.get({ address: validAccount.address }, function(err, res) {
				expect(err).to.not.exist;
				expect(res).to.be.an('object');
				expect(res.username).to.equal(validAccount.username);
				expect(res.isDelegate).to.equal(!!validAccount.isDelegate);
				expect(res.address).to.equal(validAccount.address);
				expect(res.publicKey).to.equal(validAccount.publicKey);
				expect(res.delegates).to.equal(validAccount.delegates);
				done();
			});
		});
	});

	describe('calculateApproval', function() {
		it('when voterBalance = 0 and totalSupply = 0, it should return 0', function() {
			expect(account.calculateApproval(0, 0)).to.equal(0);
		});

		it('when voterBalance = totalSupply, it should return 100', function() {
			var totalSupply = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			var votersBalance = totalSupply;
			expect(account.calculateApproval(votersBalance, totalSupply)).to.equal(
				100
			);
		});

		it('when voterBalance = 50 and total supply = 100, it should return 50', function() {
			expect(account.calculateApproval(50, 100)).to.equal(50);
		});

		it('with random values, it should return approval between 0 and 100', function() {
			// So total supply is never 0
			var totalSupply = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			var votersBalance = Math.floor(Math.random() * totalSupply);
			expect(account.calculateApproval(votersBalance, totalSupply))
				.to.be.least(0)
				.and.be.at.most(100);
		});
	});

	describe('calculateProductivity', function() {
		it('when missedBlocks = 0 and producedBlocks = 0, it should return 0', function() {
			expect(account.calculateProductivity(0, 0)).to.equal(0);
		});

		it('when missedBlocks = producedBlocks, it should return 50', function() {
			var producedBlocks = Math.floor(Math.random() * 1000000000);
			var missedBlocks = producedBlocks;
			expect(
				account.calculateProductivity(producedBlocks, missedBlocks)
			).to.equal(50);
		});

		it('when missedBlocks = 5 and producedBlocks = 15, it should return 75', function() {
			var missedBlocks = 5;
			var producedBlocks = 15;
			expect(
				account.calculateProductivity(producedBlocks, missedBlocks)
			).to.equal(75);
		});

		it('with random values, it should return approval between 0 and 100', function() {
			var missedBlocks = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			var producedBlocks = Math.floor(Math.random() * missedBlocks);
			expect(account.calculateProductivity(producedBlocks, missedBlocks))
				.to.be.least(0)
				.and.be.at.most(100);
		});
	});

	describe('getAll', function() {
		var allAccounts;

		before(function(done) {
			// Use high limit to be sure that we grab all accounts
			account.getAll({ limit: 1000 }, function(err, res) {
				allAccounts = res;
				done();
			});
		});

		it('should remove any non-existent fields and return result', function(done) {
			var fields = ['address', 'username', 'non-existent-field'];

			account.getAll({ address: validAccount.address }, fields, function(
				err,
				res
			) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].address).to.equal(validAccount.address);
				expect(Object.keys(res[0])).to.include('address', 'username');
				done();
			});
		});

		it('should only get requested fields for account', function(done) {
			var requestedFields = ['username', 'isDelegate', 'address', 'publicKey'];

			account.get({ address: validAccount.address }, requestedFields, function(
				err,
				res
			) {
				expect(err).to.not.exist;
				expect(res).to.be.an('object');
				expect(Object.keys(res).sort()).to.eql(requestedFields.sort());
				done();
			});
		});

		it('should get rows with only productivity field', function(done) {
			account.getAll({}, ['productivity'], function(err, res) {
				expect(err).to.not.exist;
				res.forEach(function(row) {
					expect(row)
						.to.have.property('productivity')
						.that.is.a('Number')
						.to.be.at.least(0)
						.and.at.most(100);
					expect(Object.keys(row)).to.have.length(1);
				});
				done();
			});
		});

		it('should get rows with only approval field', function(done) {
			account.getAll({}, ['approval'], function(err, res) {
				expect(err).to.not.exist;
				res.forEach(function(row) {
					expect(row)
						.to.have.property('approval')
						.that.is.a('Number')
						.to.be.at.least(0)
						.and.at.most(100);
					expect(Object.keys(row)).to.have.length(1);
				});
				done();
			});
		});

		it('should not remove dependent fields if they were requested', function(done) {
			account.getAll({}, ['approval', 'vote'], function(err, res) {
				expect(err).to.not.exist;
				res.forEach(function(row) {
					expect(row)
						.to.have.property('approval')
						.that.is.a('Number')
						.to.be.at.least(0)
						.and.at.most(100);
					expect(row)
						.to.have.property('vote')
						.that.is.a('String');
					expect(Object.keys(row)).to.have.length(2);
				});
				done();
			});
		});

		it('should use default limit when limit below 1', function(done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username')
				.map(function(v) {
					return { username: v.username };
				})
				.slice(0, constants.activeDelegates);

			account.getAll(
				{
					limit: 0,
					sort: 'username:asc',
				},
				['username'],
				function(err, res) {
					expect(err).to.not.exist;
					expect(res).to.eql(sortedUsernames);
					done();
				}
			);
		});

		it('should use default limit and ignore offset when offset below 1', function(done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username')
				.map(function(v) {
					return { username: v.username };
				})
				.slice(0, constants.activeDelegates);

			account.getAll(
				{
					offset: 0,
					sort: 'username:asc',
				},
				['username'],
				function(err, res) {
					expect(err).to.not.exist;
					expect(res).to.eql(sortedUsernames);
					done();
				}
			);
		});

		it('should fetch correct result using address as filter', function(done) {
			account.getAll({ address: validAccount.address }, function(err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(!!validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				done();
			});
		});

		it('should fetch correct result using address as filter when its in lower case', function(done) {
			account.getAll({ address: validAccount.address.toLowerCase() }, function(
				err,
				res
			) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(!!validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				done();
			});
		});

		it('should fetch correct result using username as filter', function(done) {
			account.getAll({ username: validAccount.username }, function(err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(!!validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				done();
			});
		});

		it('should fetch all delegates using isDelegate filter', function(done) {
			account.getAll({ isDelegate: 1 }, function(err, res) {
				expect(err).to.not.exist;
				expect(
					res.filter(function(a) {
						return a.isDelegate === true;
					}).length
				).to.equal(res.length);
				done();
			});
		});

		it('should throw error if unrelated filters are provided', function(done) {
			account.getAll(
				{ publicKey: validAccount.publicKey, unrelatedfield: 'random value' },
				function(err) {
					expect(err).to.equal('Account#getAll error');
					done();
				}
			);
		});

		it('should fetch results with limit of 50', function(done) {
			_.sortBy(allAccounts, 'username')
				.map(function(v) {
					return { username: v.username };
				})
				.slice(0, 50);

			account.getAll(
				{
					limit: 50,
					offset: 0,
					sort: 'username:asc',
				},
				['username'],
				function(err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.length(50);
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				}
			);
		});

		it('should ignore negative limit', function(done) {
			account.getAll(
				{
					limit: -50,
					sort: 'username:asc',
				},
				['username'],
				function(err, res) {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				}
			);
		});

		describe('sort using string as argument', function() {
			it('should sort the result according to field type in ascending order', function(done) {
				account.getAll({ sort: 'username:asc' }, ['username'], function(
					err,
					res
				) {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				});
			});

			it('should sort the result according to field type in descending order', function(done) {
				account.getAll({ sort: 'username:desc' }, ['username'], function(
					err,
					res
				) {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username').reverse());
					done();
				});
			});
		});

		describe('sort using object as argument', function() {
			it('should sort the result according to field type in ascending order', function(done) {
				account.getAll({ sort: { username: 1 } }, ['username'], function(
					err,
					res
				) {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				});
			});

			it('should sort the result according to field type in descending order', function(done) {
				account.getAll({ sort: { username: -1 } }, ['username'], function(
					err,
					res
				) {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username').reverse());
					done();
				});
			});
		});
	});

	describe('set', function() {
		it('should insert an account', function(done) {
			account.set('123L', { u_username: 'test_set_insert' }, function(
				err,
				res
			) {
				expect(err).to.not.exist;
				expect(res).to.be.undefined;
				done();
			});
		});

		it('should set provided fields when valid', function(done) {
			account.set(
				validAccount.address,
				{ u_username: 'test_set', vote: 1 },
				function(err, res) {
					expect(err).to.not.exist;
					expect(res).to.be.undefined;
					done();
				}
			);
		});

		it('should throw error when unrelated fields are provided', function(done) {
			account.set(
				validAccount.address,
				{ unrelatedfield: 'random value' },
				function(err) {
					expect(err).to.equal('Account#set error');
					done();
				}
			);
		});
	});

	describe('merge', function() {
		it('should merge diff when values are correct', function(done) {
			account.merge(
				validAccount.address,
				{ multisignatures: ['MS1'], delegates: ['DLG1'] },
				function(err, res) {
					expect(err).to.not.exist;
					expect(res.delegates).to.deep.equal(['DLG1']);
					expect(res.multisignatures).to.deep.equal(['MS1']);
					done();
				}
			);
		});

		describe('verify public key', function() {
			it('should throw error if parameter is not a string', function() {
				expect(function() {
					account.merge(validAccount.address, { publicKey: 1 });
				}).to.throw('Invalid public key, must be a string');
			});

			it('should throw error if parameter is of invalid length', function() {
				expect(function() {
					account.merge(validAccount.address, { publicKey: '231312312321' });
				}).to.throw('Invalid public key, must be 64 characters long');
			});

			it('should throw error if parameter is not a hex string', function() {
				expect(function() {
					account.merge(validAccount.address, {
						publicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az',
					});
				}).to.throw('Invalid public key, must be a hex string');
			});
		});

		describe('check database constraints', function() {
			it('should throw error when address does not exist for u_delegates', function(done) {
				account.merge('1L', { u_delegates: [validAccount.publicKey] }, function(
					err
				) {
					expect(err).to.equal('Account#merge error');
					done();
				});
			});

			it('should throw error when address does not exist for delegates', function(done) {
				account.merge('1L', { delegates: [validAccount.publicKey] }, function(
					err
				) {
					expect(err).to.equal('Account#merge error');
					done();
				});
			});

			it('should throw error when address does not exist for u_multisignatures', function(done) {
				account.merge(
					'1L',
					{ u_multisignatures: [validAccount.publicKey] },
					function(err) {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});

			it('should throw error when address does not exist for multisignatures', function(done) {
				account.merge(
					'1L',
					{ multisignatures: [validAccount.publicKey] },
					function(err) {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});
		});

		it('should throw error when a numeric field receives non numeric value', function(done) {
			account.merge(validAccount.address, { balance: 'Not a Number' }, function(
				err
			) {
				expect(err).to.equal('Encountered insane number: Not a Number');
				done();
			});
		});
	});

	describe('remove', function() {
		it('should remove an account', function(done) {
			account.remove('123L', function(err, res) {
				expect(err).to.not.exist;
				expect(res).to.equal('123L');
				done();
			});
		});
	});
});
