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
	$id: 'string-schema',
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

const generateValidStringEncodings = () => [
	{
		description: 'Encoding of string',
		input: { object: normal, schema },
		output: stringEncoded.toString('hex'),
	},
	{
		description: 'Encoding of empty string',
		input: { object: emptyString, schema },
		output: emptyStringEncoded.toString('hex'),
	},
	{
		description: 'Encoding of some utf symbols string',
		input: { object: symbols, schema },
		output: symbolsStringEncoded.toString('hex'),
	},
];

const generateValidStringDecodings = () => [
	{
		description: 'Decoding of string',
		input: { object: stringEncoded.toString('hex'), schema },
		output: normal,
	},
	{
		description: 'Encoding of empty string',
		input: { object: emptyStringEncoded.toString('hex'), schema },
		output: emptyString,
	},
	{
		description: 'Encoding of some utf symbols string',
		input: { object: symbolsStringEncoded.toString('hex'), schema },
		output: symbols,
	},
];

module.exports = { generateValidStringEncodings, generateValidStringDecodings };
