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

'use strict';

const protobuf = require('protobufjs');
const BaseGenerator = require('../base_generator');


const prepareProtobuffersNumbers = () => protobuf.loadSync('./generators/lisk_codec/proto_files/numbers.proto');
const prepareProtobuffersBooleans = () => protobuf.loadSync('./generators/lisk_codec/proto_files/booleans.proto');
const prepareProtobuffersStrings = () => protobuf.loadSync('./generators/lisk_codec/proto_files/strings.proto');
const prepareProtobuffersBytes = () => protobuf.loadSync('./generators/lisk_codec/proto_files/bytes.proto');
const prepareProtobuffersObjects = () => protobuf.loadSync('./generators/lisk_codec/proto_files/object.proto');
const prepareProtobuffersArrays = () => protobuf.loadSync('./generators/lisk_codec/proto_files/arrays.proto');

const { Number32, SignedNumber32, Number64, SignedNumber64 } = prepareProtobuffersNumbers();
const { Boolean } = prepareProtobuffersBooleans();
const { String } = prepareProtobuffersStrings();
const { Bytes } = prepareProtobuffersBytes();
const { Objects, ObjectWithOptionalProp } = prepareProtobuffersObjects();
const { ArrayOfIntegers, ArrayBools, ArrayObjects } = prepareProtobuffersArrays();

const generateValidNumberEncodings = () => {
	const input = {
		message32: {
			object: {
				number: 10,
			},
			schema: {
					type: 'object',
					properties: {
						number: {
							dataType: 'uint32',
							fieldNumber: 1,
						},
					},
			},
		},
		messageSigned32: {
			object: {
				number: -10,
			},
			schema: {
				type: 'object',
				properties: {
					number: {
						dataType: 'sint32',
						fieldNumber: 1,
					},
				},
			},
		},
		message64: {
			object: {
				number: 372036854775807,
			},
			schema: {
				type: 'object',
				properties: {
					number: {
						dataType: 'uint64',
						fieldNumber: 1,
					},
				},
			},
		},
		messageSigned64: {
			object: {
				number: -9007199254740991,
			},
			schema: {
				type: 'object',
				properties: {
					number: {
						dataType: 'sint64',
						fieldNumber: 1,
					},
				},
			},
		},
	};


	const numberEncoded32 = Number32.encode(input.message32.object).finish();
	const signedNumberEncoded32 = SignedNumber32.encode(input.messageSigned32.object).finish();
	const numberEncoded64 = Number64.encode(input.message64.object).finish();
	const signedNumberEncoded64 = SignedNumber64.encode(input.messageSigned64.object).finish();

	return {
		description: 'Encoding of numeric types',
		config: {
			network: 'devnet',
		},
		input: {
			message32: input.message32,
			messageSigned32: input.messageSigned32,
			message64: input.message64,
			messageSigned64: input.messageSigned64,
		},
		output: {
			numberEncoded32: numberEncoded32.toString('hex'),
			signedNumberEncoded32: signedNumberEncoded32.toString('hex'),
			numberEncoded64: numberEncoded64.toString('hex'),
			signedNumberEncoded64: signedNumberEncoded64.toString('hex'),
		},
	};
};

const generateValidBooleanEncodings = () => {
	const input = {
		booleanTrue: {
			object: {
				state: true,
			},
			schema: {
				type: 'object',
				properties: {
					state: {
						dataType: 'boolean',
						fieldNumber: 1,
					},
				},
			},
		},
		booleanFalse: {
			object: {
				state: false,
			},
			schema: {
				type: 'object',
				properties: {
					state: {
						dataType: 'boolean',
						fieldNumber: 1,
					},
				},
			},
		},
	};

	const booleanTrueEncoded = Boolean.encode(input.booleanTrue.object).finish();
	const booleanFalseEncoded = Boolean.encode(input.booleanFalse.object).finish();

	return {
		description: 'Encoding of boolean types',
		config: {
			network: 'devnet',
		},
		input: {
			booleanTrue: input.booleanTrue,
			booleanFalse: input.booleanFalse,
		},
		output: {
			booleanTrue: booleanTrueEncoded.toString('hex'),
			booleanFalse: booleanFalseEncoded.toString('hex'),
		},
	};
};

const generateValidStringEncodings = () => {
	const input = {
		string: {
			object: {
				data: 'Checkout Lisk SDK!',
			},
			schema: {
				type: 'object',
				properties: {
					data: {
						dataType: 'string',
						fieldNumber: 1,
					},
				},
			},
		},
		emptyString: {
			object: {
				data: '',
			},
			schema: {
				type: 'object',
				properties: {
					data: {
						dataType: 'string',
						fieldNumber: 1,
					},
				},
			},
		},
	};

	const stringEncoded = String.encode(input.string.object).finish();
	const emptyStringEncoded = String.encode(input.emptyString.object).finish();

	return {
		description: 'Encoding of string types',
		config: {
			network: 'devnet',
		},
		input: {
			string: input.string,
			emptyString: input.emptyString,
		},
		output: {
			string: stringEncoded.toString('hex'),
			emptyString: emptyStringEncoded.toString('hex'),
		},
	};
};


const generateValidBytesEncodings = () => {
	const input = {
		bytes: {
			object: {
				address: Buffer.from('e11a11364738225813f86ea85214400e5db08d6e', 'hex'),
			},
			schema: {
				type: 'object',
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
				},
			},
		},
		emptyBytes: {
			object: {
				address: Buffer.from(''),
			},
			schema: {
				type: 'object',
				properties: {
					data: {
						dataType: 'string',
						fieldNumber: 1,
					},
				},
			},
		},
	};

	const bytesEncoded = Bytes.encode(input.bytes.object).finish();
	const emptyBytesEncoded = Bytes.encode(input.emptyBytes.object).finish();

	return {
		description: 'Encoding of bytes types',
		config: {
			network: 'devnet',
		},
		input: {
			bytes: input.bytes,
			emptyBytes: input.emptyBytes,
		},
		output: {
			bytes: bytesEncoded.toString('hex'),
			emptyBytes: emptyBytesEncoded.toString('hex'),
		},
	};
};

