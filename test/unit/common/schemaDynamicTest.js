'use strict';

var _ = require('lodash');
var assign = _.assign;
var difference = _.difference;
var set = _.set;
var chai = require('chai');
var expect = require('chai').expect;
var util = require('util');

var typesRepresentatives = require('../../fixtures/typesRepresentatives');

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

SchemaDynamicTest.TEST_STYLE = {
	ASYNC: function (testFunction, argument, cb) {
		testFunction(argument, cb);
	},
	THROWABLE: function (testFunction, argument, cb) {
		try {
			testFunction(argument);
		} catch (ex) {
			cb(ex);
		}
	}
};

function SchemaDynamicTest (config) {

	this.customArgumentAssertion = config.customArgumentAssertion;
	this.customPropertyAssertion = config.customPropertyAssertion;
	this.customRequiredPropertiesAssertion = config.customRequiredPropertiesAssertion;
	this.testStyle = config.testStyle || SchemaDynamicTest.TEST_STYLE.ASYNC;

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
				arguments: self.testArgument.bind(self, 'integer', difference(allTypes, positiveIntegers.concat(negativeIntegers).concat(positiveNumbers).concat(negativeNumbers))),
				property: self.testProperty.bind(self, 'integer', difference(allTypes, positiveIntegers.concat(negativeIntegers).concat(positiveNumbers).concat(negativeNumbers)))
			},
			nonNumber: {
				arguments: self.testArgument.bind(self, 'number', difference(allTypes, positiveIntegers.concat(negativeIntegers).concat(positiveNumbers).concat(negativeNumbers))),
				property: self.testProperty.bind(self, 'number', difference(allTypes, positiveIntegers.concat(negativeIntegers).concat(positiveNumbers).concat(negativeNumbers)))
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
					arguments: self.testArgument.bind(self, 'integer', difference(allTypes, positiveIntegers.concat(positiveNumbers))),
					property: self.testProperty.bind(self, 'integer', difference(allTypes, positiveIntegers.concat(positiveNumbers)))
				},
				nonNumber: {
					arguments: self.testArgument.bind(self, 'number', difference(allTypes, positiveIntegers.concat(positiveIntegers))),
					property: self.testProperty.bind(self, 'number', difference(allTypes, positiveIntegers.concat(positiveIntegers)))
				}
			},
			negative: {
				nonInteger: {
					arguments: self.testArgument.bind(self, 'integer', difference(allTypes, negativeIntegers.concat(negativeNumbers))),
					property: self.testProperty.bind(self, 'integer', difference(allTypes, negativeIntegers.concat(negativeNumbers)))
				},
				nonNumber: {
					arguments: self.testArgument.bind(self, 'number', difference(allTypes, negativeNumbers.concat(negativeIntegers))),
					property: self.testProperty.bind(self, 'number', difference(allTypes, negativeNumbers.concat(negativeIntegers)))
				}
			}
		},
		shouldFailWithoutRequiredProperties: self.testRequired.bind(self)
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

SchemaDynamicTest.prototype.standardInvalidPropertyAssertion = function (input, expectedType, property, err) {
	self.standardInvalidArgumentAssertion(input, expectedType, err);
};

SchemaDynamicTest.prototype.testArgument = function (expectedType, invalidInputs, testedFunction) {
	var assertion = this.customArgumentAssertion || this.standardInvalidArgumentAssertion;
	var test = function (invalidInput, eachCb) {
		this.testStyle(testedFunction, invalidInput.input, function (err) {
			assertion(invalidInput, expectedType, err);
			eachCb();
		});
	}.bind(this);
	this.carpetTesting(test, invalidInputs, 'should return an error when invoked with %s');
};

SchemaDynamicTest.prototype.testProperty = function (expectedType, invalidInputs, testedFunction, validArgument, property) {
	var assertion = this.customPropertyAssertion || this.standardInvalidPropertyAssertion;
	var test = function (invalidInput, eachCb) {
		var malformedPart = {};
		set(malformedPart, property, invalidInput.input);

		var invalidArgument = assign({}, validArgument, malformedPart);
		this.testStyle(testedFunction, invalidArgument, function (err) {
			assertion(invalidInput, expectedType, property, err);
			eachCb();
		});
	}.bind(this);
	this.carpetTesting(test, invalidInputs, 'should return an error when ' + property + ' is %s');
};

SchemaDynamicTest.prototype.standardMissingRequiredPropertiesAssertion = function (property, err) {
	expect(err).to.be.an('array').and.to.have.nested.property('0.message')
		.equal('Missing required property: ' + property);
};

SchemaDynamicTest.prototype.testRequired = function (testedFunction, validArgument, properties) {
	var assertion = this.customRequiredPropertiesAssertion || this.standardMissingRequiredPropertiesAssertion;
	var test = function (missingProperty, eachCb) {
		var invalidArgument = assign({}, validArgument);
		delete invalidArgument[missingProperty.description];
		this.testStyle(testedFunction, invalidArgument, function (err) {
			assertion(missingProperty.description, err);
			eachCb();
		});
	}.bind(this);
	var missingFieldsDescriptions = properties.map(function (property) {
		return {description: property};
	});
	this.carpetTesting(test, missingFieldsDescriptions, 'should return an error when invoked without %s');
};

module.exports = SchemaDynamicTest;
