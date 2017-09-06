'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var bson = require('../../../helpers/bson');

describe('bson', function () {

	describe('quick check', function () {

		it('pass serializes and deserializes an object', function () {
			var originalObject = { num: 200,  desc: 'silly things.'};
			var result = bson.deserialize(
				bson.serialize(
					originalObject
				));
			expect(result).to.eql(originalObject);
		});
	});
});
