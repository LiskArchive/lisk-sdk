/*
 * Copyright © 2020 Lisk Foundation
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

const { ZSchema } = require('../../../../../src/application/validator');

const formatsSpec = new ZSchema();

const shouldReturnFalseForEmptyNonStringValues = schema => {
	const composedSchema = {
		type: 'object',
		properties: {
			test: {},
		},
	};

	test('should return false for null values', () => {
		composedSchema.properties.test = schema;
		return expect(formatsSpec.validate({ test: null }, composedSchema)).toEqual(
			false,
		);
	});

	test('should return false for undefined values', () => {
		composedSchema.properties.test = schema;
		return expect(
			formatsSpec.validate({ test: undefined }, composedSchema),
		).toBeFalse();
	});

	test('should return false for NaN values', () => {
		composedSchema.properties.test = schema;
		return expect(formatsSpec.validate({ test: NaN }, composedSchema)).toEqual(
			false,
		);
	});

	test('should return false for empty array values', () => {
		return expect(formatsSpec.validate([], schema)).toBeFalse();
	});

	test('should return false for empty object values', () => {
		return expect(formatsSpec.validate({}, schema)).toBeFalse();
	});
};

const shouldReturnTrueForEmptyStringValues = schema => {
	test('should return true for empty string values', () => {
		return expect(formatsSpec.validate('', schema)).toBeTrue();
	});
};

describe('formats', () => {
	describe('queryList', () => {
		const schema = {
			format: 'queryList',
		};

		const invalidData = ['xxx', 123, NaN, undefined, [1, 2], '', null];

		it.each(invalidData)(
			'should return false for non-object values %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeFalse();
			},
		);

		it('should return true for object values', () => {
			const validQueryList = { foo: 'bar' };
			return expect(formatsSpec.validate(validQueryList, schema)).toBeTrue();
		});
	});

	describe('delegatesList', () => {
		const schema = {
			format: 'delegatesList',
		};

		const invalidData = ['xxx', 123, NaN, undefined, [1, 2], '', null];

		it.each(invalidData)(
			'should return false for non-object values: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeFalse();
			},
		);

		it('should return true for object values', () => {
			const validDelegateList = { foo: 'bar' };
			return expect(formatsSpec.validate(validDelegateList, schema)).toBeTrue();
		});
	});

	describe('parsedInt', () => {
		const schema = {
			format: 'parsedInt',
		};
		const invalidData = ['xxx', {}, NaN, undefined, [1, 2], null, 1.123];
		const validData = [123, '123', 0, '0'];

		it.each(invalidData)(
			'should return false for non-numeric values: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeFalse();
			},
		);

		it.each(validData)('should return true for numeric values: %o', item => {
			expect(formatsSpec.validate(item, schema)).toBeTrue();
		});

		shouldReturnFalseForEmptyNonStringValues(schema);
	});

	describe('os', () => {
		const schema = {
			format: 'os',
		};

		it('should return false for invalid os value', () => {
			const invalidOs = 'atari!!!!';
			return expect(formatsSpec.validate(invalidOs, schema)).toBeFalse();
		});

		it('should return true for valid os value', () => {
			const validOs = 'linux_1';
			return expect(formatsSpec.validate(validOs, schema)).toBeTrue();
		});

		shouldReturnFalseForEmptyNonStringValues(schema);
		shouldReturnTrueForEmptyStringValues(schema);
	});

	describe('version', () => {
		const schema = {
			format: 'version',
		};
		const invalidData = [
			'1a.1',
			'1111.11.11',
			'1.1.1.1.1',
			'1.1.1aa',
			'11.11.22-alpha.',
			'11.11.22-abcd.0',
			'11.11.22-',
			'1.0.0-beta.6.1000',
		];

		const validData = [
			'1.1.1',
			'111.1.1',
			'11.11.22',
			'11.11.22-alpha.0',
			'11.11.22-beta.1',
			'11.11.22-rc.999',
			'1.0.0-beta.6.0',
		];

		it.each(invalidData)(
			'should return false for invalid version value: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeFalse();
			},
		);

		it.each(validData)(
			'should return true for valid version value: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeTrue();
			},
		);

		shouldReturnFalseForEmptyNonStringValues(schema);
		shouldReturnTrueForEmptyStringValues(schema);
	});

	describe('protocolVersion', () => {
		const schema = {
			format: 'protocolVersion',
		};

		const invalidData = [
			'1a.1',
			'-1.-1',
			'01.1',
			'1.1.1',
			'1.1.1-alpha.0',
			'1.01',
		];

		const validData = ['1.0', '111.12', '11.11', '999.999', '999.0'];

		it.each(invalidData)(
			'should return false for invalid protocol version format: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeFalse();
			},
		);

		it.each(validData)(
			'should return true for valid protocol version format: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeTrue();
			},
		);

		shouldReturnFalseForEmptyNonStringValues(schema);
		shouldReturnTrueForEmptyStringValues(schema);
	});

	describe('ipOrFQDN', () => {
		const schema = {
			format: 'ipOrFQDN',
		};
		const invalidData = ['192.168', 'alpha-', 'apha_server', 'alpha.server.'];
		const validData = [
			'192.168.0.1',
			'127.0.0.1',
			'localhost',
			'app.server',
			'alpha.server.com',
			'8.8.8.8',
		];

		it.each(invalidData)(
			'should return false if value is not an IP or not a FQDN: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeFalse();
			},
		);

		it.each(validData)(
			'should return true if value is an IP or a valid FQDN: %o',
			item => {
				expect(formatsSpec.validate(item, schema)).toBeTrue();
			},
		);

		shouldReturnFalseForEmptyNonStringValues(schema);
	});
});
