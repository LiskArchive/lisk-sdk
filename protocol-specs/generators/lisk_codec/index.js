/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

const { Number32, SignedNumber32, Number64, SignedNumber64 } = prepareProtobuffersNumbers();

const { Boolean } = prepareProtobuffersBooleans();


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
				number: -223372036854775807,
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
			messageSigned32: input.message32,
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


module.exports = BaseGenerator.runGenerator(
	'lisk_codec',
	[
		validNumberEncodingsSuite,
		validBooleanEncodingsSuite,
	],
);
