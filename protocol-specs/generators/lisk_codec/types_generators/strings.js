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

const prepareProtobuffersStrings = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/strings.proto');

const { String } = prepareProtobuffersStrings();

const schema = {
	$id: '/stringSchema',
	type: 'object',
	properties: {
		data: {
			dataType: 'string',
			fieldNumber: 1,
		},
	},
};

const normal = { data: 'Checkout Lisk SDK!' };
const emptyString = { data: '' };
const symbols = { data: '€.ƒ.‰.Œ.£.©.®.µ.Æ.ü.ý.ø.Ç.¥.ß' };

const stringEncoded = String.encode(normal).finish();
const emptyStringEncoded = String.encode(emptyString).finish();
const symbolsStringEncoded = String.encode(symbols).finish();

module.exports = {
	validStringsEncodingTestCases: [
		{
			description: 'Encoding of string',
			input: { object: normal, schema },
			output: { value: stringEncoded },
		},
		{
			description: 'Encoding of empty string',
			input: { object: emptyString, schema },
			output: { value: emptyStringEncoded },
		},
		{
			description: 'Encoding of some utf symbols string',
			input: { object: symbols, schema },
			output: { value: symbolsStringEncoded },
		},
	],

	validStringsDecodingTestCases: [
		{
			description: 'Decoding of string',
			input: { value: stringEncoded, schema },
			output: { object: normal },
		},
		{
			description: 'Encoding of empty string',
			input: { value: emptyStringEncoded, schema },
			output: { object: emptyString },
		},
		{
			description: 'Encoding of some utf symbols string',
			input: { value: symbolsStringEncoded, schema },
			output: { object: symbols },
		},
	],
};
