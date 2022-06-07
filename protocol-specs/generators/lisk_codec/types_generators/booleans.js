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

const schema = {
	$id: '/object5',
	type: 'object',
	properties: {
		state: {
			dataType: 'boolean',
			fieldNumber: 1,
		},
	},
};

const booleanTrueEncoded = Boolean.encode({ state: true }).finish();
const booleanFalseEncoded = Boolean.encode({ state: false }).finish();

module.exports = {
	validBooleanEncodingsTestCases: [
		{
			description: 'Encoding of boolean with value true',
			input: { object: { state: true }, schema },
			output: { value: booleanTrueEncoded },
		},
		{
			description: 'Encoding of boolean with value false',
			input: { object: { state: false }, schema },
			output: { value: booleanFalseEncoded },
		},
	],
	validBooleanDecodingsTestCases: [
		{
			description: 'Decoding of boolean with value true',
			input: { value: booleanTrueEncoded, schema },
			output: { object: { state: true } },
		},
		{
			description: 'Decoding of boolean with value false',
			input: { value: booleanFalseEncoded, schema },
			output: { object: { state: false } },
		},
	],
};
