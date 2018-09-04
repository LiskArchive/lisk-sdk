'use strict';

const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const accountsFixtures = require('../../../fixtures').accounts;
const votersSQL = require('../../../../db/sql').voters;
const seeder = require('../../../common/db_seed');

let db;
let dbSandbox;
let params;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_voters');

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

	describe('VotersRepository', () => {
		it('should initialize db.voters repo', () => {
			return expect(db.voters).to.be.not.null;
		});

		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.votes.db).to.be.eql(db);
				expect(db.votes.pgp).to.be.eql(db.$config.pgp);
				expect(db.votes.sortFields).to.an('array');
				return expect(db.votes.sortFields).to.be.eql([
					'username',
					'address',
					'publicKey',
				]);
			});
		});

		describe('list', () => {
			it('should use the correct SQL with correct parameters', function*() {
				params = {
					publicKey: '123',
					limit: 10,
					offset: 0,
					sortField: 'publicKey',
					sortMethod: 'ASC',
				};
				sinonSandbox.spy(db, 'query');
				yield db.voters.list(params);

				expect(db.query.firstCall.args[0]).to.eql(votersSQL.getVoters);
				return expect(db.query.firstCall.args[1]).to.eql(params);
			});

			it('should be rejected with error if "publicKey" is not provided', () => {
				return expect(
					db.voters.list({
						// publicKey: '123L',
						limit: 10,
						offset: 0,
						sortField: 'publicKey',
						sortMethod: 'ASC',
					})
				).to.be.rejectedWith("Property 'publicKey' doesn't exist");
			});

			it('should be rejected with error if "limit" is not provided', () => {
				return expect(
					db.voters.list({
						publicKey: '123',
						// limit: 10,
						offset: 0,
						sortField: 'publicKey',
						sortMethod: 'ASC',
					})
				).to.be.rejectedWith("Property 'limit' doesn't exist");
			});

			it('should be rejected with error if "offset" is not provided', () => {
				return expect(
					db.voters.list({
						publicKey: '123',
						limit: 10,
						// offset: 0,
						sortField: 'publicKey',
						sortMethod: 'ASC',
					})
				).to.be.rejectedWith("Property 'offset' doesn't exist");
			});

			it('should be rejected with error if "sortField" is not provided', () => {
				return expect(
					db.voters.list({
						publicKey: '123',
						limit: 10,
						offset: 0,
						// sortField: 'publicKey',
						sortMethod: 'ASC',
					})
				).to.be.rejectedWith("Property 'sortField' doesn't exist");
			});

			it('should be rejected with error if "sortMethod" is not provided', () => {
				return expect(
					db.voters.list({
						publicKey: '123',
						limit: 10,
						offset: 0,
						sortField: 'publicKey',
						// sortMethod: 'ASC',
					})
				).to.be.rejectedWith("Property 'sortMethod' doesn't exist");
			});

			it('should paginate the result properly', function*() {
				const delegate = accountsFixtures.Delegate();
				const account1 = accountsFixtures.Account();
				const account2 = accountsFixtures.Account();
				yield db.accounts.insert(delegate);
				yield db.accounts.insert(account1);
				yield db.accounts.insert(account2);

				const vote1 = accountsFixtures.Dependent({
					accountId: account1.address,
					dependentId: delegate.publicKey,
				});
				const vote2 = accountsFixtures.Dependent({
					accountId: account2.address,
					dependentId: delegate.publicKey,
				});
				yield db.query(
					db.$config.pgp.helpers.insert(vote1, null, {
						table: 'mem_accounts2delegates',
					})
				);
				yield db.query(
					db.$config.pgp.helpers.insert(vote2, null, {
						table: 'mem_accounts2delegates',
					})
				);

				const firstResult = yield db.voters.list({
					publicKey: delegate.publicKey,
					limit: 10,
					offset: 0,
					sortField: 'publicKey',
					sortMethod: 'ASC',
				});

				const secondResult = yield db.voters.list({
					publicKey: delegate.publicKey,
					limit: 10,
					offset: 1,
					sortField: 'publicKey',
					sortMethod: 'ASC',
				});

				return expect(firstResult[1]).to.be.eql(secondResult[0]);
			});

			it('should return the all vote objects for a specific address', function*() {
				const delegate = accountsFixtures.Delegate();
				const account1 = accountsFixtures.Account();
				const account2 = accountsFixtures.Account();
				yield db.accounts.insert(delegate);
				yield db.accounts.insert(account1);
				yield db.accounts.insert(account2);
				const voters = [account1, account2].sort((a, b) => {
					if (a.publicKey > b.publicKey) {
						return 1;
					}
					if (a.publicKey < b.publicKey) {
						return -1;
					}
					return 0;
				});

				const vote1 = accountsFixtures.Dependent({
					accountId: account1.address,
					dependentId: delegate.publicKey,
				});
				const vote2 = accountsFixtures.Dependent({
					accountId: account2.address,
					dependentId: delegate.publicKey,
				});
				yield db.query(
					db.$config.pgp.helpers.insert(vote1, null, 'mem_accounts2delegates')
				);
				yield db.query(
					db.$config.pgp.helpers.insert(vote2, null, 'mem_accounts2delegates')
				);

				const result = yield db.voters.list({
					publicKey: delegate.publicKey,
					limit: 10,
					offset: 0,
					sortField: 'publicKey',
					sortMethod: 'ASC',
				});

				expect(result).to.be.an('array');
				return expect(result.map(r => r.address)).to.be.eql(
					voters.map(v => v.address)
				);
			});
		});

		describe('count()', () => {
			it('should return an error if it is called without address', () => {
				return expect(db.voters.count()).to.be.rejectedWith(
					'there is no parameter $1'
				);
			});

			it('should use the correct SQL with correct parameters', function*() {
				params = '123';
				sinonSandbox.spy(db, 'one');
				yield db.voters.count(params);

				expect(db.one.firstCall.args[0]).to.eql(votersSQL.getVotersCount);
				expect(db.one.firstCall.args[1]).to.eql(params);
				return expect(db.one.firstCall.args[2]).to.be.a('function');
			});

			it('should return integer type count of total votes of a specific lisk id', function*() {
				const delegate = accountsFixtures.Delegate();
				const account1 = accountsFixtures.Account();
				const account2 = accountsFixtures.Account();
				yield db.accounts.insert(delegate);
				yield db.accounts.insert(account1);
				yield db.accounts.insert(account2);

				const vote1 = accountsFixtures.Dependent({
					accountId: account1.address,
					dependentId: delegate.publicKey,
				});
				const vote2 = accountsFixtures.Dependent({
					accountId: account2.address,
					dependentId: delegate.publicKey,
				});
				yield db.query(
					db.$config.pgp.helpers.insert(vote1, null, 'mem_accounts2delegates')
				);
				yield db.query(
					db.$config.pgp.helpers.insert(vote2, null, 'mem_accounts2delegates')
				);

				const result = yield db.voters.count(delegate.publicKey);

				return expect(result).to.be.eql(2);
			});
		});
	});
});
