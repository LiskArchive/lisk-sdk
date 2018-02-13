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

describe('account', () => {
	var account;
	var accountLogic;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_logic_accounts' } },
			(err, scope) => {
				account = scope.logic.account;
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('Account constructor', () => {
		var library;
		var dbStub;

		before(done => {
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
				(err, lgAccount) => {
					accountLogic = lgAccount;
					library = Account.__get__('library');
					done();
				}
			);
		});

		it('should attach schema to scope variable', () => {
			expect(accountLogic.scope.schema).to.eql(modulesLoader.scope.schema);
		});

		it('should attach db to scope variable', () => {
			expect(accountLogic.scope.db).to.eql(dbStub);
		});

		it('should attach logger to library variable', () => {
			expect(library.logger).to.eql(modulesLoader.scope.logger);
		});
	});

	describe('resetMemTables', () => {
		it('should remove the tables', done => {
			account.resetMemTables((err, res) => {
				expect(err).to.not.exist;
				expect(res).to.be.undefined;
				done();
			});
		});
	});

	describe('objectNormalize', () => {
		it('should be okay for a valid account object', () => {
			expect(account.objectNormalize(validAccount)).to.be.an('object');
		});
	});

	describe('verifyPublicKey', () => {
		it('should be okay for empty params', () => {
			expect(account.verifyPublicKey()).to.be.undefined;
		});

		it('should throw error if parameter is not a string', () => {
			expect(() => {
				account.verifyPublicKey(1);
			}).to.throw('Invalid public key, must be a string');
		});

		it('should throw error if parameter is of invalid length', () => {
			expect(() => {
				account.verifyPublicKey('231312312321');
			}).to.throw('Invalid public key, must be 64 characters long');
		});

		it('should throw error if parameter is not a hex string', () => {
			expect(() => {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az'
				);
			}).to.throw('Invalid public key, must be a hex string');
		});

		it('should be okay if parameter is in correct format', () => {
			expect(() => {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a2'
				);
			}).to.not.throw();
		});
	});

	describe('toDB', () => {
		it('should normalize address and transform publicKey and secondPublicKey to Buffer hex', done => {
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

	describe('get', () => {
		it('should only get requested fields for account', done => {
			var requestedFields = ['username', 'isDelegate', 'address', 'publicKey'];

			account.get(
				{ address: validAccount.address },
				requestedFields,
				(err, res) => {
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					expect(Object.keys(res).sort()).to.eql(requestedFields.sort());
					done();
				}
			);
		});

		it('should get all fields if fields parameters is not set', done => {
			account.get({ address: validAccount.address }, (err, res) => {
				expect(err).to.not.exist;
				expect(Object.keys(res).sort()).to.eql(
					Object.keys(validAccount).sort()
				);
				done();
			});
		});

		it('should return null for non-existent account', done => {
			account.get({ address: 'invalid address' }, (err, res) => {
				expect(err).to.not.exist;
				expect(res).to.equal(null);
				done();
			});
		});

		it('should get the correct account against address', done => {
			account.get({ address: validAccount.address }, (err, res) => {
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

	describe('calculateApproval', () => {
		it('when voterBalance = 0 and totalSupply = 0, it should return 0', () => {
			expect(account.calculateApproval(0, 0)).to.equal(0);
		});

		it('when voterBalance = totalSupply, it should return 100', () => {
			var totalSupply = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			var votersBalance = totalSupply;
			expect(account.calculateApproval(votersBalance, totalSupply)).to.equal(
				100
			);
		});

		it('when voterBalance = 50 and total supply = 100, it should return 50', () => {
			expect(account.calculateApproval(50, 100)).to.equal(50);
		});

		it('with random values, it should return approval between 0 and 100', () => {
			// So total supply is never 0
			var totalSupply = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			var votersBalance = Math.floor(Math.random() * totalSupply);
			expect(account.calculateApproval(votersBalance, totalSupply))
				.to.be.least(0)
				.and.be.at.most(100);
		});
	});

	describe('calculateProductivity', () => {
		it('when missedBlocks = 0 and producedBlocks = 0, it should return 0', () => {
			expect(account.calculateProductivity(0, 0)).to.equal(0);
		});

		it('when missedBlocks = producedBlocks, it should return 50', () => {
			var producedBlocks = Math.floor(Math.random() * 1000000000);
			var missedBlocks = producedBlocks;
			expect(
				account.calculateProductivity(producedBlocks, missedBlocks)
			).to.equal(50);
		});

		it('when missedBlocks = 5 and producedBlocks = 15, it should return 75', () => {
			var missedBlocks = 5;
			var producedBlocks = 15;
			expect(
				account.calculateProductivity(producedBlocks, missedBlocks)
			).to.equal(75);
		});

		it('with random values, it should return approval between 0 and 100', () => {
			var missedBlocks = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			var producedBlocks = Math.floor(Math.random() * missedBlocks);
			expect(account.calculateProductivity(producedBlocks, missedBlocks))
				.to.be.least(0)
				.and.be.at.most(100);
		});
	});

	describe('getAll', () => {
		var allAccounts;

		before(done => {
			// Use high limit to be sure that we grab all accounts
			account.getAll({ limit: 1000 }, (err, res) => {
				allAccounts = res;
				done();
			});
		});

		it('should remove any non-existent fields and return result', done => {
			var fields = ['address', 'username', 'non-existent-field'];

			account.getAll({ address: validAccount.address }, fields, (err, res) => {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].address).to.equal(validAccount.address);
				expect(Object.keys(res[0])).to.include('address', 'username');
				done();
			});
		});

		it('should only get requested fields for account', done => {
			var requestedFields = ['username', 'isDelegate', 'address', 'publicKey'];

			account.get(
				{ address: validAccount.address },
				requestedFields,
				(err, res) => {
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					expect(Object.keys(res).sort()).to.eql(requestedFields.sort());
					done();
				}
			);
		});

		it('should get rows with only productivity field', done => {
			account.getAll({}, ['productivity'], (err, res) => {
				expect(err).to.not.exist;
				res.forEach(row => {
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

		it('should get rows with only approval field', done => {
			account.getAll({}, ['approval'], (err, res) => {
				expect(err).to.not.exist;
				res.forEach(row => {
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

		it('should not remove dependent fields if they were requested', done => {
			account.getAll({}, ['approval', 'vote'], (err, res) => {
				expect(err).to.not.exist;
				res.forEach(row => {
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

		it('should use default limit when limit below 1', done => {
			var sortedUsernames = _.sortBy(allAccounts, 'username')
				.map(v => {
					return { username: v.username };
				})
				.slice(0, constants.activeDelegates);

			account.getAll(
				{
					limit: 0,
					sort: 'username:asc',
				},
				['username'],
				(err, res) => {
					expect(err).to.not.exist;
					expect(res).to.eql(sortedUsernames);
					done();
				}
			);
		});

		it('should use default limit and ignore offset when offset below 1', done => {
			var sortedUsernames = _.sortBy(allAccounts, 'username')
				.map(v => {
					return { username: v.username };
				})
				.slice(0, constants.activeDelegates);

			account.getAll(
				{
					offset: 0,
					sort: 'username:asc',
				},
				['username'],
				(err, res) => {
					expect(err).to.not.exist;
					expect(res).to.eql(sortedUsernames);
					done();
				}
			);
		});

		it('should fetch correct result using address as filter', done => {
			account.getAll({ address: validAccount.address }, (err, res) => {
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

		it('should fetch correct result using address as filter when its in lower case', done => {
			account.getAll(
				{ address: validAccount.address.toLowerCase() },
				(err, res) => {
					expect(err).to.not.exist;
					expect(res.length).to.equal(1);
					expect(res[0].username).to.equal(validAccount.username);
					expect(res[0].isDelegate).to.equal(!!validAccount.isDelegate);
					expect(res[0].address).to.equal(validAccount.address);
					expect(res[0].publicKey).to.equal(validAccount.publicKey);
					expect(res[0].delegates).to.equal(validAccount.delegates);
					done();
				}
			);
		});

		it('should fetch correct result using username as filter', done => {
			account.getAll({ username: validAccount.username }, (err, res) => {
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

		it('should fetch all delegates using isDelegate filter', done => {
			account.getAll({ isDelegate: 1 }, (err, res) => {
				expect(err).to.not.exist;
				expect(
					res.filter(a => {
						return a.isDelegate === true;
					}).length
				).to.equal(res.length);
				done();
			});
		});

		it('should throw error if unrelated filters are provided', done => {
			account.getAll(
				{ publicKey: validAccount.publicKey, unrelatedfield: 'random value' },
				err => {
					expect(err).to.equal('Account#getAll error');
					done();
				}
			);
		});

		it('should fetch results with limit of 50', done => {
			_.sortBy(allAccounts, 'username')
				.map(v => {
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
				(err, res) => {
					expect(err).to.not.exist;
					expect(res).to.have.length(50);
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				}
			);
		});

		it('should ignore negative limit', done => {
			account.getAll(
				{
					limit: -50,
					sort: 'username:asc',
				},
				['username'],
				(err, res) => {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				}
			);
		});

		describe('sort using string as argument', () => {
			it('should sort the result according to field type in ascending order', done => {
				account.getAll({ sort: 'username:asc' }, ['username'], (err, res) => {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				});
			});

			it('should sort the result according to field type in descending order', done => {
				account.getAll({ sort: 'username:desc' }, ['username'], (err, res) => {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username').reverse());
					done();
				});
			});
		});

		describe('sort using object as argument', () => {
			it('should sort the result according to field type in ascending order', done => {
				account.getAll({ sort: { username: 1 } }, ['username'], (err, res) => {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username'));
					done();
				});
			});

			it('should sort the result according to field type in descending order', done => {
				account.getAll({ sort: { username: -1 } }, ['username'], (err, res) => {
					expect(err).to.not.exist;
					expect(res).to.eql(_.sortBy(res, 'username').reverse());
					done();
				});
			});
		});
	});

	describe('set', () => {
		it('should insert an account', done => {
			account.set('123L', { u_username: 'test_set_insert' }, (err, res) => {
				expect(err).to.not.exist;
				expect(res).to.be.undefined;
				done();
			});
		});

		it('should set provided fields when valid', done => {
			account.set(
				validAccount.address,
				{ u_username: 'test_set', vote: 1 },
				(err, res) => {
					expect(err).to.not.exist;
					expect(res).to.be.undefined;
					done();
				}
			);
		});

		it('should throw error when unrelated fields are provided', done => {
			account.set(
				validAccount.address,
				{ unrelatedfield: 'random value' },
				err => {
					expect(err).to.equal('Account#set error');
					done();
				}
			);
		});
	});

	describe('merge', () => {
		it('should merge diff when values are correct', done => {
			account.merge(
				validAccount.address,
				{ multisignatures: ['MS1'], delegates: ['DLG1'] },
				(err, res) => {
					expect(err).to.not.exist;
					expect(res.delegates).to.deep.equal(['DLG1']);
					expect(res.multisignatures).to.deep.equal(['MS1']);
					done();
				}
			);
		});

		describe('verify public key', () => {
			it('should throw error if parameter is not a string', () => {
				expect(() => {
					account.merge(validAccount.address, { publicKey: 1 });
				}).to.throw('Invalid public key, must be a string');
			});

			it('should throw error if parameter is of invalid length', () => {
				expect(() => {
					account.merge(validAccount.address, { publicKey: '231312312321' });
				}).to.throw('Invalid public key, must be 64 characters long');
			});

			it('should throw error if parameter is not a hex string', () => {
				expect(() => {
					account.merge(validAccount.address, {
						publicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az',
					});
				}).to.throw('Invalid public key, must be a hex string');
			});
		});

		describe('check database constraints', () => {
			it('should throw error when address does not exist for u_delegates', done => {
				account.merge('1L', { u_delegates: [validAccount.publicKey] }, err => {
					expect(err).to.equal('Account#merge error');
					done();
				});
			});

			it('should throw error when address does not exist for delegates', done => {
				account.merge('1L', { delegates: [validAccount.publicKey] }, err => {
					expect(err).to.equal('Account#merge error');
					done();
				});
			});

			it('should throw error when address does not exist for u_multisignatures', done => {
				account.merge(
					'1L',
					{ u_multisignatures: [validAccount.publicKey] },
					err => {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});

			it('should throw error when address does not exist for multisignatures', done => {
				account.merge(
					'1L',
					{ multisignatures: [validAccount.publicKey] },
					err => {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});
		});

		it('should throw error when a numeric field receives non numeric value', done => {
			account.merge(validAccount.address, { balance: 'Not a Number' }, err => {
				expect(err).to.equal('Encountered insane number: Not a Number');
				done();
			});
		});
	});

	describe('remove', () => {
		it('should remove an account', done => {
			account.remove('123L', (err, res) => {
				expect(err).to.not.exist;
				expect(res).to.equal('123L');
				done();
			});
		});
	});
});
