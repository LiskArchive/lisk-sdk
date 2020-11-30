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

const generateValidStringEncodings = () => {
	const input = {
		string: {
			object: {
				data: 'Checkout Lisk SDK!',
			},
			schema: {
				$id: 'object7',
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
				$id: 'object8',
				type: 'object',
				properties: {
					data: {
						dataType: 'string',
						fieldNumber: 1,
					},
				},
			},
		},
		symbols: {
			object: {
				data: '€.ƒ.‰.Œ.£.©.®.µ.Æ.ü.ý.ø.Ç.¥.ß',
			},
			schema: {
				$id: 'object8',
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
	const symbolsStringEncoded = String.encode(input.symbols.object).finish();

	return [
		{
			description: 'Encoding of string',
			input: input.string,
			output: { value: stringEncoded.toString('hex') },
		},
		{
			description: 'Encoding of empty string',
			input: input.emptyString,
			output: { value: emptyStringEncoded.toString('hex') },
		},
		{
			description: 'Encoding of some utf symbols string',
			input: input.symbols,
			output: { value: symbolsStringEncoded.toString('hex') },
		},
	];
};

module.exports = generateValidStringEncodings;
