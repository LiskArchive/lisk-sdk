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

const generateValidObjectEncodings = () => {
	const object = {
		address: Buffer.from('e11a11364738225813f86ea85214400e5db08d6e', 'hex'),
		balance: 10000000,
		isDelegate: true,
		name: 'delegate',
		asset: {
			data: 'Check out the Lisk SDK now in binary!',
		},
	};

	const input = {
		object: {
			object,
			schema: {
				$id: 'object11',
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
					isDelegate: {
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
						},
					},
				},
			},
		},
		objectOptionalProp: {
			object: {
				isActive: true,
				value: 1,
			},
			schema: {
				$id: 'object12',
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
			},
		},
	};

	const objectEncoded = Objects.encode(input.object.object).finish();
	const objectOptionalPropEncoded = ObjectWithOptionalProp.encode(
		input.objectOptionalProp.object,
	).finish();

	return [
		{
			description: 'Encoding of object',
			input: input.object,
			output: { value: objectEncoded.toString('hex') },
		},
		{
			description: 'Encoding of object with optional property',
			input: input.objectOptionalProp,
			output: { value: objectOptionalPropEncoded.toString('hex') },
		},
	];
};

module.exports = generateValidObjectEncodings;
