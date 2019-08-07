/* eslint-disable mocha/no-pending-tests */
/*
 * Copyright © 2019 Lisk Foundation
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

const {
	utils: { filterTypes, inputSerializers, filterGenerator: filters },
} = require('../../../../../../src/components/storage');

const customSerializer = sinonSandbox.stub().returns('custom serialized value');

describe('filters', () => {
	beforeEach(async () => {
		sinonSandbox
			.stub(inputSerializers, 'defaultInput')
			.returns('defaultInput serialized value');
	});

	afterEach(() => sinonSandbox.restore());

	it('should export one function', async () => {
		expect(Object.keys(filters).length).to.be.eql(1);
		expect(Object.keys(filters)[0]).to.be.eql('filterGenerator');
		return expect(filters.filterGenerator).to.be.a('function');
	});

	describe('filterGenerator', () => {
		const filterGenerator = filters.filterGenerator;

		it('should accept 5 parameters', async () =>
			expect(filterGenerator.length).to.be.eql(5));

		describe('filter types', () => {
			['defaultInput', 'custom'].forEach(serializer => {
				describe(`using ${serializer} serializer`, () => {
					const ser = serializer === 'custom' ? customSerializer : null;

					it('should return appropriate filters for BOOLEAN type', async () =>
						expect(
							filterGenerator(filterTypes.BOOLEAN, 'alias', 'name', ser),
						).to.be.eql({
							alias: `"name" = ${serializer} serialized value`,
							alias_eql: `"name" = ${serializer} serialized value`,
							alias_ne: `"name" <> ${serializer} serialized value`,
						}));

					it('should return appropriate filters for TEXT type', async () =>
						expect(
							filterGenerator(filterTypes.TEXT, 'alias', 'name', ser),
						).to.be.eql({
							alias: `"name" = ${serializer} serialized value`,
							alias_eql: `"name" = ${serializer} serialized value`,
							alias_in: '"name" IN (${alias_in:csv})',
							alias_like: '"name" LIKE (${alias_like})',
							alias_ne: `"name" <> ${serializer} serialized value`,
						}));

					it('should return appropriate filters for NUMBER type', async () =>
						expect(
							filterGenerator(filterTypes.NUMBER, 'alias', 'name', ser),
						).to.be.eql({
							alias: `"name" = ${serializer} serialized value`,
							alias_eql: `"name" = ${serializer} serialized value`,
							alias_gt: `"name" > ${serializer} serialized value`,
							alias_gte: `"name" >= ${serializer} serialized value`,
							alias_in: '"name" IN (${alias_in:csv})',
							alias_lt: `"name" < ${serializer} serialized value`,
							alias_lte: `"name" <= ${serializer} serialized value`,
							alias_ne: `"name" <> ${serializer} serialized value`,
						}));
				});
			});

			describe('custom filter type', () => {
				it('should use defaultInput condition if specified', async () =>
					expect(
						filterGenerator(
							filterTypes.CUSTOM,
							'alias',
							'name',
							customSerializer,
							'${alias} - custom condition',
						),
					).to.be.eql({ alias: '${alias} - custom condition' }));

				it('should use serializer if condition not provided', async () =>
					expect(
						filterGenerator(
							filterTypes.CUSTOM,
							'alias',
							'name',
							customSerializer,
						),
					).to.be.eql({ alias: '"name" = custom serialized value' }));

				it('should use defaultInput serializer if serializer and condition not provided', async () =>
					expect(
						filterGenerator(filterTypes.CUSTOM, 'alias', 'name'),
					).to.be.eql({ alias: '"name" = defaultInput serialized value' }));
			});

			it('throw error if invalid filter type provided', async () =>
				expect(() => filterGenerator('invalidType', 'alias', 'name')).to.throw(
					'"invalidType" not supported filter type. Supported types are: TEXT,BINARY,NUMBER,BOOLEAN,CUSTOM.',
				));
		});
	});
});
