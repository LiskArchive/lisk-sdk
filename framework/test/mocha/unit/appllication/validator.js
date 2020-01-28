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

const randomstring = require('randomstring');
const { ZSchema } = require('../../../../src/application/validator');

const validator = new ZSchema();

const { ADDITIONAL_DATA } = global.__testContext.config;

const shouldReturnFalseForEmptyNonStringValues = function() {
	const composedSchema = {
		type: 'object',
		properties: {
			test: {},
		},
	};

	it('should return false for null values', function() {
		composedSchema.properties.test = this.schema;
		return expect(validator.validate({ test: null }, composedSchema)).to.equal(
			false,
		);
	});

	it('should return false for undefined values', function() {
		composedSchema.properties.test = this.schema;
		return expect(
			validator.validate({ test: undefined }, composedSchema),
		).to.equal(false);
	});

	it('should return false for NaN values', function() {
		composedSchema.properties.test = this.schema;
		return expect(validator.validate({ test: NaN }, composedSchema)).to.equal(
			false,
		);
	});

	it('should return false for empty array values', function() {
		return expect(validator.validate([], this.schema)).to.equal(false);
	});

	it('should return false for empty object values', function() {
		return expect(validator.validate({}, this.schema)).to.equal(false);
	});
};

const shouldReturnTrueForEmptyStringValues = function() {
	it('should return true for empty string values', function() {
		return expect(validator.validate('', this.schema)).to.equal(true);
	});
};

