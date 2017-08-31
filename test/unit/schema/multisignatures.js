var node = require('../../node.js');

var ZSchema = require('../../../helpers/z_schema.js');
var schema = require('../../../schema/multisignatures.js');
var expect = require('chai').expect;

var validator = new ZSchema();

describe('multisignatures', function () {

	// TODO: Add tests for other multisignature schemas
	describe('getAccounts', function () {
		it('tests for schema');
	});

	describe('pending', function () {
		it('tests for schema');
	});

	describe('sign', function () {
		it('tests for schema');
	});

	describe('addMultisignatures', function () {
		var testBody;

		beforeEach(function () {
			var secret = node.randomPassword();
			testBody = {
				secret: secret,
				publicKey: node.lisk.crypto.getKeys(secret).publicKey,
				min: 2,
				lifetime: 1,
				keysgroup: Array.apply(null, Array(4)).map(function () { return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;})
			};
		});

		describe('min', function () {

			it('should return error when min is not an integer', function () {
				testBody.min = '';
				validator.validate(testBody, schema.addMultisignature);
				expect(validator.getLastErrors().map(function (e) {
					return e.message;
				})).to.eql(['Expected type integer but found type string']);
			});

			it('should return error when min value is less than acceptable value', function () {
				testBody.min = 0;
				validator.validate(testBody, schema.addMultisignature);
				expect(validator.getLastErrors().map(function (e) {
					return e.message;
				})).to.eql(['Value 0 is less than minimum 1']);
			});

			it('should return error when min value is greater than acceptable value', function () {
				testBody.min = 16;
				validator.validate(testBody, schema.addMultisignature);
				expect(validator.getLastErrors().map(function (e) {
					return e.message;
				})).to.eql(['Value 16 is greater than maximum 15']);
			});
		});

		describe('keysgroup', function () {

			it('should return error when keysgroup is not an array', function () {
				testBody.keysgroup = '';
				validator.validate(testBody, schema.addMultisignature);
				expect(validator.getLastErrors().map(function (e) {
					return e.message;
				})).to.eql(['Expected type array but found type string']);
			});

			it('should return error when keysgroup length is less than minimum acceptable length', function () {
				testBody.keysgroup = [];
				validator.validate(testBody, schema.addMultisignature);
				expect(validator.getLastErrors().map(function (e) {
					return e.message;
				})).to.eql(['Array is too short (0), minimum 1']);
			});

			it('should return error when keysgroup length is greater than maximum acceptable length', function () {
				testBody.keysgroup = Array.apply(null, Array(16)).map(function () { return node.lisk.crypto.getKeys(node.randomPassword()).publicKey; });
				validator.validate(testBody, schema.addMultisignature);
				expect(validator.getLastErrors().map(function (e) {
					return e.message;
				})).to.eql(['Array is too long (16), maximum 15']);
			});
		});

		it('should be ok when params field length valid', function () {
			validator.validate(testBody, schema.addMultisignature);
			expect(validator.getLastErrors()).to.not.exist;
		});
	});
});
