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

const {
	ArrayOfIntegers,
	ArrayBools,
	ArrayString,
	ArrayObjects,
} = prepareProtobuffersArrays();

const generateValidArrayEncodings = () => {
	const input = {
		ArrayOfIntegers: {
			object: {
				list: [3, 1, 4, 1, 5, 9, 2, 6, 5],
			},
			schema: {
				type: 'object',
				$id: 'arrayUint32',
				properties: {
					list: {
						type: 'array',
						items: {
							dataType: 'uint32',
						},
						fieldNumber: 1,
					},
				},
			},
		},
		arrayBools: {
			object: {
				list: [true, true, false, true, false, false],
			},
			schema: {
				type: 'object',
				$id: 'arrayBoolean',
				properties: {
					list: {
						type: 'array',
						items: {
							dataType: 'boolean',
						},
						fieldNumber: 1,
					},
				},
			},
		},
		arrayStrings: {
			object: {
				list: ['lisk', '', 'gogogog'],
			},
			schema: {
				type: 'object',
				properties: {
					list: {
						type: 'array',
						items: {
							dataType: 'string',
						},
						fieldNumber: 1,
					},
				},
			},
		},
		arrayObjects: {
			object: {
				myArray: [
					{
						address: 'e11a11364738225813f86ea85214400e5db08d6e',
						amount: 100000,
					},
					{
						address: 'aa2a11364738225813f86ea85214400e5db08fff',
						amount: 300000,
					},
				],
			},
			schema: {
				$id: 'arrayObject',
				type: 'object',
				properties: {
					myArray: {
						type: 'array',
						fieldNumber: 1,
						items: {
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
						},
					},
				},
			},
		},
		emptyArray: {
			object: {
				list: [],
			},
			schema: {
				type: 'object',
				$id: 'emptyArray',
				properties: {
					list: {
						type: 'array',
						items: {
							dataType: 'uint32',
						},
						fieldNumber: 1,
					},
				},
			},
		},
	};

	const arrayOfIntegersEncoded = ArrayOfIntegers.encode(
		input.ArrayOfIntegers.object,
	).finish();
	const arrayBoolsEncoded = ArrayBools.encode(input.arrayBools.object).finish();
	const arrayStringsEncoded = ArrayString.encode(
		input.arrayStrings.object,
	).finish();
	const arrayOfObjectsEncoded = ArrayObjects.encode(
		input.arrayObjects.object,
	).finish();
	const emptyArrayEncoded = ArrayBools.encode(input.emptyArray.object).finish();

	return {
		description: 'Encoding of array types',
		config: {
			network: 'devnet',
		},
		input: {
			arrayOfIntegers: input.ArrayOfIntegers,
			arrayBools: input.arrayBools,
			arrayStrings: input.arrayStrings,
			arrayOfObjects: input.arrayObjects,
			emptyArray: input.emptyArray,
		},
		output: {
			arrayOfIntegersEncoded: arrayOfIntegersEncoded.toString('hex'),
			arrayBoolsEncoded: arrayBoolsEncoded.toString('hex'),
			arrayStringsEncoded: arrayStringsEncoded.toString('hex'),
			arrayOfObjectsEncoded: arrayOfObjectsEncoded.toString('hex'),
			emptyArrayEncoded: emptyArrayEncoded.toString('hex'),
		},
	};
};

module.exports = generateValidArrayEncodings;
