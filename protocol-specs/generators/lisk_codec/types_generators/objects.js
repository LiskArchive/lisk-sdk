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

const prepareProtobuffersObjects = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/object.proto');

const { Objects, ObjectWithOptionalProp } = prepareProtobuffersObjects();

const object = {
	address: Buffer.from('e11a11364738225813f86ea85214400e5db08d6e', 'hex'),
	balance: '10000000',
	isValidator: true,
	name: 'validator',
	asset: {
		data: 'Check out the Lisk SDK now in binary!',
		fooBar: {
			foo: 9,
			bar: 9,
		},
	},
};
const objectSchema = {
	$id: '/object11',
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
		isValidator: {
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
				fooBar: {
					type: 'object',
					fieldNumber: 2,
					properties: {
						foo: {
							dataType: 'uint32',
							fieldNumber: 1,
						},
						bar: {
							dataType: 'uint32',
							fieldNumber: 2,
						},
					},
				},
			},
		},
	},
};

const objectWithOptionalProps = {
	isActive: true,
	value: '1',
};

const objectWithOptionalPropsSchema = {
	$id: '/object12',
	type: 'object',
	properties: {
		isActive: {
			dataType: 'boolean',
			fieldNumber: 1,
		},
		data: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		value: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
	},
};

const objectEncoded = Objects.encode(object).finish();
const objectOptionalPropEncoded = ObjectWithOptionalProp.encode(objectWithOptionalProps).finish();

module.exports = {
	validObjectEncodingsTestCases: [
		{
			description: 'Encoding of object',
			input: { object, schema: objectSchema },
			output: { value: objectEncoded },
		},
		{
			description: 'Encoding of object with optional property',
			input: { object: objectWithOptionalProps, schema: objectWithOptionalPropsSchema },
			output: { value: objectOptionalPropEncoded },
		},
	],
	validObjectDecodingsTestCases: [
		{
			description: 'Decoding of object',
			input: { value: objectEncoded, schema: objectSchema },
			output: { object },
		},
		{
			description: 'Decoding of object with optional property',
			input: { value: objectOptionalPropEncoded, schema: objectWithOptionalPropsSchema },
			output: {
				object: {
					...objectWithOptionalProps,
					data: Buffer.alloc(0),
				},
			},
		},
	],
};
