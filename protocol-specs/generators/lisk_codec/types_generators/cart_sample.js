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
	protobuf.loadSync('./generators/lisk_codec/proto_files/cart_sample.proto');

const { Cart } = prepareProtobuffersObjects();

const object = {
	orderId: 1234,
	createdAt: 1590564352,
	customerId: 100,
	lineItems: [
		{
			productId: 5008798,
			price: 599,
			quantity: 1,
			taxLines: [
				{
					price: 599,
					rate: 6,
					title: 'State Tax',
				},
			],
		},
		{
			productId: 9008798,
			price: 1599,
			quantity: 1,
			taxLines: [
				{
					price: 1599,
					rate: 7,
					title: 'State Tax',
				},
			],
		},
	],
};

const schema = {
	$id: '/cartSample',
	type: 'object',
	properties: {
		orderId: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		createdAt: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		customerId: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		lineItems: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				properties: {
					productId: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					price: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					quantity: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
					taxLines: {
						type: 'array',
						fieldNumber: 4,
						items: {
							type: 'object',
							properties: {
								price: {
									dataType: 'uint32',
									fieldNumber: 1,
								},
								rate: {
									dataType: 'uint32',
									fieldNumber: 2,
								},
								title: {
									dataType: 'string',
									fieldNumber: 3,
								},
							},
						},
					},
				},
			},
		},
	},
};

const objectEncoded = Cart.encode(object).finish();

module.exports = {
	cartSampleEncodingsTestCases: [
		{
			description: 'Encoding of object with multiple arrays',
			input: {
				object,
				schema,
			},
			output: { value: objectEncoded },
		},
	],
	cartSampleDecodingsTestCases: [
		{
			description: 'Decoding of object with multiple arrays',
			input: {
				value: objectEncoded,
				schema,
			},
			output: { object },
		},
	],
};
