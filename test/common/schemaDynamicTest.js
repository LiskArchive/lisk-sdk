'use strict';

var assign = require('lodash').assign;
var chai = require('chai');
var expect = require('chai').expect;
var util = require('util');

var typesRepresentatives = require('./typesRepresentatives');

var arrays = typesRepresentatives.arrays;
var booleans = typesRepresentatives.booleans;
var integers = typesRepresentatives.integers;
var numbers = typesRepresentatives.numbers;
var objects = typesRepresentatives.objects;
var others = typesRepresentatives.others;
var strings = typesRepresentatives.strings;

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
				arguments: self.testArgument.bind(self, 'array', booleans.concat(integers).concat(numbers).concat(objects).concat(others).concat(strings)),
				property: self.testProperty.bind(self, 'array', booleans.concat(integers).concat(numbers).concat(objects).concat(others).concat(strings))
			},
			nonBoolean: {
				arguments: self.testArgument.bind(self, 'boolean', arrays.concat(integers).concat(numbers).concat(objects).concat(others).concat(strings)),
				property: self.testProperty.bind(self, 'boolean', arrays.concat(integers).concat(numbers).concat(objects).concat(others).concat(strings))
			},
			nonInteger: {
				arguments: self.testArgument.bind(self, 'integer', arrays.concat(booleans).concat(numbers).concat(objects).concat(others).concat(strings)),
				property: self.testProperty.bind(self, 'integer', arrays.concat(booleans).concat(numbers).concat(objects).concat(others).concat(strings))
			},
			nonNumber: {
				arguments: self.testArgument.bind(self, 'number', arrays.concat(booleans).concat(integers).concat(objects).concat(others).concat(strings)),
				property: self.testProperty.bind(self, 'number', arrays.concat(booleans).concat(integers).concat(objects).concat(others).concat(strings))
			},
			nonObject: {
				arguments: self.testArgument.bind(self, 'object', arrays.concat(booleans).concat(integers).concat(numbers).concat(others).concat(strings)),
				property: self.testProperty.bind(self, 'object', arrays.concat(booleans).concat(integers).concat(numbers).concat(others).concat(strings))
			},
			nonString: {
				arguments: self.testArgument.bind(self, 'string', arrays.concat(booleans).concat(integers).concat(numbers).concat(objects).concat(others)),
				property: self.testProperty.bind(self, 'string', arrays.concat(booleans).concat(integers).concat(numbers).concat(objects).concat(others))
			}
		},
		shouldFailWithoutRequiredProperties: self.testRequired
	};
}

SchemaDynamicTest.prototype.carpetTesting = function (test, inputs, description) {
	inputs.forEach(function (input) {
		it(util.format(description, input.description), function (done) {
			test(input, done);
		});
	});
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
