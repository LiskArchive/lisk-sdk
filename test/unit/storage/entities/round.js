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
const { BaseEntity, Round } = require('../../../../storage/entities');
const storageSandbox = require('../../../common/storage_sandbox');
const seeder = require('../../../common/storage_seed');
const accountsFixtures = require('../../../fixtures').accounts;
const roundsFixtures = require('../../../fixtures').storageRounds;
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
} = require('../../../../storage/errors');

describe('Round', () => {
	let adapter;
	let storage;
	let RoundEntity;
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
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_round'
		);
		await storage.bootstrap();

		adapter = storage.adapter;
		RoundEntity = storage.entities.Round;
		SQLs = RoundEntity.SQLs;
	});

	beforeEach(() => {
		return seeder.seed(storage);
	});

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
		beforeEach(async () => {
			await RoundEntity.create(validRound);
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
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validRound]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub();
			round.parseFilters = sinonSandbox.stub();
			round.isPersisted(validFilter);
			expect(round.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validRound]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub().returns(validFilter);
			round.parseFilters = sinonSandbox.stub();
			round.isPersisted(validFilter);
			expect(round.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validRound]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub().returns(validFilter);
			round.parseFilters = sinonSandbox.stub();
			round.getUpdateSet = sinonSandbox.stub();
			round.isPersisted(validFilter);
			expect(
				localAdapter.executeFile.calledWith(
					'loadSQLFile',
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
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([randRound]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const round = new Round(localAdapter);
			round.mergeFilters = sinonSandbox.stub();
			round.parseFilters = sinonSandbox.stub();
			round.delete(validFilter);
			expect(round.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const randRound = new roundsFixtures.Round();
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([randRound]),
				parseQueryComponent: sinonSandbox.stub(),
			};
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
			expect(
				await RoundEntity.getOne({ round: randRoundB.round }, { sort: 'round' })
			).to.eql(randRoundB);
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
			expect(RoundEntity.getTotalVotedAmount({})).to.be.fulfilled;
		});

		it('should resolve without any error if unnown round number is provided', async () => {
			return expect(RoundEntity.getTotalVotedAmount({ round: 1234 })).to.be
				.fulfilled;
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
});
