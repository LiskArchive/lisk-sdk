'use strict';

const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const accountsFixtures = require('../../../fixtures').accounts;
const votesSQL = require('../../../../db/sql').votes;
const seeder = require('../../../common/db_seed');

const rowCount = 5;
let db;
let dbSandbox;
let params;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_votes');

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

	describe('VotesRepository', () => {
		it('should initialize db.votes repo', () => {
			return expect(db.votes).to.be.not.null;
		});

		describe('constructor()', () => {
			it('should assign parameters and data members properly', () => {
				expect(db.votes.db).to.eql(db);
				expect(db.votes.pgp).to.eql(db.$config.pgp);
				expect(db.votes.sortFields).to.be.an('array');
				return expect(db.votes.sortFields).to.eql([
					'username',
					'address',
					'publicKey',
				]);
			});
		});

		describe('list', () => {
			it('should use the correct SQL with correct parameters', function*() {
				params = {
					address: '123L',
					limit: 10,
					offset: 0,
				};
				sinonSandbox.spy(db, 'query');
				yield db.votes.list(params);

				expect(db.query.firstCall.args[0]).to.eql(votesSQL.getVotes);
				return expect(db.query.firstCall.args[1]).to.eql(params);
			});

			it('should be rejected with error if "address" is not provided', () => {
				return expect(
					db.votes.list({
						// address: '123L',
						limit: 10,
						offset: 0,
					})
				).to.be.rejectedWith("Property 'address' doesn't exist");
			});

			it('should be rejected with error if "limit" is not provided', () => {
				return expect(
					db.votes.list({
						address: '123L',
						// limit: 10,
						offset: 0,
					})
				).to.be.rejectedWith("Property 'limit' doesn't exist");
			});

			it('should be rejected with error if "offset" is not provided', () => {
				return expect(
					db.votes.list({
						address: '123L',
						limit: 10,
						// offset: 0
					})
				).to.be.rejectedWith("Property 'offset' doesn't exist");
			});

			it('should paginate the result properly', function*() {
				const account = accountsFixtures.Account();
				yield db.accounts.insert(account);
				const votes = [];

				for (let i = 0; i < rowCount; i++) {
					const vote = accountsFixtures.Dependent({
						accountId: account.address,
					});
					yield db.query(
						db.$config.pgp.helpers.insert(vote, null, 'mem_accounts2delegates')
					);
					votes.push(vote);
				}

				const firstResult = yield db.votes.list({
					address: account.address,
					limit: 2,
					offset: 0,
				});

				const secondResult = yield db.votes.list({
					address: account.address,
					limit: 2,
					offset: 1,
				});

				return expect(firstResult[1]).to.eql(secondResult[0]);
			});

			it('should return the all vote objects for a specific address', function*() {
				const account = accountsFixtures.Account();
				yield db.accounts.insert(account);
				const votes = [];

				for (let i = 0; i < rowCount; i++) {
					const vote = accountsFixtures.Dependent({
						accountId: account.address,
					});
					yield db.query(
						db.$config.pgp.helpers.insert(vote, null, 'mem_accounts2delegates')
					);
					votes.push(vote);
				}

				const result = yield db.votes.list({
					address: account.address,
					limit: 10,
					offset: 0,
				});

				// Check there are some votes to test
				expect(result).to.have.lengthOf(rowCount);
				return expect(result.map(r => r.dependentId)).to.eql(
					votes.map(v => v.dependentId)
				);
			});
		});

		describe('count()', () => {
			it('should return an error if it is called without address', () => {
				return expect(db.votes.count()).to.be.rejectedWith(
					'there is no parameter $1'
				);
			});

			it('should use the correct SQL with correct parameters', function*() {
				params = '123L';
				sinonSandbox.spy(db, 'one');
				yield db.votes.count(params);

				expect(db.one.firstCall.args[0]).to.eql(votesSQL.getVotesCount);
				expect(db.one.firstCall.args[1]).to.eql(params);
				return expect(db.one.firstCall.args[2]).to.be.a('function');
			});

			it('should return integer type count of total votes of a specific lisk id', function*() {
				const account = accountsFixtures.Account();
				yield db.accounts.insert(account);
				const votes = [];

				for (let i = 0; i < rowCount; i++) {
					const vote = accountsFixtures.Dependent({
						accountId: account.address,
					});
					yield db.query(
						db.$config.pgp.helpers.insert(vote, null, 'mem_accounts2delegates')
					);
					votes.push(vote);
				}

				const result = yield db.votes.count(account.address);

				return expect(result).to.eql(rowCount);
			});
		});
	});
});
