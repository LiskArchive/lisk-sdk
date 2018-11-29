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

const rewire = require('rewire');
const inputSerializers = require('../../../../storage/utils/inputSerializers');

const Field = rewire('../../../../storage/utils/field');

const filterGeneratorSpy = sinonSandbox.stub().returns({ key: { filter: '' } });
Field.__set__('filterGenerator', filterGeneratorSpy);

describe('Field', () => {
	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor()', () => {
		it('should fail without required param "name"', () => {
			return expect(() => {
				new Field();
			}).to.throw('Name is required to initialize field.');
		});
		it('should fail without required param "type"', () => {
			return expect(() => {
				new Field('name');
			}).to.throw('Type is required to initialize field.');
		});
		it('should assign param and data members properly if optional attributes not provided', () => {
			const field = new Field('name', 'type');

			expect(field.name).to.be.eql('name');
			expect(field.type).to.be.eql('type');
			expect(field.filterType).to.be.eql(undefined);
			expect(field.inputSerializer).to.be.eql(inputSerializers.default);
			return expect(field.filterCondition).to.be.eql(undefined);
		});

		it('should assign filters if filter type provided', () => {
			const field = new Field('name', 'type', {
				filter: 'STRING',
				fieldName: 'fieldName',
				filterCondition: 'condition',
			});
			filterGeneratorSpy.returns({ key: { filter: '' } });

			expect(filterGeneratorSpy).to.be.calledOnce;
			expect(filterGeneratorSpy).to.be.calledWith(
				'STRING',
				field.name,
				field.fieldName,
				field.inputSerializer,
				'condition'
			);
			return expect(field.filters).to.be.eql({ key: { filter: '' } });
		});
	});
});