const generateValidObjectEncodings = () => {
	const object = {
		address: Buffer.from('e11a11364738225813f86ea85214400e5db08d6e', 'hex'),
		balance: 10000000,
		isDelegate: true,
		name: 'delegate',
		asset: {
			data: 'Check out the Lisk SDK now in binary!',
		},
	};

	const input = {
		object: {
			object,
			schema: {
				type: 'object',
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					balance: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					isDelegate: {
						dataType: 'boolean',
						fieldNumber: 3,
					},
					name: {
						dataType: 'string',
						fieldNumber: 4,
					},
					asset: {
						type: 'object',
						fieldNumber: 5,
						properties: {
							data: {
								dataType: 'string',
								fieldNumber: 1,
							},
						},
					},
				},
			},
		},
		objectOptionalProp: {
			object: {
				isActive: true,
				value: 1,
			},
			schema: {
				type: 'object',
				properties: {
					isActive: {
						dataType: 'boolean',
						fieldNumber: 1,
					},
					balance: {
						data: 'bytes',
						fieldNumber: 2,
					},
					value: {
						dataType: 'uint64',
						fieldNumber: 3,
					},
				},
			},
		},
	};

	const objectEncoded = Objects.encode(input.object.object).finish();
	const objectOptionalPropEncoded = ObjectWithOptionalProp.encode(input.objectOptionalProp.object).finish();

	return {
		description: 'Encoding of object types',
		config: {
			network: 'devnet',
		},
		input: {
			object: input.object,
			objectWithOptionalProp: input.objectOptionalProp,
		},
		output: {
			object: objectEncoded.toString('hex'),
			objectWithOptionalProp: objectOptionalPropEncoded.toString('hex'),
		},
	};
};


const generateValidArrayEncodings = () => {
	const input = {
		ArrayOfIntegers: {
			object: {
				list: [3, 1, 4, 1, 5, 9, 2, 6, 5],
			},
			schema: {
				type: 'object',
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
				properties: {
					list: {
						type: 'array',
						items: {
							dataType: 'bool',
						},
						fieldNumber: 1,
					},
				},
			},
		},
		arrayObjects: {
			object: {
				myArray: [
					{ address: 'e11a11364738225813f86ea85214400e5db08d6e', amount: 100000 },
					{ address: 'aa2a11364738225813f86ea85214400e5db08fff', amount: 300000 },
				],
			},
			schema: {
				schema: {
					type: 'object',
					properties: {
						list: {
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
		},
		emptyArray: {
			object: {
				list: [],
			},
			schema: {
				type: 'object',
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

	const ArrayOfIntegersEncoded = ArrayOfIntegers.encode(input.ArrayOfIntegers.object).finish();
	const arrayBoolsEncoded = ArrayBools.encode(input.arrayBools.object).finish();
	const arrayOfObjectsEncoded = ArrayObjects.encode(input.arrayObjects.object).finish();
	const emptyArrayEncoded = ArrayBools.encode(input.emptyArray.object).finish();

	return {
		description: 'Encoding of array types',
		config: {
			network: 'devnet',
		},
		input: {
			ArrayOfIntegers: input.ArrayOfIntegers,
			arrayBools: input.arrayBools,
			arrayOfObjects: input.arrayObjects,
			emptyArray: input.emptyArray,
		},
		output: {
			arrayOfIntegersEncoded: ArrayOfIntegersEncoded.toString('hex'),
			arrayBoolsEncoded: arrayBoolsEncoded.toString('hex'),
			arrayOfObjectsEncoded: arrayOfObjectsEncoded.toString('hex'),
			emptyArrayEncoded: emptyArrayEncoded.toString('hex'),
		},
	};
};


const validNumberEncodingsSuite = () => ({
	title: 'Valid number encodings',
	summary: 'Examples of encoding numbers as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validNumberEncodings',
	testCases: [generateValidNumberEncodings()],
});

const validBooleanEncodingsSuite = () => ({
	title: 'Valid boolean encodings',
	summary: 'Examples of encoding booleans as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validBooleanEncodings',
	testCases: [generateValidBooleanEncodings()],
});

const validStringEncodingsSuite = () => ({
	title: 'Valid string encodings',
	summary: 'Examples of encoding strings as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validStringEncodings',
	testCases: [generateValidStringEncodings()],
});

const validBytesEncodingsSuite = () => ({
	title: 'Valid bytes encodings',
	summary: 'Examples of encoding bytes as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validBytesEncodings',
	testCases: [generateValidBytesEncodings()],
});

const validObjectEncodingsSuite = () => ({
	title: 'Valid object encodings',
	summary: 'Examples of encoding objects as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validObjectEncodings',
	testCases: [generateValidObjectEncodings()],
});

const validArrayEncodingsSuite = () => ({
	title: 'Valid array encodings',
	summary: 'Examples of encoding arrays as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validArrayEncodings',
	testCases: [generateValidArrayEncodings()],
});


module.exports = BaseGenerator.runGenerator(
	'lisk_codec',
	[
		validNumberEncodingsSuite,
		validBooleanEncodingsSuite,
		validStringEncodingsSuite,
		validBytesEncodingsSuite,
		validObjectEncodingsSuite,
		validArrayEncodingsSuite,
	],
);
