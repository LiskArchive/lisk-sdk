'use strict';

var arrays = [
	{
		input: [],
		description: 'empty array',
		expectation: 'array'
	},
	{
		input: ['abc'],
		description: 'non empty array',
		expectation: 'array'
	}
];

var booleans = [
	{
		input: true,
		description: 'true',
		expectation: 'boolean'
	},
	{
		input: false,
		description: 'false',
		expectation: 'boolean'
	}
];

var positiveIntegers = [
	{
		input: 0,
		description: 'zero',
		expectation: 'integer'
	},
	{
		input: 1,
		description: 'integer',
		expectation: 'integer'
	}
];

var negativeIntegers = [
	{
		input: -1,
		description: 'negative integer',
		expectation: 'integer'
	}
];

var positiveNumbers = [
	{
		input: 0.1,
		description: 'float',
		expectation: 'number'
	},
	{
		input: Infinity,
		description: 'infinity',
		expectation: 'unknown-number'
	}
];

var negativeNumbers = [
	{
		input: -0.1,
		description: 'negative float',
		expectation: 'number'
	},
	{
		input: -Infinity,
		description: 'negative infinity',
		expectation: 'unknown-number'
	}
];

var objects = [
	{
		input: {},
		description: 'empty object',
		expectation: 'object'
	},
	{
		input: {abc: 'abc'},
		description: 'non empty object',
		expectation: 'object'
	},
	{
		input: new Date(),
		description: 'date',
		expectation: 'object'
	}
];

var others = [
	{
		input: NaN,
		description: 'Not a number',
		expectation: 'not-a-number'
	},
	{
		input: null,
		description: 'null',
		expectation: 'null'
	}
];

var strings = [
	{
		input: '',
		description: 'empty string',
		expectation: 'string'
	},
	{
		input: '0',
		description: '0 as string',
		expectation: 'string'
	},
	{
		input: '1',
		description: 'string integer',
		expectation: 'string'
	},
	{
		input: '0.1',
		description: 'string number',
		expectation: 'string'
	},
	{
		input: 'abc',
		description: 'lowercase string',
		expectation: 'string'
	},
	{
		input: 'ABC',
		description: 'uppercase string',
		expectation: 'string'
	},
	{
		input: 'Abc',
		description: 'mixed case string',
		expectation: 'string'
	},
	{
		input: '!@#$%^&*()\\}{;\'"<>?/',
		description: 'special characters',
		expectation: 'string'
	}
];

var allTypes = arrays
	.concat(booleans)
	.concat(positiveIntegers)
	.concat(negativeIntegers)
	.concat(positiveNumbers)
	.concat(negativeNumbers)
	.concat(objects)
	.concat(others)
	.concat(strings);

module.exports = {
	allTypes: allTypes,
	arrays: arrays,
	booleans: booleans,
	positiveIntegers: positiveIntegers,
	negativeIntegers: negativeIntegers,
	positiveNumbers: positiveNumbers,
	negativeNumbers: negativeNumbers,
	objects: objects,
	others: others,
	strings: strings
};