describe('schema - custom formats', () => {
	describe('id', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'id',
			};
			done();
		});

		it('should return false if contains non-numeric value', function() {
			const invalidData = ['L1234', '1234L', 'ABCD', '12L34'];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return false for negative value', function() {
			return expect(validator.validate('-100', this.schema)).to.equal(false);
		});

		it('should return true if string contains numeric value', function() {
			const validData = ['123', '0', '663332353555532'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('additionalData', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'additionalData',
			};
			done();
		});

		it('should return false if string is longer than maxLength (either chars or bytes)', function() {
			const invalidData = [];
			invalidData.push(
				`${randomstring.generate(ADDITIONAL_DATA.MAX_LENGTH - 1)}现`,
			);
			invalidData.push(randomstring.generate(ADDITIONAL_DATA.MAX_LENGTH + 1));

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true if string is between minLength and maxLength', function() {
			const validData = [];
			validData.push(randomstring.generate(ADDITIONAL_DATA.MIN_LENGTH));
			validData.push(randomstring.generate(ADDITIONAL_DATA.MAX_LENGTH));

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('address', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'address',
			};
			done();
		});

		it('should return false if value does not end with L', function() {
			const invalidData = ['L1234', '1234L1', 'LABCD', '12L34'];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return false for non-numeric addresses', function() {
			const invalidData = ['123aL', 'aaaaL', 'a123L', '___L', 'L'];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true if string contains numeric value', function() {
			const validData = ['123L', '0L', '663332353555532L'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		it('should return false if string contains leading zeros', function() {
			const validData = ['0123L'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true if string contains contains number less than UINT64_MAX', function() {
			const validData = ['18446744073709551614L'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		it('should return true if string contains contains number equal to UINT64_MAX', function() {
			const validData = ['18446744073709551615L'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		it('should return false if string contains contains number greater than UINT64_MAX', function() {
			const validData = ['18446744073709551616L'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('username', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'username',
			};
			done();
		});

		it('should return false for invalid username value', function() {
			const invalidUsername = 'hello^lisk';
			return expect(validator.validate(invalidUsername, this.schema)).to.equal(
				false,
			);
		});

		it('should return true for valid username value', function() {
			const validUsername = 'hello111_lisk!';
			return expect(validator.validate(validUsername, this.schema)).to.equal(
				true,
			);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('hex', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'hex',
			};
			done();
		});

		it('should return false for invalid hex value', function() {
			const invalidHex = 'ec0c50z';
			return expect(validator.validate(invalidHex, this.schema)).to.equal(
				false,
			);
		});

		it('should return true for valid hex value', function() {
			const validHex = 'ec0c50e';
			return expect(validator.validate(validHex, this.schema)).to.equal(true);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('publicKey', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'publicKey',
			};
			done();
		});

		it('should return false if value is not in hex format', function() {
			const invalidPublicKey =
				'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			return expect(validator.validate(invalidPublicKey, this.schema)).to.equal(
				false,
			);
		});

		it('should return false for value < 64', function() {
			const invalidLengthPublicKey =
				'c3595ff6041c3bd28b76b8cf75dce8225173d1241624ee89b50f2a8';
			return expect(
				validator.validate(invalidLengthPublicKey, this.schema),
			).to.equal(false);
		});

		it('should return false for value > 64', function() {
			const invalidLengthPublicKey =
				'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b123';
			return expect(
				validator.validate(invalidLengthPublicKey, this.schema),
			).to.equal(false);
		});

		it('should return true for valid publicKey', function() {
			const validPublicKey =
				'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b';
			return expect(validator.validate(validPublicKey, this.schema)).to.equal(
				true,
			);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('csv', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'csv',
			};
			done();
		});

		it('should return false for invalid csv value', function() {
			const invalidCsv = ['foo', 'bar'];
			return expect(validator.validate(invalidCsv, this.schema)).to.equal(
				false,
			);
		});

		it('should return true for valid csv value', function() {
			const validCsv = '1,2,3,4,5';
			return expect(validator.validate(validCsv, this.schema)).to.equal(true);
		});

		it('should return false for too many csv values', function() {
			const invalidCsv = `1${Array(1100).join(',1')}`;
			return expect(validator.validate(invalidCsv, this.schema)).to.equal(
				false,
			);
		});

		shouldReturnFalseForEmptyNonStringValues();
	});

	describe('signature', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'signature',
			};
			done();
		});

		it('should return false if value is not in hex format', function() {
			const invalidPublicKey =
				'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			return expect(validator.validate(invalidPublicKey, this.schema)).to.equal(
				false,
			);
		});

		it('should return false if value < 128', function() {
			const invalidLengthSignature =
				'3d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			return expect(
				validator.validate(invalidLengthSignature, this.schema),
			).to.equal(false);
		});

		it('should return false if value > 128', function() {
			const invalidLengthSignature =
				'1231d8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			return expect(
				validator.validate(invalidLengthSignature, this.schema),
			).to.equal(false);
		});

		it('should return true for valid publicKey', function() {
			const validSignature =
				'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			return expect(validator.validate(validSignature, this.schema)).to.equal(
				true,
			);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('queryList', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'queryList',
			};
			done();
		});

		it('should return false for non-object values', function() {
			const invalidData = ['xxx', 123, NaN, undefined, [1, 2], '', null];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for object values', function() {
			const validQueryList = { foo: 'bar' };
			return expect(validator.validate(validQueryList, this.schema)).to.equal(
				true,
			);
		});
	});

	describe('delegatesList', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'delegatesList',
			};
			done();
		});

		it('should return false for non-object values', function() {
			const invalidData = ['xxx', 123, NaN, undefined, [1, 2], '', null];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for object values', function() {
			const validDelegateList = { foo: 'bar' };
			return expect(
				validator.validate(validDelegateList, this.schema),
			).to.equal(true);
		});
	});

	describe('parsedInt', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'parsedInt',
			};
			done();
		});

		it('should return false for non-numeric values', function() {
			const invalidData = ['xxx', {}, NaN, undefined, [1, 2], null, 1.123];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for numeric values', function() {
			const validData = [123, '123', 0, '0'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
	});

	describe('os', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'os',
			};
			done();
		});

		it('should return false for invalid os value', function() {
			const invalidOs = 'atari!!!!';
			return expect(validator.validate(invalidOs, this.schema)).to.equal(false);
		});

		it('should return true for valid os value', function() {
			const validOs = 'linux_1';
			return expect(validator.validate(validOs, this.schema)).to.equal(true);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('version', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'version',
			};
			done();
		});

		it('should return false for invalid version value', function() {
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

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for valid version value', function() {
			const validData = [
				'1.1.1',
				'111.1.1',
				'11.11.22',
				'11.11.22-alpha.0',
				'11.11.22-beta.1',
				'11.11.22-rc.999',
				'1.0.0-beta.6.0',
			];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('protocolVersion', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'protocolVersion',
			};
			done();
		});

		it('should return false for invalid protocol version format', function() {
			const invalidData = [
				'1a.1',
				'-1.-1',
				'01.1',
				'1.1.1',
				'1.1.1-alpha.0',
				'1.01',
			];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for valid protocol version format', function() {
			const validData = ['1.0', '111.12', '11.11', '999.999', '999.0'];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('ipOrFQDN', () => {
		beforeEach(function(done) {
			this.schema = {
				format: 'ipOrFQDN',
			};
			done();
		});

		it('should return false if value is not an IP or not a FQDN', function() {
			const invalidData = ['192.168', 'alpha-', 'apha_server', 'alpha.server.'];

			return invalidData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true if value is an IP or a valid FQDN', function() {
			const validData = [
				'192.168.0.1',
				'127.0.0.1',
				'localhost',
				'app.server',
				'alpha.server.com',
				'8.8.8.8',
			];

			return validData.forEach(function(item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
	});
});
