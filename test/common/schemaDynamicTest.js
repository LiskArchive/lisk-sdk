'use strict';

var assign = require('lodash').assign;
var difference = require('lodash').difference;
var chai = require('chai');
var expect = require('chai').expect;
var util = require('util');

var typesRepresentatives = require('./typesRepresentatives');

var allTypes = typesRepresentatives.allTypes;
var arrays = typesRepresentatives.arrays;
var booleans = typesRepresentatives.booleans;
var positiveIntegers = typesRepresentatives.positiveIntegers;
var negativeIntegers = typesRepresentatives.negativeIntegers;
var positiveNumbers = typesRepresentatives.positiveNumbers;
var negativeNumbers = typesRepresentatives.negativeNumbers;
var objects = typesRepresentatives.objects;
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
				arguments: self.testArgument.bind(self, 'array', difference(allTypes, arrays)),
				property: self.testProperty.bind(self, 'array', difference(allTypes, arrays))
			},
			nonBoolean: {
				arguments: self.testArgument.bind(self, 'boolean', difference(allTypes, booleans)),
				property: self.testProperty.bind(self, 'boolean', difference(allTypes, booleans))
			},
			nonInteger: {
				arguments: self.testArgument.bind(self, 'integer', difference(allTypes, positiveIntegers.concat(negativeIntegers))),
				property: self.testProperty.bind(self, 'integer', difference(allTypes, positiveIntegers.concat(negativeIntegers)))
			},
			nonNumber: {
				arguments: self.testArgument.bind(self, 'number', difference(allTypes, positiveNumbers.concat(negativeNumbers))),
				property: self.testProperty.bind(self, 'number', difference(allTypes, positiveNumbers.concat(negativeNumbers)))
			},
			nonObject: {
				arguments: self.testArgument.bind(self, 'object', difference(allTypes, objects)),
				property: self.testProperty.bind(self, 'object', difference(allTypes, objects))
			},
			nonString: {
				arguments: self.testArgument.bind(self, 'string', difference(allTypes, strings)),
				property: self.testProperty.bind(self, 'string', difference(allTypes, strings))
			},
			positive: {
				nonInteger: {
					arguments: self.testArgument.bind(self, 'integer', difference(allTypes, positiveIntegers)),
					property: self.testProperty.bind(self, 'integer', difference(allTypes, positiveIntegers))
				},
				nonNumber: {
					arguments: self.testArgument.bind(self, 'number', difference(allTypes, positiveNumbers)),
					property: self.testProperty.bind(self, 'number', difference(allTypes, positiveNumbers))
				}
			},
			negative: {
				nonInteger: {
					arguments: self.testArgument.bind(self, 'integer', difference(allTypes, negativeIntegers)),
					property: self.testProperty.bind(self, 'integer', difference(allTypes, negativeIntegers))
				},
				nonNumber: {
					arguments: self.testArgument.bind(self, 'number', difference(allTypes, negativeNumbers)),
					property: self.testProperty.bind(self, 'number', difference(allTypes, negativeNumbers))
				}
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
