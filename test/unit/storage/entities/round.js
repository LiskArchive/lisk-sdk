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

const { BaseEntity, Round } = require('../../../../storage/entities');
const storageSandbox = require('../../../common/storage_sandbox');
const seeder = require('../../../common/storage_seed');
const roundsFixtures = require('../../../fixtures').storageRounds;
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
} = require('../../../../storage/errors');

describe('Round', () => {
	let adapter;
	let addFieldSpy;
	let invalidFilter;
	let invalidOptions;
	let storage;
	let validFilters;
	let validOptions;
	let validRoundSQLs;
	let validRoundFields;

	const validRound = new roundsFixtures.Round();
	const validFilter = { round: validRound.round };

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_round'
		);
		await storage.bootstrap();

		invalidFilter = {
			foo: 'bar',
		};

		invalidOptions = {
			foo: true,
			bar: true,
		};

		validFilters = [
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

		validRoundSQLs = ['select', 'create', 'isPersisted', 'update', 'updateOne'];

		validRoundFields = ['address', 'amount', 'delegatePublicKey', 'round'];

		validOptions = {
			sort: 'round:asc',
		};

		adapter = storage.adapter;
		addFieldSpy = sinonSandbox.spy(Round.prototype, 'addField');
	});

	beforeEach(() => {
		return seeder.seed(storage);
	});

	afterEach(() => {
		sinonSandbox.reset();
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
			const round = new Round(adapter);
			expect(typeof round.parseFilters).to.be.eql('function');
			expect(typeof round.addFilter).to.be.eql('function');
			expect(typeof round.addField).to.be.eql('function');
			expect(typeof round.getFilters).to.be.eql('function');
			expect(typeof round.getUpdateSet).to.be.eql('function');
			expect(typeof round.getValuesSet).to.be.eql('function');
			expect(typeof round.begin).to.be.eql('function');
			expect(typeof round.validateFilters).to.be.eql('function');
			expect(typeof round.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const round = new Round(adapter);
			expect(round.SQLs).to.include.all.keys(validRoundSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const round = new Round(adapter);
			expect(addFieldSpy.callCount).to.eql(Object.keys(round.fields).length);
		});

		it('should setup correct fields', async () => {
			const round = new Round(adapter);
			expect(round.fields).to.include.all.keys(validRoundFields);
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
			const round = new Round(adapter);
			expect(() => {
				round.getOne(validFilter, { sort: 'round:desc' });
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const round = new Round(adapter);
			expect(() => {
				round.getOne(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			const round = new Round(adapter);
			expect(() => {
				round.getOne(validFilter, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const round = new Round(adapter);
			expect(() => {
				round.getOne(validFilter, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile');

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				const round = new Round(adapter);
				expect(round.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('isPersisted()', () => {
		beforeEach(async () => {
			await storage.entities.Round.create(validRound);
		});

		afterEach(async () => {
			await storage.entities.Round.delete(validFilter);
		});

		it('should accept only valid filters', async () => {
			const round = new Round(adapter);
			expect(() => {
				round.isPersisted(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const round = new Round(adapter);
			expect(() => {
				round.isPersisted(invalidFilter);
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
			await storage.entities.Round.create(randRound);
			const res = await storage.entities.Round.isPersisted({
				round: randRound.round,
			});
			expect(res).to.be.true;
		});

		it('should resolve with false if matching record not found', async () => {
			const randRound = new roundsFixtures.Round();
			await storage.entities.Round.create(randRound);
			const res = await storage.entities.Round.isPersisted({ round: '20000' });
			expect(res).to.be.false;
		});
	});

	describe('create()', () => {
		it('should save single round', async () => {
			const randRound = new roundsFixtures.Round();
			await storage.entities.Round.create(randRound);
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
			await storage.entities.Round.create(randRounds);
			const result = await storage.entities.Round.get(
				{ round_in: filters },
				{ sort: 'round:asc' }
			);
			expect(result).to.be.eql(randRounds);
		});
	});

	describe('delete', () => {
		it('should accept only valid filters', async () => {
			const randRound = new roundsFixtures.Round();
			const round = new Round(adapter);
			expect(() => {
				round.delete(validFilter, randRound);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const round = new Round(adapter);
			const randRound = new roundsFixtures.Round();
			expect(() => {
				round.delete(invalidFilter, randRound);
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
			await storage.entities.Round.create([randRoundA, randRoundB]);
			await storage.entities.Round.delete({ round: randRoundA.round });
			expect(
				await storage.entities.Round.getOne(
					{ round: randRoundB.round },
					{ sort: 'round' }
				)
			).to.eql(randRoundB);
		});

		it('should delete all records if no filter is specified', async () => {
			const randRoundA = new roundsFixtures.Round();
			const randRoundB = new roundsFixtures.Round();
			await storage.entities.Round.create([randRoundA, randRoundB]);
			await storage.entities.Round.delete();
			const found = await storage.entities.Round.get(
				{ round_in: [randRoundA.round, randRoundB.round] },
				{ sort: 'round' }
			);
			expect(found.length).to.eql(0);
		});
	});
});
