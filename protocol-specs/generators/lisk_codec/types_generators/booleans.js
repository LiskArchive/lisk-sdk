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

const prepareProtobuffersBooleans = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/booleans.proto');
const { Boolean } = prepareProtobuffersBooleans();

const generateValidBooleanEncodings = () => {
	const input = {
		booleanTrue: {
			object: {
				state: true,
			},
			schema: {
				$id: 'object5',
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
				$id: 'object6',
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
	const booleanFalseEncoded = Boolean.encode(
		input.booleanFalse.object,
	).finish();

	return [
		{
			description: 'Encoding of boolean with value true',
			input: input.booleanTrue,
			output: { value: booleanTrueEncoded.toString('hex') },
		},
		{
			description: 'Encoding of boolean with value false',
			input: input.booleanFalse,
			output: { value: booleanFalseEncoded.toString('hex') },
		},
	];
};

module.exports = generateValidBooleanEncodings;
