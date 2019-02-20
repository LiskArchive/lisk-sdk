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

const randomstring = require('randomstring');
const sql = require('../common/sql/mem_accounts.js');
const storageSandbox = require('../../../../../common/storage_sandbox');

let storage;

const validUsername = randomstring.generate(10).toLowerCase();

let validAccount = {
	username: validUsername,
	isDelegate: 1,
	secondSignature: 0,
	address: `${randomstring.generate({ charset: 'numeric', length: 20 })}L`,
	publicKey: randomstring.generate({ charset: '0123456789ABCDE', length: 32 }),
	secondPublicKey: null,
	balance: '0',
	vote: '10000000000000000',
	rank: '1',
	delegates: null,
	multisignatures: null,
	multimin: 0,
	multilifetime: 0,
	blockId: randomstring.generate({ charset: 'numeric', length: 20 }),
	nameexist: 0,
	producedBlocks: 9,
	missedBlocks: 0,
	fees: '0',
	rewards: '0',
};

const queries = {
	getAccountByAddress(address, cb) {
		storage.adapter.db
			.query(sql.getAccountByAddress, { address })
			.then(accountRows => cb(null, accountRows[0]))
			.catch(cb);
	},
	updateUsername(account, newUsername, cb) {
		storage.adapter.db
			.query(sql.updateUsername, {
				address: account.address,
				newUsername,
			})
			.then(accountRows => cb(null, accountRows[0]))
			.catch(cb);
	},
	insertAccount(account, cb) {
		storage.adapter.db
			.query(sql.insert, account)
			.then(accountRows => cb(null, accountRows[0]))
			.catch(cb);
	},
	deleteAccount(account, cb) {
		storage.adapter.db
			.query(sql.delete, account)
			.then(accountRows => cb(null, accountRows[0]))
			.catch(cb);
	},
};

describe('mem_accounts protection', async () => {
	before(done => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'mem_accounts_protection_test'
		);

		storage
			.bootstrap()
			.then(() => {
				queries.insertAccount(validAccount, done);
			})
			.catch(done);
	});

	after(done => {
		queries.deleteAccount(validAccount, done);
	});

	describe('username update', async () => {
		describe('when account with username exists', async () => {
			before(done => {
				queries.getAccountByAddress(validAccount.address, (err, account) => {
					expect(account).to.be.an('object').and.to.be.not.empty;
					validAccount = account;
					done(err);
				});
			});

			describe('for value != null', async () => {
				const nonNullValidUsername =
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

			describe('for value = null', async () => {
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

		describe('when account with username = null exists', async () => {
			let noUsernameAccount;

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

			describe('for valid username', async () => {
				const auxValidUsername = randomstring.generate(10).toLowerCase();

				before(done => {
					queries.updateUsername(noUsernameAccount, auxValidUsername, done);
				});

				it('should set the new value', done => {
					queries.getAccountByAddress(
						noUsernameAccount.address,
						(err, updatedAccount) => {
							expect(err).to.be.null;
							expect(updatedAccount)
								.to.have.property('username')
								.equal(auxValidUsername);
							done();
						}
					);
				});
			});
		});
	});

	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('[UNCONFIRMED_STATE_REMOVAL] u_username update', async () => {
		describe('when account with u_username exists', async () => {
			before(done => {
				queries.getAccountByAddress(validAccount.address, (err, account) => {
					expect(account).to.be.an('object').and.to.be.not.empty;
					validAccount = account;
					done(err);
				});
			});

			describe('for value != null', async () => {
				const nonNullValidUsername =
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

			describe('for value = null', async () => {
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

		describe('when account with u_username = null exists', async () => {
			let noU_usernameAccount;

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

			describe('for valid u_username', async () => {
				const validU_username = randomstring.generate(10).toLowerCase();

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
