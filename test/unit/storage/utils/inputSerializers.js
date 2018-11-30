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

const inputSerializers = require('../../../../storage/utils/inputSerializers');

describe('inputSerializers', () => {
	afterEach(() => {
		return sinonSandbox.restore();
	});

	it('should export three functions', () => {
		return expect(Object.keys(inputSerializers)).to.be.eql([
			'default',
			'booleanToInt',
			'stringToByte',
		]);
	});

	describe('default', () => {
		it('should accept four parameters', () => {
			return expect(inputSerializers.default).to.have.length(4);
		});

		it('should return proper value', () => {
			return expect(
				inputSerializers.default('value', 'mode', 'alias', 'name')
			).to.be.eql('${alias}');
		});
	});

	describe('booleanToInt', () => {
		it('should accept four parameters', () => {
			return expect(inputSerializers.booleanToInt).to.have.length(4);
		});

		it('should return proper value', () => {
			return expect(
				inputSerializers.booleanToInt('value', 'mode', 'alias', 'name')
			).to.be.eql('${alias}::int');
		});
	});

	describe('stringToByte', () => {
		it('should accept four parameters', () => {
			return expect(inputSerializers.stringToByte).to.have.length(4);
		});

		it('should return decoded value if value present', () => {
			return expect(
				inputSerializers.stringToByte('value', 'mode', 'alias', 'name')
			).to.be.eql("DECODE(${alias}, 'hex')");
		});

		it('should return NULL if value not present', () => {
			return expect(
				inputSerializers.stringToByte(undefined, 'mode', 'alias', 'name')
			).to.be.eql('NULL');
		});
	});
});
