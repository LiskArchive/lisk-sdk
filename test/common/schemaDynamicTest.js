'use strict';

var assign = require('lodash').assign;
var async = require('async');
var chai = require('chai');
var expect = require('chai').expect;
require('it-each')({ testPerIteration: true });

var strings = [
	{
		input: '1',
		description: 'string integer',
		expectation: 'string'
	}
];

var numbers = [
	{
		input: 1,
		description: 'integer',
		expectation: 'integer'
	}
];

var objects = [
	{
		input: {},
		description: 'empty object',
		expectation: 'object'
	}
];

var arrays = [
	{
		input: [],
		description: 'empty array',
		expectation: 'array'
	}
];

var others = [
	{
		input: NaN,
		description: 'Not a number',
		expectation: 'not-a-number'
	}
];

var self;

function SchemaDynamicTest (config) {

	this.customInput = config.customInput;
	this.customArgumentAssertion = config.customArgumentAssertion;
	this.customPropertyAssertion = config.customPropertyAssertion;
	this.customRequiredPropertiesAssertion = config.customRequiredPropertiesAssertion;

	self = this;

	self.schema = {
		shouldFailAgainst: {
			nonArray: {
				arguments: self.testArgument.bind(self, 'array', numbers.concat(strings).concat(others).concat(objects)),
				property: self.testProperty.bind(self, 'array', numbers.concat(strings).concat(others).concat(objects))
			},
			nonInteger: {
				arguments: self.testArgument.bind(self, 'integer', objects.concat(strings).concat(others).concat(arrays)),
				property: self.testProperty.bind(self, 'integer', objects.concat(strings).concat(others).concat(arrays))
			},
			nonObject: {
				arguments: self.testArgument.bind(self, 'object', numbers.concat(strings).concat(others).concat(arrays)),
				property: self.testProperty.bind(self, 'object', numbers.concat(strings).concat(others).concat(arrays))
			},
			nonString: {
				arguments: self.testArgument.bind(self, 'string', numbers.concat(objects).concat(others).concat(arrays)),
				property: self.testProperty.bind(self, 'string', numbers.concat(objects).concat(others).concat(arrays))
			}
		},
		shouldFailWithoutRequiredProperties: self.testRequired
	};
}

SchemaDynamicTest.prototype.carpetTesting = function (test, inputs, description) {
	it.each(inputs, description, ['description'], test);
};

SchemaDynamicTest.prototype.standardInvalidArgumentAssertion = function (input, expectedType, err) {
	expect(err).to.be.an('array').and.to.have.nested.property('0.message')
		.equal('Expected type ' + expectedType + ' but found type ' + input.expectation);
};

SchemaDynamicTest.prototype.testArgument = function (expectedType, invalidInputs, testedFunction) {
	var assertion = self.customArgumentAssertion ?  self.customArgumentAssertion.bind(self) : self.standardInvalidArgumentAssertion;
	var test = function (invalidInput, eachCb) {
		testedFunction(invalidInput.input, function (err) {
			assertion(invalidInput, expectedType, err);
			eachCb();
		});
	};
	self.carpetTesting(test, invalidInputs, 'should return an error when invoked with %s');
};

SchemaDynamicTest.prototype.standardInvalidPropertyAssertion = function (input, expectedType, property, err) {
	self.standardInvalidArgumentAssertion(input, expectedType, err);
};

SchemaDynamicTest.prototype.testProperty = function (expectedType, invalidInputs, testedFunction, validArgument, property) {
	var assertion = self.customPropertyAssertion ?  self.customPropertyAssertion.bind(self) : self.standardInvalidPropertyAssertion;
	var test = function (invalidInput, eachCb) {
		var malformedPart = {};
		malformedPart[property] = invalidInput.input;
		var invalidArgument = assign({}, validArgument, malformedPart);
		testedFunction(invalidArgument, function (err) {
			assertion(invalidInput, expectedType, property, err);
			eachCb();
		});
	};
	self.carpetTesting(test, invalidInputs, 'should return an error when ' + property + ' is %s');
};

SchemaDynamicTest.prototype.standardMissingRequiredPropertiesAssertion = function (property, err) {
	expect(err).to.be.an('array').and.to.have.nested.property('0.message')
		.equal('Missing required property: ' + property);
};

SchemaDynamicTest.prototype.testRequired = function (testedFunction, validArgument, properties) {
	var assertion = self.customRequiredPropertiesAssertion ?  self.customRequiredPropertiesAssertion.bind(self) : self.standardMissingRequiredPropertiesAssertion;
	var test = function (missingProperty, eachCb) {
		var invalidArgument = assign({}, validArgument);
		delete invalidArgument[missingProperty.description];
		testedFunction(invalidArgument, function (err) {
			assertion(missingProperty.description, err);
			eachCb();
		});
	};
	var missingFieldsDescriptions = properties.map(function (property) {
		return {description: property};
	});
	self.carpetTesting(test, missingFieldsDescriptions, 'should return an error when invoked without %s');
};

module.exports = SchemaDynamicTest;
/*

********************************************
********************************************
********************************************
********************************************
********************************************
********************************************
********************************************
********************************************
********************************************
********************************************
********************************************
*/

//
// var myAsyncMock;
// var schemaDynamicTest;
//
// before(function () {
// 	var myArgumentMock = function (input, cb) {
// 		return cb([
// 			{
// 				message: 'Expected type object but found type string'
// 			}
// 		]);
// 	};
// 	myAsyncMock = myArgumentMock;
//
// 	schemaDynamicTest = new SchemaDynamicTest({
// 		customInput: 'shghdjasvhjasdjhvdasjhvads'
// 	});
//
// 	describe('schema', function () {
// 		schemaDynamicTest.schema.shouldFailAgainst.nonObject.arguments(myAsyncMock);
// 	});
//
// });

//
// describe('dupa', function () {
// });



//
//
//
//
// var myParameterMock = function (input, cb) {
// 	return cb([
// 		{
// 			message: 'Expected type string but found type string'
// 		}
// 	]);
// };
//
// schemaDynamicTest = new SchemaDynamicTest({
// 	testedFunction: myParameterMock
// });
//
// var myArg = {
// 	a: 'A'
// };
//
// schemaDynamicTest.schema.shouldFailAgainst.nonString.property(myParameterMock, myArg, 'a');
//
//
// var myMissingPropMock = function (input, cb) {
// 	return cb([
// 		{
// 			message: 'Missing required property: a'
// 		}
// 	]);
// };
//
// schemaDynamicTest = new SchemaDynamicTest({
// 	testedFunction: myMissingPropMock
// });
//
// var myArg = {
// 	a: 'A',
// 	b: 'B',
// 	c: 'c'
// };
//
// schemaDynamicTest.schema.shouldFailWithoutRequiredProperties(myMissingPropMock, myArg, ['a']);
