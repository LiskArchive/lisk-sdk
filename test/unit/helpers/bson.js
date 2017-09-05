'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var bson = require('../../../helpers/bson');

/**
 * Very simple test for the bson wrapper in the /helpers folder.
 */
describe('bson', function () {

	describe('quick check', function () {

		it('pass serializes and deserializes an object', function () {
			var result = bson.deserialize(
				bson.serialize(
					{ num: 200,  desc: 'silly things.'}
				));
			expect(result.num).eq(200);
			expect(result.desc).eq('silly things.');
		});
	});
});
