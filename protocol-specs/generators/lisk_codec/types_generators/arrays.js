/*
 * Copyright © 2020 Lisk Foundation
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

const protobuf = require('protobufjs');

const prepareProtobuffersArrays = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/arrays.proto');

const { ArrayOfIntegers, ArrayBools, ArrayString, ArrayObjects } = prepareProtobuffersArrays();

const getArraySchemaFor = type => ({
	type: 'object',
	$id: `/arraySchema${(typeof type === 'string' ? type : typeof type).replace(/^./, str =>
		str.toUpperCase(),
	)}`,
	properties: {
		list: {
			type: 'array',
			items:
				typeof type === 'object'
					? type
					: {
							dataType: type,
							// eslint-disable-next-line no-mixed-spaces-and-tabs
					  },
			fieldNumber: 1,
		},
	},
});

const integerSchema = getArraySchemaFor('uint32');
const arrayOfIntegers = { list: [3, 1, 4, 1, 5, 9, 2, 6, 5] };
const emptyArray = {
	list: [],
};
const arrayOfIntegersEncoded = ArrayOfIntegers.encode(arrayOfIntegers).finish();
const emptyArrayEncoded = ArrayOfIntegers.encode(emptyArray).finish();

const booleanSchema = getArraySchemaFor('boolean');
const arrayOfBooleans = { list: [true, true, false, true, false, false] };
const arrayBoolsEncoded = ArrayBools.encode(arrayOfBooleans).finish();

const stringSchema = getArraySchemaFor('string');
const arrayOfStrings = { list: ['lisk', '', 'gogogog'] };
const arrayStringsEncoded = ArrayString.encode(arrayOfStrings).finish();

const objectSchema = getArraySchemaFor({
	type: 'object',
	properties: {
		address: {
			dataType: 'string',
			fieldNumber: 1,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
	},
});
const arrayOfObjects = {
	list: [
		{
			address: 'e11a11364738225813f86ea85214400e5db08d6e',
			amount: '100000',
		},
		{
			address: 'aa2a11364738225813f86ea85214400e5db08fff',
			amount: '300000',
		},
	],
};
const arrayOfObjectsEncoded = ArrayObjects.encode(arrayOfObjects).finish();

module.exports = {
	validArrayEncodingsTestCases: [
		{
			description: 'Encoding of integers array',
			input: { object: arrayOfIntegers, schema: integerSchema },
			output: { value: arrayOfIntegersEncoded },
		},
		{
			description: 'Encoding of booleans array',
			input: { object: arrayOfBooleans, schema: booleanSchema },
			output: { value: arrayBoolsEncoded },
		},
		{
			description: 'arrayStrings of strings array',
			input: { object: arrayOfStrings, schema: stringSchema },
			output: { value: arrayStringsEncoded },
		},
		{
			description: 'Encoding of objects array',
			input: { object: arrayOfObjects, schema: objectSchema },
			output: { value: arrayOfObjectsEncoded },
		},
		{
			description: 'Encoding of empty array',
			input: { object: emptyArray, schema: integerSchema },
			output: { value: emptyArrayEncoded },
		},
	],
	validArrayDecodingsTestCases: [
		{
			description: 'Decoding of integers array',
			input: { value: arrayOfIntegersEncoded, schema: integerSchema },
			output: { object: arrayOfIntegers },
		},
		{
			description: 'Decoding of booleans array',
			input: { value: arrayBoolsEncoded, schema: booleanSchema },
			output: { object: arrayOfBooleans },
		},
		{
			description: 'Decoding of strings array',
			input: { value: arrayStringsEncoded, schema: stringSchema },
			output: { object: arrayOfStrings },
		},
		{
			description: 'Decoding of objects array',
			input: { value: arrayOfObjectsEncoded, schema: objectSchema },
			output: { object: arrayOfObjects },
		},
		{
			description: 'Decoding of empty array',
			input: { value: emptyArrayEncoded, schema: integerSchema },
			output: { object: emptyArray },
		},
	],
};
