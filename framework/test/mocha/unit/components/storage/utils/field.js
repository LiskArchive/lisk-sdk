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
	utils: { Field, inputSerializers },
} = require('../../../../../../src/components/storage');

describe('Field', () => {
	beforeEach(async () => {
		sinonSandbox
			.stub(Field.prototype, 'generateFilters')
			.returns({ key: { filter: '' } });

		sinonSandbox
			.stub(inputSerializers, 'defaultInput')
			.returns('serialized value');
	});

	afterEach(() => sinonSandbox.restore());

	describe('constructor()', () => {
		it('should fail without required param "name"', async () =>
			expect(() => {
				new Field();
			}).to.throw('Name is required to initialize field.'));

		it('should fail without required param "type"', async () =>
			expect(() => {
				new Field('name');
			}).to.throw('Type is required to initialize field.'));

		it('should assign param and data members properly if optional attributes not provided', async () => {
			const field = new Field('name', 'type');

			expect(field.name).to.be.eql('name');
			expect(field.type).to.be.eql('type');
			expect(field.filterType).to.be.eql(undefined);
			expect(field.inputSerializer).to.be.eql(inputSerializers.defaultInput);
			return expect(field.filterCondition).to.be.eql(undefined);
		});

		it('should assign filters if filter type provided', async () => {
			const field = new Field('name', 'type', {
				filter: 'TEXT',
				fieldName: 'fieldName',
				filterCondition: 'condition',
			});

			expect(field.generateFilters).to.be.calledOnce;
			expect(field.generateFilters).to.be.calledWith(
				'TEXT',
				field.name,
				field.fieldName,
				field.inputSerializer,
				'condition',
			);
			return expect(field.filters).to.be.eql({ key: { filter: '' } });
		});
	});

	describe('getFilters()', () => {
		it('should return the filters', async () => {
			const field = new Field('name', 'type', {
				filter: 'TEXT',
				fieldName: 'fieldName',
				filterCondition: 'condition',
			});

			return expect(field.getFilters()).to.be.eql({ key: { filter: '' } });
		});
	});

	describe('serializeValue()', () => {
		it('should return serialized value for field', async () => {
			const field = new Field('name', 'type', {
				filter: 'TEXT',
				fieldName: 'fieldName',
			});

			expect(field.serializeValue(123, 'my-mode')).to.be.eql(
				'serialized value',
			);

			expect(inputSerializers.defaultInput).to.be.calledOnce;

			return expect(inputSerializers.defaultInput).to.be.calledWith(
				123,
				'my-mode',
				field.name,
				field.fieldName,
			);
		});
	});
});
