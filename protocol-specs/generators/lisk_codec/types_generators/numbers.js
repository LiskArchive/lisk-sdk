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

const { Number32, SignedNumber32, Number64, SignedNumber64 } = prepareProtobuffersNumbers();

const getNumberSchema = type => ({
	$id: `/numberSchema${type.replace(/^./, str => str.toUpperCase())}`,
	type: 'object',
	properties: {
		number: {
			dataType: type,
			fieldNumber: 1,
		},
	},
});

const number32Schema = getNumberSchema('uint32');
const number32 = { number: 10 };
const signedNumber32Schema = getNumberSchema('sint32');
const signedNumber32 = { number: -10 };
const number64Schema = getNumberSchema('uint64');
const number64 = { number: '372036854775807' };
const signedNumber64Schema = getNumberSchema('sint64');
const signedNumber64 = { number: '-9007199254740991' };

const numberEncoded32 = Number32.encode(number32).finish();
const signedNumberEncoded32 = SignedNumber32.encode(signedNumber32).finish();
const numberEncoded64 = Number64.encode(number64).finish();
const signedNumberEncoded64 = SignedNumber64.encode(signedNumber64).finish();

module.exports = {
	validNumberEncodingsTestCases: [
		{
			description: 'Encoding 32 bit unsigned number',
			input: { object: number32, schema: number32Schema },
			output: { value: numberEncoded32 },
		},
		{
			description: 'Encoding 32 bit signed number',
			input: { object: signedNumber32, schema: signedNumber32Schema },
			output: { value: signedNumberEncoded32 },
		},
		{
			description: 'Encoding 64 bit unsigned number',
			input: { object: { number: BigInt(number64.number) }, schema: number64Schema },
			output: { value: numberEncoded64 },
		},
		{
			description: 'Encoding 64 bit signed number',
			input: { object: { number: BigInt(signedNumber64.number) }, schema: signedNumber64Schema },
			output: { value: signedNumberEncoded64 },
		},
	],

	validNumberDecodingsTestCases: [
		{
			description: 'Decoding 32 bit unsigned number',
			input: { value: numberEncoded32, schema: number32Schema },
			output: { object: number32 },
		},
		{
			description: 'Decoding 32 bit signed number',
			input: { value: signedNumberEncoded32, schema: signedNumber32Schema },
			output: { object: signedNumber32 },
		},
		{
			description: 'Decoding 64 bit unsigned number',
			input: { value: numberEncoded64, schema: number64Schema },
			output: { object: { number: BigInt(number64.number) } },
		},
		{
			description: 'Decoding 64 bit signed number',
			input: { value: signedNumberEncoded64, schema: signedNumber64Schema },
			output: { object: { number: BigInt(signedNumber64.number) } },
		},
	],
};
