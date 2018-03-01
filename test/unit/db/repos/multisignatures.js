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

const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const accountFixtures = require('../../../fixtures').accounts;
const multisignaturesSQL = require('../../../../db/sql').multisignatures;
const seeder = require('../../../common/db_seed');

const numSeedRecords = 5;

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(
			__testContext.config.db,
			'lisk_test_db_multisignatures'
		);

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
		return expect(db.multisignatures).to.be.not.null;
	});

	describe('MultisignaturesRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.multisignatures.db).to.be.eql(db);
				return expect(db.multisignatures.pgp).to.be.eql(db.$config.pgp);
			});
		});

		describe('getMemberPublicKeys()', () => {
			it('should use the correct SQL with given params', function*() {
				sinonSandbox.spy(db, 'one');
				const address = 'ABCDE';
				yield db.multisignatures.getMemberPublicKeys(address);

				expect(db.one.firstCall.args[0]).to.eql(
					multisignaturesSQL.getMemberPublicKeys
				);
				expect(db.one.firstCall.args[1]).to.eql({ address });
				return expect(db.one.firstCall.args[2]).to.be.a('function');
			});

			it('should return list of public keys of members for an existing address', function*() {
				const members = [];
				const account = accountFixtures.Account();
				yield db.accounts.insert(account);

				// Prepare some fixture data to seed the database
				for (let i = 0; i < numSeedRecords; i++) {
					const dependent = accountFixtures.Dependent({
						accountId: account.address,
					});
					members.push(dependent);
					yield db.accounts.insertDependencies(
						dependent.accountId,
						dependent.dependentId,
						'multisignatures'
					);
				}

				const result = yield db.multisignatures.getMemberPublicKeys(
					account.address
				);

				expect(result).to.be.not.empty;
				expect(result).to.be.an('array');
				expect(result).to.have.lengthOf(numSeedRecords);
				return expect(result).to.be.eql(members.map(m => m.dependentId));
			});

			it('should resolve with null for a non-existing address', () => {
				return expect(
					db.multisignatures.getMemberPublicKeys('1234L')
				).to.be.eventually.eql(null);
			});
		});

		describe('getGroupIds()', () => {
			it('should use the correct SQL with given params', function*() {
				sinonSandbox.spy(db, 'one');
				const publicKey = '111111111111111';
				yield db.multisignatures.getGroupIds(publicKey);

				expect(db.one.firstCall.args[0]).to.eql(multisignaturesSQL.getGroupIds);
				expect(db.one.firstCall.args[1]).to.eql({ publicKey });
				return expect(db.one.firstCall.args[2]).to.be.a('function');
			});

			it('should return list of addresses for groups/accounts for which a public key is member', function*() {
				const groups = [];
				const account = accountFixtures.Account();
				yield db.accounts.insert(account);

				// Prepare some fixture data to seed the database
				for (let i = 0; i < numSeedRecords; i++) {
					const groupAccount = accountFixtures.Account();
					yield db.accounts.insert(groupAccount);
					yield db.accounts.insertDependencies(
						groupAccount.address,
						account.publicKey,
						'multisignatures'
					);
					groups.push(groupAccount);
				}

				const result = yield db.multisignatures.getGroupIds(account.publicKey);

				expect(result).to.be.not.empty;
				expect(result).to.be.an('array');
				expect(result).to.have.lengthOf(numSeedRecords);
				return expect(result).to.be.eql(groups.map(g => g.address));
			});

			it('should resolve with null for a non-existing public key', () => {
				return expect(
					db.multisignatures.getGroupIds('111111111')
				).to.be.eventually.eql(null);
			});
		});
	});
});
