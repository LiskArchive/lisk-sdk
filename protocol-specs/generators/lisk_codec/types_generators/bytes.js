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

const prepareProtobuffersBytes = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/bytes.proto');

const { Bytes } = prepareProtobuffersBytes();

const schema = {
	$id: '/object9',
	type: 'object',
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};

const bytes = {
	address: Buffer.from('e11a11364738225813f86ea85214400e5db08d6e', 'hex'),
};

const emptyBytes = {
	address: Buffer.from(''),
};

const bytesEncoded = Bytes.encode(bytes).finish();
const emptyBytesEncoded = Bytes.encode(emptyBytes).finish();

module.exports = {
	validBytesEncodingsTestCases: [
		{
			description: 'Encoding of chunk of bytes',
			input: { object: bytes, schema },
			output: { value: bytesEncoded },
		},
		{
			description: 'Encoding of empty bytes',
			input: { object: emptyBytes, schema },
			output: { value: emptyBytesEncoded },
		},
	],
	validBytesDecodingsTestCases: [
		{
			description: 'Decoding of chunk of bytes',
			input: { value: bytesEncoded, schema },
			output: { object: bytes },
		},
		{
			description: 'Decoding of empty bytes',
			input: { value: emptyBytesEncoded, schema },
			output: { object: emptyBytes },
		},
	],
};
