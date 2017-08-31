var ZSchema = require('../../../helpers/z_schema.js');
var schema = require('../../../schema/dapps.js');
var expect = require('chai').expect;

var validator = new ZSchema();

describe('dapp', function () {

	// TODO: Add tests for other dapps schemas
	describe.skip('put', function () {});
	describe.skip('get', function () {});
	describe.skip('list', function () {});
	describe.skip('addTransactions', function () {});
	describe.skip('sendWithdrawal', function () {});
	describe.skip('search', function () {});
	describe.skip('install', function () {});
	describe.skip('uninstall', function () {});
	describe.skip('stop', function () {});

	describe('launch', function () {
		var testBody;

		beforeEach(function () {
			testBody = {
				params: ['-x', 'localhost'],
				id: '1465651642158264047',
				master: 'pluto'
			};
		});

		it('should return error when params field is not an array', function () {
			testBody.params = '';
			validator.validate(testBody, schema.launch);
			expect(validator.getLastErrors().map(function (e) {
				return e.message;
			})).to.eql(['Expected type array but found type string']);
		});

		it('should return error when params field length is less than minimum length', function () {
			testBody.params = [];
			validator.validate(testBody, schema.launch);
			expect(validator.getLastErrors().map(function (e) {
				return e.message;
			})).to.eql(['Array is too short (0), minimum 1']);
		});

		it('should be ok when params field length valid', function () {
			validator.validate(testBody, schema.launch);
			expect(validator.getLastErrors()).to.not.exist;
		});
	});
});
