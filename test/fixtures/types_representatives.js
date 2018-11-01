/*
 * Copyright © 2018 Lisk Foundation
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

var faker = require('faker');
var difference = require('lodash').difference;

const { ADDITIONAL_DATA } = __testContext.config.constants;

var arrays = [
	{
		input: [],
		description: 'empty array',
		expectation: 'array',
	},
	{
		input: ['abc'],
		description: 'non empty array',
		expectation: 'array',
	},
];

var booleans = [
	{
		input: true,
		description: 'true',
		expectation: 'boolean',
	},
	{
		input: false,
		description: 'false',
		expectation: 'boolean',
	},
];

var positiveIntegers = [
	{
		input: 0,
		description: 'zero',
		expectation: 'integer',
	},
	{
		input: 1,
		description: 'integer',
		expectation: 'integer',
	},
];

var negativeIntegers = [
	{
		input: -1,
		description: 'negative integer',
		expectation: 'integer',
	},
];

var positiveNumbers = [
	{
		input: 0.1,
		description: 'float',
		expectation: 'number',
	},
	{
		input: Infinity,
		description: 'infinity',
		expectation: 'unknown-number',
	},
];

var negativeNumbers = [
	{
		input: -0.1,
		description: 'negative float',
		expectation: 'number',
	},
	{
		input: -Infinity,
		description: 'negative infinity',
		expectation: 'unknown-number',
	},
];

var objects = [
	{
		input: {},
		description: 'empty object',
		expectation: 'object',
	},
	{
		input: { abc: 'abc' },
		description: 'non empty object',
		expectation: 'object',
	},
	{
		input: new Date(),
		description: 'date',
		expectation: 'object',
	},
];

var others = [
	{
		input: NaN,
		description: 'Not a number',
		expectation: 'not-a-number',
	},
	{
		input: null,
		description: 'null',
		expectation: 'null',
	},
];

var nonEmptyStrings = [
	{
		input: '0',
		description: '0 as string',
		expectation: 'string',
	},
	{
		input: '1',
		description: 'string integer',
		expectation: 'string',
	},
	{
		input: '0.1',
		description: 'string number',
		expectation: 'string',
	},
	{
		input: 'abc',
		description: 'lowercase string',
		expectation: 'string',
	},
	{
		input: 'ABC',
		description: 'uppercase string',
		expectation: 'string',
	},
	{
		input: 'Abc',
		description: 'mixed case string',
		expectation: 'string',
	},
	{
		input: '!@#$%^&*()\\}{;\'"<>?/',
		description: 'special characters',
		expectation: 'string',
	},
	{
		input: faker.random.alphaNumeric(),
		description: 'alphanumeric',
		expectation: 'string',
	},
];

var emptyString = [
	{
		input: '',
		description: 'empty string',
		expectation: 'string',
	},
];

var additionalDataValidCases = [
	{
		input: faker.internet.email(),
		description: 'email',
		expectation: 'string',
	},
	{
		input: faker.internet.url(),
		description: 'URL',
		expectation: 'string',
	},
	{
		input: faker.internet.ip(),
		description: 'IP',
		expectation: 'string',
	},
	{
		input: faker.internet.mac(),
		description: 'MAC',
		expectation: 'string',
	},
	{
		input: faker.random.image(),
		description: 'image',
		expectation: 'string',
	},
	{
		input: faker.random.uuid(),
		description: 'uuid',
		expectation: 'string',
	},
	{
		input: faker.phone.phoneNumber(),
		description: 'phone number',
		expectation: 'string',
	},
	{
		input: faker.finance.iban(),
		description: 'iban',
		expectation: 'string',
	},
	{
		input: faker.random.alphaNumeric(ADDITIONAL_DATA.MAX_LENGTH),
		description: 'maximum chars',
		expectation: 'string',
	},
];

var additionalDataInvalidCases = [
	{
		input: `${faker.random.alphaNumeric(ADDITIONAL_DATA.MAX_LENGTH - 1)}现`,
		description: 'overflowed string',
		expectation: 'string',
	},
	{
		input: faker.random.alphaNumeric(ADDITIONAL_DATA.MAX_LENGTH + 1),
		description: 'maximum chars + 1',
		expectation: 'string',
	},
];

var strings = nonEmptyStrings.concat(emptyString);

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
	allTypes,
	arrays,
	nonArrays: difference(allTypes, arrays),
	booleans,
	nonBooleans: difference(allTypes, booleans),
	positiveIntegers,
	nonPositiveIntegers: difference(allTypes, positiveIntegers),
	negativeIntegers,
	nonNegativeIntegers: difference(allTypes, negativeIntegers),
	positiveNumbers,
	nonPositiveNumbers: difference(allTypes, positiveNumbers),
	negativeNumbers,
	nonNegativeNumbers: difference(allTypes, negativeNumbers),
	objects,
	nonObjects: difference(allTypes, objects),
	others,
	nonOthers: difference(allTypes, others),
	strings,
	nonStrings: difference(allTypes, strings),
	nonEmptyStrings,
	nonNonEmptyStrings: difference(allTypes, nonEmptyStrings),
	emptyString,
	nonEmptyString: difference(allTypes, emptyString),
	additionalDataValidCases,
	additionalDataInvalidCases,
};
