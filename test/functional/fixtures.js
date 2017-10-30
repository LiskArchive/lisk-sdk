'use strict';

var node = require('../node');

var faker = require('faker');

var maximumString = node.randomString.generate(64);
var maximumStringPlus1 = node.randomString.generate(64 + 1);

var testCases = [
	{ describe: 'null', args: null, result: true },
	{ describe: 'undefined', args: undefined, result: true },
	{ describe: 'NaN', args: NaN, result: true },
	{ describe: 'Infinity', args: Infinity, result: false },
	{ describe: '0 integer', args: 0, result: true },
	{ describe: 'negative integer', args: -1, result: false },
	{ describe: 'float', args: 1.2, result: false },
	{ describe: 'negative float', args: -1.2, result: false },
	{ describe: 'date', args: faker.date.recent(), result: false },
	{ describe: 'true boolean', args: true, result: false },
	{ describe: 'false boolean', args: false, result: true },
	{ describe: 'empty array', args: [], result: false },
	{ describe: 'empty object', args: {}, result: false },
	{ describe: 'empty string', args: '', result: true },
	{ describe: '0 as string', args: '0', result: true },
	{ describe: 'regular string', args: String('abc'), result: true },
	{ describe: 'uppercase string', args: String('ABC'), result: true },
	{ describe: 'alphanumeric', args: faker.random.alphaNumeric(), result: true },
	{ describe: 'email', args: faker.internet.email(), result: true },
	{ describe: 'URL', args: faker.internet.url(), result: true },
	{ describe: 'image', args: faker.random.image(), result: true },
	{ describe: 'IP', args: faker.internet.ip(), result: true },
	{ describe: 'MAC', args: faker.internet.mac(), result: true },
	{ describe: 'uuid', args: faker.random.uuid(), result: true },
	{ describe: 'phone number', args: faker.phone.phoneNumber(), result: true },
	{ describe: 'iban', args: faker.finance.iban(), result: true },
	{ describe: 'maximum chars', args: maximumString, result: true },
	{ describe: 'maximum chars + 1', args: maximumStringPlus1, result: false }
];

module.exports = {
	testCases: testCases
};
