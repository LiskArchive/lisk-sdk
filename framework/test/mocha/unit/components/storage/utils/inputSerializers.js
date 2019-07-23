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
	utils: { inputSerializers },
} = require('../../../../../../src/components/storage');

describe('inputSerializers', () => {
	afterEach(() => sinonSandbox.restore());

	it('should export three functions', async () =>
		expect(Object.keys(inputSerializers)).to.be.eql([
			'defaultInput',
			'booleanToInt',
			'stringToByte',
		]));

	describe('defaultInput', () => {
		it('should accept four parameters', async () =>
			expect(inputSerializers.defaultInput).to.have.length(4));

		it('should return proper value', async () =>
			expect(
				inputSerializers.defaultInput('value', 'mode', 'alias', 'name')
			).to.be.eql('${alias}'));
	});

	describe('booleanToInt', () => {
		it('should accept four parameters', async () =>
			expect(inputSerializers.booleanToInt).to.have.length(4));

		it('should return proper value', async () =>
			expect(
				inputSerializers.booleanToInt('value', 'mode', 'alias', 'name')
			).to.be.eql('${alias}::int'));
	});

	describe('stringToByte', () => {
		it('should accept four parameters', async () =>
			expect(inputSerializers.stringToByte).to.have.length(4));

		it('should return decoded value if value present', async () =>
			expect(
				inputSerializers.stringToByte('value', 'mode', 'alias', 'name')
			).to.be.eql("DECODE(${alias}, 'hex')"));

		it('should return NULL if value not present', async () =>
			expect(
				inputSerializers.stringToByte(undefined, 'mode', 'alias', 'name')
			).to.be.eql('NULL'));
	});
});
