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

var validUsername = randomstring.generate(10).toLowerCase();

var validAccount = {
	username: validUsername,
	isDelegate: 1,
	u_isDelegate: 0,
	secondSignature: 0,
	u_secondSignature: 0,
	u_username: validUsername,
	address: `${randomstring.generate({ charset: 'numeric', length: 20 })}L`,
	publicKey: randomstring.generate({ charset: '0123456789ABCDE', length: 32 }),
	secondPublicKey: null,
	balance: '0',
	u_balance: '0',
	vote: '10000000000000000',
	rank: '1',
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
	producedBlocks: 9,
	missedBlocks: 0,
	fees: '0',
	rewards: '0',
};

var queries = {
	getAccountByAddress(address, cb) {
		db
			.query(sql.getAccountByAddress, { address })
			.then(accountRows => {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	updateUsername(account, newUsername, cb) {
		db
			.query(sql.updateUsername, {
				address: account.address,
				newUsername,
			})
			.then(accountRows => {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	updateU_username(account, newUsername, cb) {
		db
			.query(sql.updateU_username, {
				address: account.address,
				newUsername,
			})
			.then(accountRows => {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	insertAccount(account, cb) {
		db
			.query(sql.insert, account)
			.then(accountRows => {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
	deleteAccount(account, cb) {
		db
			.query(sql.delete, account)
			.then(accountRows => {
				return cb(null, accountRows[0]);
			})
			.catch(cb);
	},
};

describe('mem_accounts protection', () => {
	before(done => {
		modulesLoader.getDbConnection((err, __db) => {
			if (err) {
				return done(err);
			}
			db = __db;
			queries.insertAccount(validAccount, done);
		});
	});

	after(done => {
		queries.deleteAccount(validAccount, done);
	});

	describe('username update', () => {
		describe('when account with username exists', () => {
			before(done => {
				queries.getAccountByAddress(validAccount.address, (err, account) => {
					expect(account).to.be.an('object').and.to.be.not.empty;
					validAccount = account;
					done(err);
				});
			});

			describe('for value != null', () => {
				var nonNullValidUsername =
					validAccount.username + randomstring.generate(1).toLowerCase();

				before(done => {
					queries.updateUsername(validAccount, nonNullValidUsername, done);
				});

				it('should leave the old username', done => {
					queries.getAccountByAddress(
						validAccount.address,
						(err, updatedAccount) => {
							expect(updatedAccount)
								.to.have.property('username')
								.equal(validAccount.username);
							return done(err);
						}
					);
				});
			});

			describe('for value = null', () => {
				before(done => {
					queries.updateUsername(validAccount, null, done);
				});

				it('should set username = null', done => {
					queries.getAccountByAddress(
						validAccount.address,
						(err, updatedAccount) => {
							expect(err).to.be.null;
							expect(updatedAccount).to.have.property('username').to.be.null;
							done();
						}
					);
				});
			});
		});

		describe('when account with username = null exists', () => {
			var noUsernameAccount;

			before(done => {
				noUsernameAccount = _.clone(validAccount);
				noUsernameAccount.address = `${randomstring.generate({
					charset: 'numeric',
					length: 20,
				})}L`;
				noUsernameAccount.publicKey = randomstring.generate({
					charset: '0123456789ABCDE',
					length: 32,
				});
				noUsernameAccount.username = null;
				queries.insertAccount(noUsernameAccount, done);
			});

			after(done => {
				queries.deleteAccount(noUsernameAccount, done);
			});

			describe('for valid username', () => {
				var validUsername = randomstring.generate(10).toLowerCase();

				before(done => {
					queries.updateUsername(noUsernameAccount, validUsername, done);
				});

				it('should set the new value', done => {
					queries.getAccountByAddress(
						noUsernameAccount.address,
						(err, updatedAccount) => {
							expect(err).to.be.null;
							expect(updatedAccount)
								.to.have.property('username')
								.equal(validUsername);
							done();
						}
					);
				});
			});
		});
	});

	describe('u_username update', () => {
		describe('when account with u_username exists', () => {
			before(done => {
				queries.getAccountByAddress(validAccount.address, (err, account) => {
					expect(account).to.be.an('object').and.to.be.not.empty;
					validAccount = account;
					done(err);
				});
			});

			describe('for value != null', () => {
				var nonNullValidUsername =
					validAccount.username + randomstring.generate(1).toLowerCase();

				before(done => {
					queries.updateU_username(validAccount, nonNullValidUsername, done);
				});

				it('should leave the old username', done => {
					queries.getAccountByAddress(
						validAccount.address,
						(err, updatedAccount) => {
							expect(err).to.be.null;
							expect(updatedAccount)
								.to.have.property('u_username')
								.equal(validAccount.u_username);
							done();
						}
					);
				});
			});

			describe('for value = null', () => {
				before(done => {
					queries.updateU_username(validAccount, null, done);
				});

				it('should set u_username = null', done => {
					queries.getAccountByAddress(
						validAccount.address,
						(err, updatedAccount) => {
							expect(err).to.be.null;
							expect(updatedAccount).to.have.property('u_username').to.be.null;
							done();
						}
					);
				});
			});
		});

		describe('when account with u_username = null exists', () => {
			var noU_usernameAccount;

			before(done => {
				noU_usernameAccount = _.clone(validAccount);
				noU_usernameAccount.address = `${randomstring.generate({
					charset: 'numeric',
					length: 20,
				})}L`;
				noU_usernameAccount.publicKey = randomstring.generate({
					charset: '0123456789ABCDE',
					length: 32,
				});
				noU_usernameAccount.u_username = null;
				queries.insertAccount(noU_usernameAccount, done);
			});

			after(done => {
				queries.deleteAccount(noU_usernameAccount, done);
			});

			describe('for valid u_username', () => {
				var validU_username = randomstring.generate(10).toLowerCase();

				before(done => {
					queries.updateU_username(noU_usernameAccount, validU_username, done);
				});

				it('should set the new value', done => {
					queries.getAccountByAddress(
						noU_usernameAccount.address,
						(err, updatedAccount) => {
							expect(err).to.be.null;
							expect(updatedAccount)
								.to.have.property('u_username')
								.equal(validU_username);
							done();
						}
					);
				});
			});
		});
	});
});
