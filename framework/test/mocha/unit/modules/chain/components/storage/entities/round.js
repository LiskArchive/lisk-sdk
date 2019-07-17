/* eslint-disable mocha/no-pending-tests */
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

const BigNumber = require('bignumber.js');
const {
	entities: { BaseEntity },
	errors: { NonSupportedFilterTypeError, NonSupportedOptionError },
} = require('../../../../../../../../src/components/storage');
const {
	Round,
} = require('../../../../../../../../src/modules/chain/components/storage/entities');
const { StorageSandbox } = require('../../../../../../common/storage_sandbox');
const seeder = require('../../../../../../common/storage_seed');
const accountsFixtures = require('../../../../../../fixtures').accounts;
const roundsFixtures = require('../../../../../../fixtures').rounds;

const checkTableExists = (adapter, tableName) =>
	adapter
		.execute(
			`SELECT EXISTS
					(
						SELECT 1
						FROM pg_tables
						WHERE schemaname = 'public'
						AND tablename = '${tableName}'
					);`
		)
		.then(result => result[0].exists);

describe('Round', () => {
	let adapter;
	let storage;
	let RoundEntity;
	let AccountEntity;
	let SQLs;

	const invalidFilter = {
		foo: 'bar',
	};

	const invalidOptions = {
		foo: true,
		bar: true,
	};

	const validFilters = [
		'address',
		'address_eql',
		'address_ne',
		'address_in',
		'address_like',
		'amount',
		'amount_eql',
		'amount_ne',
		'amount_gt',
		'amount_gte',
		'amount_lt',
		'amount_lte',
		'amount_in',
		'delegatePublicKey',
		'delegatePublicKey_eql',
		'delegatePublicKey_ne',
		'delegatePublicKey_in',
		'delegatePublicKey_like',
		'round',
		'round_eql',
		'round_ne',
		'round_gt',
		'round_gte',
		'round_lt',
		'round_lte',
		'round_in',
	];

	const validRoundSQLs = [
		'select',
		'create',
		'isPersisted',
		'update',
		'updateOne',
	];

	const validRoundFields = ['address', 'amount', 'delegatePublicKey', 'round'];

	const validOptions = {
		sort: 'round:asc',
	};

	const validRound = new roundsFixtures.Round();
	const validFilter = { round: validRound.round };

	before(async () => {
		storage = new StorageSandbox(
			__testContext.config.components.storage,
			'lisk_test_storage_custom_round_chain_module'
		);
		await storage.bootstrap();

		adapter = storage.adapter;
		RoundEntity = storage.entities.Round;
		AccountEntity = storage.entities.Account;
		SQLs = RoundEntity.SQLs;
	});

	beforeEach(() => seeder.seed(storage));

	afterEach(() => {
		sinonSandbox.restore();
		return seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(Round.prototype.constructor).not.to.be.null;
		expect(Round.prototype.constructor.name).to.be.eql('Round');
	});

	it('should extend BaseEntity', async () => {
		expect(Round.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Round.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			expect(typeof RoundEntity.parseFilters).to.be.eql('function');
			expect(typeof RoundEntity.addFilter).to.be.eql('function');
			expect(typeof RoundEntity.addField).to.be.eql('function');
			expect(typeof RoundEntity.getFilters).to.be.eql('function');
			expect(typeof RoundEntity.getUpdateSet).to.be.eql('function');
			expect(typeof RoundEntity.getValuesSet).to.be.eql('function');
			expect(typeof RoundEntity.begin).to.be.eql('function');
			expect(typeof RoundEntity.validateFilters).to.be.eql('function');
			expect(typeof RoundEntity.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			expect(RoundEntity.SQLs).to.include.all.keys(validRoundSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const addFieldSpy = sinonSandbox.spy(Round.prototype, 'addField');
			new Round(adapter);

			expect(addFieldSpy.callCount).to.eql(
				Object.keys(RoundEntity.fields).length
			);
		});

		it('should setup correct fields', async () => {
			expect(RoundEntity.fields).to.include.all.keys(validRoundFields);
		});

		it('should setup specific filters');
	});

	describe('getOne()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const round = new Round(adapter);
			const _getResultsStub = sinonSandbox
				.stub(round, '_getResults')
				.returns(validRound);
			round.getOne(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null, 1]);
		});

		it('should fetch a record from the database', async () => {
			const randRound = new roundsFixtures.Round();
			await storage.entities.Round.create(randRound);
			expect(
				await storage.entities.Round.getOne(
					{ round: randRound.round },
					{ sort: 'round:desc' }
				)
			).to.be.eql(randRound);
		});
	});

	describe('get()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const round = new Round(adapter);
			const _getResultsStub = sinonSandbox
				.stub(round, '_getResults')
				.returns(validRound);
			round.get(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null]);
		});

		it('should fetch records from the database', async () => {
			const randRounds = [
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
			].sort((a, b) => a.round - b.round);
			const filters = randRounds.map(aRound => aRound.round);
			await storage.entities.Round.create(randRounds);
			expect(
				await storage.entities.Round.get(
					{ round_in: filters },
					{ sort: 'round:asc' }
				)
			).to.be.eql(randRounds);
		});
	});

	describe('_getResults()', () => {
		beforeEach(async () => {
			await storage.entities.Round.create(validRound);
		});

		afterEach(async () => {
			await storage.entities.Round.delete(validFilter);
		});

		it('should accept only valid filters', async () => {
			expect(() => {
				RoundEntity.getOne(validFilter, { sort: 'round:desc' });
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			expect(() => {
				RoundEntity.getOne(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			expect(() => {
				RoundEntity.getOne(validFilter, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			expect(() => {
				RoundEntity.getOne(validFilter, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile');

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				expect(RoundEntity.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('isPersisted()', () => {
		let localAdapter;
		const isPersistedSqlFile = 'isPersisted Sql File';
		beforeEach(async () => {
			await RoundEntity.create(validRound);
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					isPersisted: isPersistedSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves([validRound]),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

		afterEach(async () => {
			await RoundEntity.delete(validFilter);
		});

		it('should accept only valid filters', async () => {
			expect(() => {
				RoundEntity.isPersisted(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			expect(() => {
				RoundEntity.isPersisted(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub();
			round.parseFilters = sinonSandbox.stub();
			round.isPersisted(validFilter);
			expect(round.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub().returns(validFilter);
			round.parseFilters = sinonSandbox.stub();
			round.isPersisted(validFilter);
			expect(round.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub().returns(validFilter);
			round.parseFilters = sinonSandbox.stub();
			round.getUpdateSet = sinonSandbox.stub();
			round.isPersisted(validFilter);
			expect(
				localAdapter.executeFile.calledWith(
					isPersistedSqlFile,
					{
						parsedFilters: undefined,
					},
					{ expectedResultCount: 1 },
					null
				)
			).to.be.true;
		});

		it('should resolve with true if matching record found', async () => {
			const randRound = { ...validRound };
			randRound.round = '1001';
			await RoundEntity.create(randRound);
			const res = await RoundEntity.isPersisted({
				round: randRound.round,
			});
			expect(res).to.be.true;
		});

		it('should resolve with false if matching record not found', async () => {
			const randRound = new roundsFixtures.Round();
			await RoundEntity.create(randRound);
			const res = await RoundEntity.isPersisted({ round: '20000' });
			expect(res).to.be.false;
		});
	});

	describe('create()', () => {
		it('should save single round', async () => {
			const randRound = new roundsFixtures.Round();
			await RoundEntity.create(randRound);
			expect(
				await storage.entities.Round.getOne({ round: randRound.round })
			).to.be.eql(randRound);
		});

		it('should save multiple rounds', async () => {
			const randRounds = [
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
			].sort((a, b) => a.round - b.round);
			const filters = randRounds.map(aRound => aRound.round);
			await RoundEntity.create(randRounds);
			const result = await RoundEntity.get(
				{ round_in: filters },
				{ sort: 'round:asc' }
			);
			expect(result).to.be.eql(randRounds);
		});
	});

	describe('delete', () => {
		let localAdapter;
		const deleteSqlFile = 'deleteSqlFile Sql File';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					delete: deleteSqlFile,
				}),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});
		it('should accept only valid filters', async () => {
			const randRound = new roundsFixtures.Round();
			expect(() => {
				RoundEntity.delete(validFilter, randRound);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const randRound = new roundsFixtures.Round();
			expect(() => {
				RoundEntity.delete(invalidFilter, randRound);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			const randRound = new roundsFixtures.Round();
			localAdapter.executeFile = sinonSandbox.stub().resolves([randRound]);

			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub();
			round.parseFilters = sinonSandbox.stub();
			round.delete(validFilter);
			expect(round.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const randRound = new roundsFixtures.Round();
			localAdapter.executeFile = sinonSandbox.stub().resolves([randRound]);

			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub().returns(validFilter);
			round.parseFilters = sinonSandbox.stub();
			round.delete(validFilter);
			expect(round.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should only delete records specified by filter', async () => {
			const randRoundA = new roundsFixtures.Round();
			const randRoundB = new roundsFixtures.Round();
			await RoundEntity.create([randRoundA, randRoundB]);
			await RoundEntity.delete({ round: randRoundA.round });
			const resp = await RoundEntity.getOne(
				{ round: randRoundB.round },
				{ sort: 'round' }
			);
			expect(resp).to.eql(randRoundB);
		});

		it('should delete all records if no filter is specified', async () => {
			const randRoundA = new roundsFixtures.Round();
			const randRoundB = new roundsFixtures.Round();
			await RoundEntity.create([randRoundA, randRoundB]);
			await RoundEntity.delete();
			const found = await RoundEntity.get(
				{ round_in: [randRoundA.round, randRoundB.round] },
				{ sort: 'round' }
			);
			expect(found.length).to.eql(0);
		});
	});

	describe('getUniqueRounds()', () => {
		it('should return unique round numbers', async () => {
			const round1 = new roundsFixtures.Round({
				round: 1,
			});
			const round2 = new roundsFixtures.Round({
				round: 2,
			});
			const round3 = new roundsFixtures.Round({
				round: 1,
			});

			await RoundEntity.create([round1, round2, round3]);

			const result1 = await RoundEntity.get();
			const result2 = await RoundEntity.getUniqueRounds();

			// Actually there are three records but getMemRounds return unique round
			expect(result1).to.have.lengthOf(3);
			expect(result2).to.have.lengthOf(2);
			expect(result2[0]).to.have.all.keys('round');
			return expect(result2.map(r => r.round)).to.have.all.members([1, 2]);
		});
	});

	describe('getTotalVotedAmount', () => {
		it('should use the correct SQL file', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.getTotalVotedAmount({ round: 1 });

			expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.getTotalVotedAmount
			);
			return expect(adapter.executeFile).to.be.calledOnce;
		});

		it('should return votes for a round in correct format', async () => {
			const account = new accountsFixtures.Account();

			const round1 = new roundsFixtures.Round({
				round: 1,
				delegatePublicKey: account.publicKey,
			});
			const round2 = new roundsFixtures.Round({
				round: 1,
				delegatePublicKey: account.publicKey,
			});
			const round3 = new roundsFixtures.Round({
				round: 2,
			});
			await RoundEntity.create(round1);
			await RoundEntity.create(round2);
			await RoundEntity.create(round3);

			const allRecords = await adapter.execute('SELECT * FROM mem_round');
			const result = await RoundEntity.getTotalVotedAmount({ round: 1 });

			expect(allRecords).to.have.lengthOf(3);
			expect(result).to.be.not.empty;
			expect(result).to.have.lengthOf(1);
			expect(result[0]).to.be.have.all.keys('delegate', 'amount');
			return expect(result[0]).to.be.eql({
				delegate: account.publicKey,
				amount: new BigNumber(round1.amount).plus(round2.amount).toString(),
			});
		});

		it('should resolve without any error if no filter is provided', async () => {
			return expect(RoundEntity.getTotalVotedAmount({})).to.eventually.be
				.fulfilled;
		});

		it('should resolve without any error if unnown round number is provided', async () => {
			return expect(RoundEntity.getTotalVotedAmount({ round: 1234 })).to
				.eventually.be.fulfilled;
		});
	});

	describe('summedRound()', () => {
		it('should use the correct SQL file with one parameter', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.summedRound(1, 2);

			expect(adapter.executeFile.firstCall.args[0]).to.eql(SQLs.summedRound);
			expect(adapter.executeFile.firstCall.args[1]).to.eql({
				round: 1,
				activeDelegates: 2,
			});
			expect(adapter.executeFile).to.be.calledOnce;
		});

		it('should return the summed result in valid format', async () => {
			// Sum the round 1 with active delegates to 2
			const result = await RoundEntity.summedRound(1, 2);
			const blocks = seeder.getBlocks();

			// The blocks for round 1 would be with height 1 and 2
			// referred as index 0 and 1 in the array
			const computedBlocks = [blocks[0], blocks[1]];

			expect(result).to.be.not.empty;
			expect(result).to.have.lengthOf(1);
			expect(result[0]).to.have.all.keys('fees', 'rewards', 'delegates');
			expect(result[0].rewards).to.be.an('array');
			expect(result[0].delegates).to.be.an('array');
			expect(result[0].fees).to.be.eql(
				new BigNumber(computedBlocks[0].totalFee)
					.plus(computedBlocks[1].totalFee)
					.toString()
			);
			expect(result[0].rewards).to.be.eql(computedBlocks.map(b => b.reward));
			expect(result[0].delegates).to.be.eql(
				computedBlocks.map(b => b.generatorPublicKey)
			);
		});
	});

	describe('createRoundRewards()', () => {
		it('should use the correct SQL file with five parameters', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			const params = {
				timestamp: (+new Date() / 1000).toFixed(),
				fees: '123',
				reward: '123',
				round: 1,
				publicKey: '11111111',
			};
			await RoundEntity.createRoundRewards(params);

			expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.createRoundRewards
			);
			expect(adapter.executeFile.firstCall.args[1]).to.eql(params);
			expect(adapter.executeFile).to.be.calledOnce;
		});

		it('should insert one record to "round_rewards" table', async () => {
			const params = {
				timestamp: parseInt((+new Date() / 1000).toFixed()),
				fees: '123',
				reward: '123',
				round: 1,
				publicKey: '11111111',
			};
			await RoundEntity.createRoundRewards(params);

			const result = await adapter.execute('SELECT * FROM rounds_rewards');
			result[0].publicKey = Buffer.from(result[0].publicKey).toString('hex');

			expect(result).to.be.not.empty;
			expect(result).to.have.lengthOf(1);
			expect(result[0]).to.be.eql(params);
		});
	});

	describe('deleteRoundRewards()', () => {
		it('should use the correct SQL file with five parameters', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.deleteRoundRewards('1');

			expect(adapter.executeFile.firstCall.args[0]).to.eql(
				SQLs.deleteRoundRewards
			);
			expect(adapter.executeFile.firstCall.args[1]).to.eql({ round: '1' });
			expect(adapter.executeFile).to.be.calledOnce;
		});

		it('should delete all round rewards for a particular round', async () => {
			// Seed some round reward data
			await RoundEntity.createRoundRewards({
				timestamp: parseInt((+new Date() / 1000).toFixed()),
				fees: '123',
				reward: '123',
				round: 1, // Round 1
				publicKey: '11111111',
			});
			await RoundEntity.createRoundRewards({
				timestamp: parseInt((+new Date() / 1000).toFixed()),
				fees: '123',
				reward: '123',
				round: 1, // Round 1
				publicKey: '11111111',
			});
			await RoundEntity.createRoundRewards({
				timestamp: parseInt((+new Date() / 1000).toFixed()),
				fees: '123',
				reward: '123',
				round: 2, // Round 2
				publicKey: '11111111',
			});

			const before = await adapter.execute('SELECT * FROM rounds_rewards');
			await RoundEntity.deleteRoundRewards(1);
			const after = await adapter.execute('SELECT * FROM rounds_rewards');

			expect(before).to.have.lengthOf(3);
			expect(after).to.have.lengthOf(1);
			return expect(after[0].round).to.be.eql(2);
		});
	});

	describe('clearRoundSnapshot()', () => {
		it('should use the correct SQL file with no parameters', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.clearRoundSnapshot();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.clearRoundSnapshot,
				{},
				{ expectedResultCount: 0 },
				sinonSandbox.match.any
			);
		});

		it('should drop the round snapshot table if it exists', async () => {
			// Make sure the table exists
			await adapter.execute(
				'CREATE TABLE mem_round_snapshot AS TABLE mem_round'
			);

			// Check if table "mem_round_snapshot" exists
			const before = await checkTableExists(adapter, 'mem_round_snapshot');
			await RoundEntity.clearRoundSnapshot();

			// Check if table "mem_round_snapshot" exists
			const after = await checkTableExists(adapter, 'mem_round_snapshot');

			expect(before).to.be.true;
			expect(after).to.be.false;
		});
	});

	describe('performRoundSnapshot()', () => {
		beforeEach('performRoundSnapshot', () => RoundEntity.clearRoundSnapshot());

		it('should use the correct SQL file with no parameters', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.performRoundSnapshot();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.performRoundSnapshot,
				{},
				{ expectedResultCount: 0 },
				sinonSandbox.match.any
			);
		});

		it('should copy the "mem_round" table to snapshot table "mem_round_snapshot"', async () => {
			// Seed some data to mem_rounds
			const rounds = [
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
			];

			await RoundEntity.create(rounds);

			// Perform the snapshot
			await RoundEntity.performRoundSnapshot();

			// Load records from the snapshot table
			let result = await adapter.execute('SELECT * FROM mem_round_snapshot');
			result = result.map(res => {
				res.delegatePublicKey = res.delegate;
				delete res.delegate;
				return res;
			});

			expect(result).to.be.eql(rounds);
		});

		it('should be rejected with error if snapshot table already exists', async () => {
			await RoundEntity.performRoundSnapshot();

			return expect(
				RoundEntity.performRoundSnapshot()
			).to.eventually.be.rejectedWith(
				'relation "mem_round_snapshot" already exists'
			);
		});
	});

	describe('checkSnapshotAvailability()', () => {
		beforeEach('checkSnapshotAvailability', () =>
			RoundEntity.clearRoundSnapshot()
		);

		it('should use the correct SQL file with one parameter', async () => {
			// Perform round snapshot
			await RoundEntity.performRoundSnapshot();

			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.checkSnapshotAvailability('1');

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.checkSnapshotAvailability,
				{ round: '1' }
			);
		});

		it('should return 1 when snapshot for requested round is available', async () => {
			const account = new accountsFixtures.Account();

			const round1 = new roundsFixtures.Round({
				round: 1,
				delegate: account.publicKey,
			});

			await RoundEntity.create(round1);

			// Perform round snapshot
			await RoundEntity.performRoundSnapshot();

			const result = await RoundEntity.checkSnapshotAvailability(round1.round);

			expect(result).to.be.eql(1);
		});

		it('should return null when snapshot for requested round is not available', async () => {
			const account = new accountsFixtures.Account();

			const round1 = new roundsFixtures.Round({
				round: 1,
				delegatePublicKey: account.publicKey,
			});

			await RoundEntity.create(round1);

			// Perform round snapshot
			await RoundEntity.performRoundSnapshot();

			const result = await RoundEntity.checkSnapshotAvailability(
				round1.round + 1
			);

			expect(result).to.be.eql(null);
		});

		it('should return null when no round number is provided', async () => {
			// Perform round snapshot
			await RoundEntity.performRoundSnapshot();

			const result = await RoundEntity.checkSnapshotAvailability();

			expect(result).to.be.eql(null);
		});

		it('should reject with error if called without performing the snapshot', async () => {
			return expect(
				RoundEntity.checkSnapshotAvailability(1)
			).to.eventually.be.rejectedWith(
				'relation "mem_round_snapshot" does not exist'
			);
		});
	});

	describe('countRoundSnapshot()', () => {
		beforeEach('countRoundSnapshot', () => RoundEntity.clearRoundSnapshot());

		it('should use the correct SQL file with one parameter', async () => {
			// Perform round snapshot
			await RoundEntity.performRoundSnapshot();

			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.countRoundSnapshot();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.countRoundSnapshot,
				{},
				{
					expectedResultCount: 1,
				}
			);
		});

		it('should return proper number of records when table is not empty', async () => {
			// Seed some data to mem_rounds
			const rounds = [
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
			];

			await RoundEntity.create(rounds);

			// Perform round snapshot
			await RoundEntity.performRoundSnapshot();

			const count = await RoundEntity.countRoundSnapshot();

			expect(count).to.be.an('number');
			expect(count).to.be.eql(rounds.length);
		});

		it('should return 0 when table is empty', async () => {
			// Perform round snapshot
			await RoundEntity.performRoundSnapshot();

			const count = await RoundEntity.countRoundSnapshot();

			expect(count).to.be.an('number');
			expect(count).to.be.eql(0);
		});

		it('should reject with error if called without performing the snapshot', async () => {
			return expect(
				RoundEntity.countRoundSnapshot()
			).to.eventually.be.rejectedWith(
				'relation "mem_round_snapshot" does not exist'
			);
		});
	});

	describe('getDelegatesSnapshot()', () => {
		beforeEach('performVotesSnapshot', () => RoundEntity.clearVotesSnapshot());

		it('should reject with error if the called without performing the snapshot', async () => {
			return expect(
				RoundEntity.getDelegatesSnapshot(10)
			).to.eventually.be.rejectedWith(
				'relation "mem_votes_snapshot" does not exist'
			);
		});

		it('should use the correct SQL file with one parameter', async () => {
			// Perform the snapshot first
			await RoundEntity.performVotesSnapshot();

			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.getDelegatesSnapshot(10);

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.getDelegatesSnapshot,
				{ limit: 10 },
				{}
			);
		});

		it('should return snapshot records in valid format', async () => {
			// Seed some account
			const account = new accountsFixtures.Account({
				isDelegate: true,
			});
			await AccountEntity.create(account);

			// Perform the snapshot first
			await RoundEntity.performVotesSnapshot();

			const result = await RoundEntity.getDelegatesSnapshot(2);

			expect(result).to.be.not.empty;
			expect(result).to.be.an('array');
			expect(result[0]).to.have.all.keys('publicKey');
		});

		it('should return snapshot records in valid order', async () => {
			// Seed some account
			const account1 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account2 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account3 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const accounts = [account1, account2, account3];
			await AccountEntity.create(accounts);

			// Perform the snapshot first
			await RoundEntity.performVotesSnapshot();

			const result = await RoundEntity.getDelegatesSnapshot(3);

			expect(result.map(({ publicKey }) => publicKey)).to.be.eql(
				_.orderBy(accounts, ['vote', 'publicKey'], ['desc', 'asc']).map(
					r => r.publicKey
				)
			);
		});

		it('should return snapshot records with provided limit', async () => {
			// Seed some account
			const account1 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account2 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account3 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const accounts = [account1, account2, account3];
			await AccountEntity.create(accounts);

			// Perform the snapshot first
			await RoundEntity.performVotesSnapshot();

			const result = await RoundEntity.getDelegatesSnapshot(2);

			return expect(result).to.have.lengthOf(2);
		});
	});

	describe('clearVotesSnapshot()', () => {
		it('should use the correct SQL file with no parameters', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.clearVotesSnapshot();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.clearVotesSnapshot,
				{},
				{ expectedResultCount: 0 }
			);
		});

		it('should drop the votes snapshot table if it exists', async () => {
			// Make sure the table exists
			await adapter.execute(
				'CREATE TABLE mem_votes_snapshot AS TABLE mem_accounts'
			);

			// Check if table "mem_round_snapshot" exists
			const before = await checkTableExists(adapter, 'mem_votes_snapshot');
			await RoundEntity.clearVotesSnapshot();

			// Check if table "mem_round_snapshot" exists
			const after = await checkTableExists(adapter, 'mem_votes_snapshot');

			expect(before).to.be.true;
			return expect(after).to.be.false;
		});
	});

	describe('performVotesSnapshot()', () => {
		beforeEach('performVotesSnapshot', () => RoundEntity.clearVotesSnapshot());

		it('should use the correct SQL file with no parameters', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.performVotesSnapshot();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.performVotesSnapshot,
				{},
				{ expectedResultCount: 0 }
			);
		});

		it('should copy the "address", "publicKey", "vote", "producedBlocks", "missedBlocks" from table "mem_accounts" to snapshot table "mem_votes_snapshot" for delegates', async () => {
			// Seed some account
			const account1 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account2 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account3 = new accountsFixtures.Account({
				isDelegate: false,
			});
			const delegates = [account1, account2];
			await AccountEntity.create(account3);
			await AccountEntity.create(delegates);

			// Perform the snapshot
			await RoundEntity.performVotesSnapshot();

			const count = await adapter.execute(
				'SELECT count(*)::int FROM mem_accounts'
			);
			// Load records from the snapshot table
			const result = await adapter.execute(
				'SELECT *, encode("publicKey", \'hex\') as "publicKey" FROM mem_votes_snapshot'
			);

			expect(result).to.be.not.empty;

			expect(count[0].count).to.at.least(3);

			// As we there were only 2 delegates accounts
			expect(result).to.have.lengthOf(2);
			expect(result).to.have.deep.members(
				delegates.map(d => ({
					publicKey: d.publicKey,
					address: d.address,
					vote: d.vote,
					producedBlocks: d.producedBlocks,
					missedBlocks: d.missedBlocks,
				}))
			);
		});

		it('should be rejected with error if snapshot table already exists', async () => {
			await RoundEntity.performVotesSnapshot();

			return expect(
				RoundEntity.performVotesSnapshot()
			).to.eventually.be.rejectedWith(
				'relation "mem_votes_snapshot" already exists'
			);
		});
	});

	describe('restoreRoundSnapshot()', () => {
		beforeEach('restoreRoundSnapshot', () => RoundEntity.clearRoundSnapshot());

		it('should reject with error if the called without performing the snapshot', async () => {
			return expect(
				RoundEntity.restoreRoundSnapshot()
			).to.eventually.be.rejectedWith(
				'relation "mem_round_snapshot" does not exist'
			);
		});

		it('should use the correct SQL file with no parameters', async () => {
			// Perform the snapshot first
			await RoundEntity.performRoundSnapshot();

			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.restoreRoundSnapshot();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.restoreRoundSnapshot,
				{},
				{ expectedResultCount: 0 }
			);
		});

		it('should restore round snapshot to "mem_round" table', async () => {
			// Seed some data to mem_rounds
			const rounds = [
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
				new roundsFixtures.Round(),
			];

			await RoundEntity.create(rounds);

			// Perform the snapshot
			await RoundEntity.performRoundSnapshot();

			// Delete the records from round table
			await adapter.execute('DELETE FROM mem_round');

			const before = await adapter.execute('SELECT * FROM mem_round');
			// Restore the snapshot
			await RoundEntity.restoreRoundSnapshot();
			let after = await adapter.execute('SELECT * FROM mem_round');

			after = after.map(result => {
				result.delegatePublicKey = result.delegate;
				delete result.delegate;
				return result;
			});

			expect(before).to.have.lengthOf(0);
			expect(after).to.have.lengthOf(3);
			expect(after).to.be.eql(rounds);
		});
	});

	describe('restoreVotesSnapshot()', () => {
		beforeEach('restoreVotesSnapshot', () => RoundEntity.clearVotesSnapshot());

		it('should reject with error if the called without performing the snapshot', async () => {
			return expect(
				RoundEntity.restoreVotesSnapshot()
			).to.eventually.be.rejectedWith(
				'relation "mem_votes_snapshot" does not exist'
			);
		});

		it('should use the correct SQL file with no parameters', async () => {
			// Perform the snapshot first
			await RoundEntity.performVotesSnapshot();

			sinonSandbox.spy(adapter, 'executeFile');
			await RoundEntity.restoreVotesSnapshot();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(
				SQLs.restoreVotesSnapshot,
				{},
				{ expectedResultCount: 0 }
			);
		});

		it('should update vote information to "mem_accounts" table from snapshot', async () => {
			// Seed some account
			const account1 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account2 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const account3 = new accountsFixtures.Account({
				isDelegate: true,
			});
			const accounts = [account1, account2, account3];
			const addresses = accounts.map(a => a.address);
			await AccountEntity.create(accounts);

			// Perform the snapshot
			await RoundEntity.performVotesSnapshot();

			// Update mem_accounts and set vote to dummy value
			await adapter.execute(
				'UPDATE mem_accounts SET vote = $1 WHERE address IN ($2:csv)',
				[0, addresses]
			);

			const before = await adapter.execute(
				'SELECT address, vote FROM mem_accounts WHERE address IN ($1:csv)',
				[addresses]
			);
			// Restore the snapshot
			await RoundEntity.restoreVotesSnapshot();
			const after = await adapter.execute(
				'SELECT address, vote FROM mem_accounts WHERE address IN ($1:csv)',
				[addresses]
			);

			expect(before.map(a => a.vote)).to.be.eql(['0', '0', '0']);
			return accounts.forEach(account => {
				expect(_.find(after, { address: account.address }).vote).to.be.eql(
					account.vote
				);
			});
		});
	});
});
