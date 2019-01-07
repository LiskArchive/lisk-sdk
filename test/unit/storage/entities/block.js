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

const { BaseEntity, Block } = require('../../../../storage/entities');
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
	NonSupportedOperationError,
} = require('../../../../storage/errors');

describe('Block', () => {
	it('should be a constructable function', async () => {
		expect(Block.prototype.constructor).to.be.not.null;
		expect(Block.prototype.constructor.name).to.be.eql('Block');
	});

	it('should extend BaseEntity', async () => {
		expect(Block.prototype).to.be.an.instanceof(BaseEntity);
	});

	describe('constructor()', () => {
		it('should have one mandatory parameter', async () => {
			expect(Block.prototype.constructor.length).to.be.eq(1);
		});

		it('should call super');

		it('should assign proper parameters', async () => {
			const adapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
			};
			const defaultFilters = { version: 1 };

			const block = new Block(adapter, defaultFilters);

			expect(block.adapter).to.be.eq(adapter);
			expect(block.defaultFilters).to.be.eq(defaultFilters);
			expect(block.SQLs).to.be.eql({
				select: 'loadSQLFile',
				count: 'loadSQLFile',
				create: 'loadSQLFile',
				isPersisted: 'loadSQLFile',
			});
			expect(block.defaultOptions).to.be.eql({
				extended: false,
				limit: 10,
				offset: 0,
				sort: 'height:desc',
			});
		});

		it('should setup specific fields', async () => {
			const adapter = { loadSQLFile: sinonSandbox.stub() };
			const addFieldSpy = sinonSandbox.spy(Block.prototype, 'addField');
			const block = new Block(adapter);

			expect(addFieldSpy.callCount).to.eql(Object.keys(block.fields).length);
			expect(block.fields).to.have.all.keys([
				'blockSignature',
				'confirmations',
				'generatorPublicKey',
				'height',
				'id',
				'numberOfTransactions',
				'payloadHash',
				'payloadLength',
				'previousBlockId',
				'reward',
				'timestamp',
				'totalAmount',
				'totalFee',
				'version',
			]);
		});

		it('should setup specific filters', async () => {
			const adapter = { loadSQLFile: sinonSandbox.stub() };
			const block = new Block(adapter);

			expect(block.filters).to.have.all.keys([
				'blockSignature',
				'blockSignature_eql',
				'blockSignature_in',
				'blockSignature_like',
				'blockSignature_ne',
				'confirmations',
				'confirmations_eql',
				'confirmations_gt',
				'confirmations_gte',
				'confirmations_in',
				'confirmations_lt',
				'confirmations_lte',
				'confirmations_ne',
				'generatorPublicKey',
				'generatorPublicKey_eql',
				'generatorPublicKey_in',
				'generatorPublicKey_like',
				'generatorPublicKey_ne',
				'height',
				'height_eql',
				'height_gt',
				'height_gte',
				'height_in',
				'height_lt',
				'height_lte',
				'height_ne',
				'id',
				'id_eql',
				'id_in',
				'id_like',
				'id_ne',
				'numberOfTransactions',
				'numberOfTransactions_eql',
				'numberOfTransactions_gt',
				'numberOfTransactions_gte',
				'numberOfTransactions_in',
				'numberOfTransactions_lt',
				'numberOfTransactions_lte',
				'numberOfTransactions_ne',
				'payloadHash',
				'payloadHash_eql',
				'payloadHash_in',
				'payloadHash_like',
				'payloadHash_ne',
				'payloadLength',
				'payloadLength_eql',
				'payloadLength_gt',
				'payloadLength_gte',
				'payloadLength_in',
				'payloadLength_lt',
				'payloadLength_lte',
				'payloadLength_ne',
				'previousBlockId',
				'previousBlockId_eql',
				'previousBlockId_in',
				'previousBlockId_like',
				'previousBlockId_ne',
				'reward',
				'reward_eql',
				'reward_gt',
				'reward_gte',
				'reward_in',
				'reward_lt',
				'reward_lte',
				'reward_ne',
				'timestamp',
				'timestamp_eql',
				'timestamp_gt',
				'timestamp_gte',
				'timestamp_in',
				'timestamp_lt',
				'timestamp_lte',
				'timestamp_ne',
				'totalAmount',
				'totalAmount_eql',
				'totalAmount_gt',
				'totalAmount_gte',
				'totalAmount_in',
				'totalAmount_lt',
				'totalAmount_lte',
				'totalAmount_ne',
				'totalFee',
				'totalFee_eql',
				'totalFee_gt',
				'totalFee_gte',
				'totalFee_in',
				'totalFee_lt',
				'totalFee_lte',
				'totalFee_ne',
				'version',
				'version_eql',
				'version_gt',
				'version_gte',
				'version_in',
				'version_lt',
				'version_lte',
				'version_ne',
			]);
		});
	});

	describe('get()', () => {
		let block;

		before(async () => {
			const adapter = { loadSQLFile: sinonSandbox.stub() };
			block = new Block(adapter);
		});

		it('should accept valid filters', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.get(filters);
			}).to.not.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const filters = [{ invalid_filter: 1 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.get(filters);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept valid options', async () => {
			const options = { limit: 100, offset: 0 };
			expect(() => {
				block.get({}, options);
			}).to.not.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const options = { invalid_option: 1, offset: 0 };
			expect(() => {
				block.get({}, options);
			}).to.throw(NonSupportedOptionError);
		});

		it('should accept valid sorting option', async () => {
			const sortOption = { sort: 'height:asc' };
			expect(() => {
				block.get({}, sortOption);
			}).to.not.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid field sorting option', async () => {
			const sortOption = { sort: 'invalid:asc' };
			expect(() => {
				block.get({}, sortOption);
			}).to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid method sorting option', async () => {
			const sortOption = { sort: 'height:invalid' };
			expect(() => {
				block.get({}, sortOption);
			}).to.throw(NonSupportedOptionError);
		});

		it(
			'should call adapter.executeFile with proper param for FIELD_SET_SIMPLE'
		);
		it('should accept "tx" as last parameter and pass to adapter.executeFile');
		it(
			'should resolve with array of objects matching specification of type definition for FIELD_SET_SIMPLE'
		);
		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters');
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('getOne()', () => {
		let block;

		before(async () => {
			const adapter = { loadSQLFile: sinonSandbox.stub() };
			block = new Block(adapter);
		});

		it('should accept valid filters', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.getOne(filters);
			}).to.not.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const filters = [{ invalid_filter: 1 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.getOne(filters);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept valid options', async () => {
			const options = { limit: 100, offset: 0 };
			expect(() => {
				block.getOne({}, options);
			}).to.not.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const options = { invalid_option: 1, offset: 0 };
			expect(() => {
				block.getOne({}, options);
			}).to.throw(NonSupportedOptionError);
		});

		it(
			'should call adapter.executeFile with proper param for FIELD_SET_SIMPLE'
		);
		it('should accept "tx" as last parameter and pass to adapter.executeFile');
		it(
			'should resolve with one object matching specification of type definition for FIELD_SET_SIMPLE'
		);
		it(
			'should reject with error if matched with multiple records for provided filters'
		);
		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters');
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('count()', () => {
		let block;

		before(async () => {
			const adapter = { loadSQLFile: sinonSandbox.stub() };
			block = new Block(adapter);
		});

		it('should accept valid filters', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.count(filters);
			}).to.not.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const filters = [{ invalid_filter: 1 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.count(filters);
			}).to.throw(NonSupportedFilterTypeError);
		});
	});

	describe('create()', () => {
		it('should accept only valid options');
		it('should throw error for in-valid options');
		it('should call getValuesSet with proper params');
		it('should call adapter.executeFile with proper params');
		it('should create a block object successfully');
		it('should skip if any invalid attribute is provided');
		it('should reject with invalid data provided');
		it('should populate block object with default values');
	});

	describe('update()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Block.prototype.update).to.throw(NonSupportedOperationError);
		});
	});

	describe('updateOne()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Block.prototype.updateOne).to.throw(NonSupportedOperationError);
		});
	});

	describe('isPersisted()', () => {
		let block;

		before(async () => {
			const adapter = {
				loadSQLFile: sinonSandbox.stub(),
				executeFile: sinonSandbox.stub().resolves(),
			};
			block = new Block(adapter);
		});

		it('should accept valid filters', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.isPersisted(filters);
			}).to.not.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const filters = [{ invalid_filter: 1 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.isPersisted(filters);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for empty filter', async () => {
			const filters = {};
			expect(() => {
				block.isPersisted(filters);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept valid options', async () => {
			const options = { limit: 100, offset: 0 };
			expect(() => {
				block.isPersisted({}, options);
			}).to.not.throw(NonSupportedOptionError);
		});

		it('should call mergeFilters with proper params', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			block.mergeFilters = sinonSandbox.stub();
			block.parseFilters = sinonSandbox.stub();
			block.isPersisted(filters);
			expect(block.mergeFilters.calledWith(filters)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			block.mergeFilters = sinonSandbox.stub().returns(filters);
			block.parseFilters = sinonSandbox.stub();
			block.isPersisted(filters);
			expect(block.parseFilters.calledWith(filters)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const adapter = {
				loadSQLFile: sinonSandbox.stub(),
				executeFile: sinonSandbox.stub().resolves(),
			};
			block = new Block(adapter);

			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			block.mergeFilters = sinonSandbox.stub().returns(filters);
			block.parseFilters = sinonSandbox
				.stub()
				.returns('WHERE "height" = 101 OR "timestamp" >= 1234567890');
			block.isPersisted(filters);
			const params = {
				parsedFilters: 'WHERE "height" = 101 OR "timestamp" >= 1234567890',
			};
			expect(
				adapter.executeFile.calledWith(
					block.SQLs.isPersisted,
					params,
					{ expectedResultCount: 1 },
					undefined
				)
			).to.be.true;
		});

		it('should resolve with true if matching record found', async () => {
			const executeFileResponse = { exists: true };
			const adapter = {
				loadSQLFile: sinonSandbox.stub(),
				executeFile: sinonSandbox.stub().resolves(executeFileResponse),
			};
			block = new Block(adapter);
			block.mergeFilters = sinonSandbox.stub();
			block.parseFilters = sinonSandbox.stub();

			const filters = { height: 101 };
			const resp = await block.isPersisted(filters);
			expect(resp).to.be.eql(true);
		});

		it('should resolve with false if matching record not found', async () => {
			const executeFileResponse = { exists: false };
			const adapter = {
				loadSQLFile: sinonSandbox.stub(),
				executeFile: sinonSandbox.stub().resolves(executeFileResponse),
			};
			block = new Block(adapter);
			block.mergeFilters = sinonSandbox.stub();
			block.parseFilters = sinonSandbox.stub();

			const filters = { height: 101 };
			const resp = await block.isPersisted(filters);
			expect(resp).to.be.eql(false);
		});
	});

	describe('validateFilters()', () => {
		let block;

		before(async () => {
			const adapter = { loadSQLFile: sinonSandbox.stub() };
			block = new Block(adapter);
		});

		it('should accept valid filters as single object', async () => {
			const filters = { height: 101 };
			expect(block.validateFilters(filters)).to.be.eq(true);
		});

		it('should accept valid filters as array of objects', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			expect(block.validateFilters(filters)).to.be.eq(true);
		});

		it('should throw error for invalid filters', async () => {
			const filters = [{ invalid_filter: 1 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.validateFilters(filters);
			}).to.throw(
				NonSupportedFilterTypeError,
				'One or more filters are not supported.'
			);
		});

		describe('when required flag is true', () => {
			const atLeastOneRequired = true;

			it('should accept valid filters as single object', async () => {
				const filters = { height: 101 };
				expect(block.validateFilters(filters, atLeastOneRequired)).to.be.eq(
					true
				);
			});

			it('should accept valid filters as array of objects', async () => {
				const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
				expect(block.validateFilters(filters, atLeastOneRequired)).to.be.eq(
					true
				);
			});

			it('should throw error when filter is empty array', async () => {
				const filters = [];
				expect(() => {
					block.validateFilters(filters, atLeastOneRequired);
				}).to.throw(
					NonSupportedFilterTypeError,
					'One or more filters are required for this operation.'
				);
			});

			it('should throw error when filter is empty object', async () => {
				const filters = {};
				expect(() => {
					block.validateFilters(filters, atLeastOneRequired);
				}).to.throw(
					NonSupportedFilterTypeError,
					'One or more filters are required for this operation.'
				);
			});

			it('should throw error when filter is null', async () => {
				const filters = null;
				expect(() => {
					block.validateFilters(filters, atLeastOneRequired);
				}).to.throw(
					NonSupportedFilterTypeError,
					'One or more filters are required for this operation.'
				);
			});

			it('should throw error when filter is empty string', async () => {
				const filters = '';
				expect(() => {
					block.validateFilters(filters, atLeastOneRequired);
				}).to.throw(
					NonSupportedFilterTypeError,
					'One or more filters are required for this operation.'
				);
			});

			it('should throw error when filter is undefined', async () => {
				const filters = undefined;
				expect(() => {
					block.validateFilters(filters, atLeastOneRequired);
				}).to.throw(
					NonSupportedFilterTypeError,
					'One or more filters are required for this operation.'
				);
			});

			it('should throw error when filter is invalid', async () => {
				const filters = { invalid_filter: 1 };
				expect(() => {
					block.validateFilters(filters, atLeastOneRequired);
				}).to.throw(
					NonSupportedFilterTypeError,
					'One or more filters are not supported.'
				);
			});
		});
	});

	describe('validateOptions()', () => {
		let block;

		before(async () => {
			const adapter = { loadSQLFile: sinonSandbox.stub() };
			block = new Block(adapter);
		});

		it('should accept valid options as single object', async () => {
			const options = { limit: 100, offset: 0 };
			expect(block.validateOptions(options)).to.be.eq(true);
		});

		it('should throw error for invalid options', async () => {
			const options = { invalid_option: 1, offset: 0 };
			expect(() => {
				block.validateOptions(options);
			}).to.throw(NonSupportedOptionError);
		});
	});

	describe('mergeFilters()', () => {
		describe('without defaultFilters', () => {
			let block;

			before(async () => {
				const adapter = { loadSQLFile: sinonSandbox.stub() };
				block = new Block(adapter);
			});

			it('should accept filters as single object', async () => {
				const filters = { height: 101 };
				expect(block.mergeFilters(filters)).to.be.eql(filters);
			});

			it('should accept filters as array of objects', async () => {
				const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
				expect(block.mergeFilters(filters)).to.be.eql(filters);
			});
		});

		describe('with defaultFilters', () => {
			let block;

			before(async () => {
				const adapter = { loadSQLFile: sinonSandbox.stub() };
				const defaultFilters = { version: 1 };
				block = new Block(adapter, defaultFilters);
			});

			it('should merge provided filter with default filters by preserving default filters values', async () => {
				const filters = { height: 101 };
				const expectedResult = { height: 101, version: 1 };
				expect(block.mergeFilters(filters)).to.be.eql(expectedResult);
			});

			it('should merge provided filter with default filters by preserving default filters in each object when passing an array', async () => {
				const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
				const expectedResult = [
					{ height: 101, version: 1 },
					{ timestamp_gte: 1234567890, version: 1 },
				];
				expect(block.mergeFilters(filters)).to.be.eql(expectedResult);
			});
		});
	});
});
