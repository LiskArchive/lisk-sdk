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

var randomstring = require('randomstring');

var sql = require('../common/sql/mem_accounts.js');
var modulesLoader = require('../../common/modules_loader');
var db;

before(function(done) {
	modulesLoader.getDbConnection(function(err, __db) {
		if (err) {
			return done(err);
		}
		db = __db;
		done();
	});
});

var validUsername = randomstring.generate(10).toLowerCase();

var validAccount = {
	username: validUsername,
	isDelegate: 1,
	u_isDelegate: 0,
	secondSignature: 0,
	u_secondSignature: 0,
	u_username: validUsername,
	address: randomstring.generate({ charset: 'numeric', length: 20 }) + 'L',
	publicKey: randomstring.generate({ charset: '0123456789ABCDE', length: 32 }),
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
	producedblocks: 9,
	missedblocks: 0,
	fees: '0',
	rewards: '0',
	virgin: 1,
};

var queries = {
	getAccountByAddress: function(address, cb) {
		db
			.query(sql.getAccountByAddress, { address: address })
			.then(function(accountRows) {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	updateUsername: function(account, newUsername, cb) {
		db
			.query(sql.updateUsername, {
				address: account.address,
				newUsername: newUsername,
			})
			.then(function(accountRows) {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	updateU_username: function(account, newUsername, cb) {
		db
			.query(sql.updateU_username, {
				address: account.address,
				newUsername: newUsername,
			})
			.then(function(accountRows) {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	insertAccount: function(account, cb) {
		db
			.query(sql.insert, account)
			.then(function(accountRows) {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	deleteAccount: function(account, cb) {
		db
			.query(sql.delete, account)
			.then(function(accountRows) {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
};

before(function(done) {
	queries.insertAccount(validAccount, done);
});

after(function(done) {
	queries.deleteAccount(validAccount, done);
});

describe('mem_accounts protection', function() {
	describe('username update', function() {
		describe('when account with username exists', function() {
			before(function(done) {
				queries.getAccountByAddress(validAccount.address, function(
					err,
					account
				) {
					expect(account).to.be.an('object').and.to.be.not.empty;
					validAccount = account;
					done(err);
				});
			});

			describe('for value != null', function() {
				var nonNullValidUsername =
					validAccount.username + randomstring.generate(1).toLowerCase();

				before(function(done) {
					queries.updateUsername(validAccount, nonNullValidUsername, done);
				});

				it('should leave the old username', function(done) {
					queries.getAccountByAddress(validAccount.address, function(
						err,
						updatedAccount
					) {
						expect(updatedAccount)
							.to.have.property('username')
							.equal(validAccount.username);
						return done(err);
					});
				});
			});

			describe('for value = null', function() {
				before(function(done) {
					queries.updateUsername(validAccount, null, done);
				});

				it('should set username = null', function(done) {
					queries.getAccountByAddress(validAccount.address, function(
						err,
						updatedAccount
					) {
						expect(err).to.be.null;
						expect(updatedAccount).to.have.property('username').to.be.null;
						done();
					});
				});
			});
		});

		describe('when account with username = null exists', function() {
			var noUsernameAccount;

			before(function(done) {
				noUsernameAccount = _.clone(validAccount);
				noUsernameAccount.address =
					randomstring.generate({ charset: 'numeric', length: 20 }) + 'L';
				noUsernameAccount.publicKey = randomstring.generate({
					charset: '0123456789ABCDE',
					length: 32,
				});
				noUsernameAccount.username = null;
				queries.insertAccount(noUsernameAccount, done);
			});

			after(function(done) {
				queries.deleteAccount(noUsernameAccount, done);
			});

			describe('for valid username', function() {
				var validUsername = randomstring.generate(10).toLowerCase();

				before(function(done) {
					queries.updateUsername(noUsernameAccount, validUsername, done);
				});

				it('should set the new value', function(done) {
					queries.getAccountByAddress(noUsernameAccount.address, function(
						err,
						updatedAccount
					) {
						expect(err).to.be.null;
						expect(updatedAccount)
							.to.have.property('username')
							.equal(validUsername);
						done();
					});
				});
			});
		});
	});

	describe('u_username update', function() {
		describe('when account with u_username exists', function() {
			before(function(done) {
				queries.getAccountByAddress(validAccount.address, function(
					err,
					account
				) {
					expect(account).to.be.an('object').and.to.be.not.empty;
					validAccount = account;
					done(err);
				});
			});

			describe('for value != null', function() {
				var nonNullValidUsername =
					validAccount.username + randomstring.generate(1).toLowerCase();

				before(function(done) {
					queries.updateU_username(validAccount, nonNullValidUsername, done);
				});

				it('should leave the old username', function(done) {
					queries.getAccountByAddress(validAccount.address, function(
						err,
						updatedAccount
					) {
						expect(err).to.be.null;
						expect(updatedAccount)
							.to.have.property('u_username')
							.equal(validAccount.u_username);
						done();
					});
				});
			});

			describe('for value = null', function() {
				before(function(done) {
					queries.updateU_username(validAccount, null, done);
				});

				it('should set u_username = null', function(done) {
					queries.getAccountByAddress(validAccount.address, function(
						err,
						updatedAccount
					) {
						expect(err).to.be.null;
						expect(updatedAccount).to.have.property('u_username').to.be.null;
						done();
					});
				});
			});
		});

		describe('when account with u_username = null exists', function() {
			var noU_usernameAccount;

			before(function(done) {
				noU_usernameAccount = _.clone(validAccount);
				noU_usernameAccount.address =
					randomstring.generate({ charset: 'numeric', length: 20 }) + 'L';
				noU_usernameAccount.publicKey = randomstring.generate({
					charset: '0123456789ABCDE',
					length: 32,
				});
				noU_usernameAccount.u_username = null;
				queries.insertAccount(noU_usernameAccount, done);
			});

			after(function(done) {
				queries.deleteAccount(noU_usernameAccount, done);
			});

			describe('for valid u_username', function() {
				var validU_username = randomstring.generate(10).toLowerCase();

				before(function(done) {
					queries.updateU_username(noU_usernameAccount, validU_username, done);
				});

				it('should set the new value', function(done) {
					queries.getAccountByAddress(noU_usernameAccount.address, function(
						err,
						updatedAccount
					) {
						expect(err).to.be.null;
						expect(updatedAccount)
							.to.have.property('u_username')
							.equal(validU_username);
						done();
					});
				});
			});
		});
	});
});
