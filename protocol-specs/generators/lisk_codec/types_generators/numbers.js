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

const prepareProtobuffersNumbers = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/numbers.proto');

const {
	Number32,
	SignedNumber32,
	Number64,
	SignedNumber64,
} = prepareProtobuffersNumbers();

const generateValidNumberEncodings = () => {
	const input = {
		message32: {
			object: {
				number: 10,
			},
			schema: {
				$id: 'object1',
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
				$id: 'object2',
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
				$id: 'object3',
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
				$id: 'object4',
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
	const signedNumberEncoded32 = SignedNumber32.encode(
		input.messageSigned32.object,
	).finish();
	const numberEncoded64 = Number64.encode(input.message64.object).finish();
	const signedNumberEncoded64 = SignedNumber64.encode(
		input.messageSigned64.object,
	).finish();

	return [
		{
			description: 'Encoding 32 bit unsigned number',
			input: input.message32,
			output: { value: numberEncoded32.toString('hex') },
		},
		{
			description: 'Encoding 32 bit signed number',
			input: input.messageSigned32,
			output: { value: signedNumberEncoded32.toString('hex') },
		},
		{
			description: 'Encoding 64 bit unsigned number',
			input: input.message64,
			output: { value: numberEncoded64.toString('hex') },
		},
		{
			description: 'Encoding 64 bit signed number',
			input: input.messageSigned64,
			output: { value: signedNumberEncoded64.toString('hex') },
		},
	];
};

module.exports = generateValidNumberEncodings;
