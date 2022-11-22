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
	protobuf.loadSync('./generators/lisk_codec/proto_files/nested_array.proto');

const { StateDiff, StateDiffString } = prepareProtobuffersObjects();

const diff = {
	updated: [
		{
			key: 'accounts:address:ad42f8e867d618171bf4982e64269442148f6e11',
			value: [
				{
					code: '=',
					line: 1,
				},
				{
					code: '+',
					line: 333,
				},
			],
		},
	],
	created: ['chain:validators', 'consensus:bft'],
};
const diffSchema = {
	$id: '/state/diff',
	type: 'object',
	required: ['updated', 'created'],
	properties: {
		updated: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					key: {
						dataType: 'string',
						fieldNumber: 1,
					},
					value: {
						type: 'array',
						fieldNumber: 2,
						items: {
							type: 'object',
							properties: {
								code: {
									dataType: 'string',
									fieldNumber: 1,
								},
								line: {
									dataType: 'uint32',
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
		created: {
			type: 'array',
			fieldNumber: 2,
			items: {
				dataType: 'string',
			},
		},
	},
};

const diffString = {
	updated: [
		{
			key: 'accounts:address:ad42f8e867d618171bf4982e64269442148f6e11',
			value: ['diff1', 'diff2'],
		},
		{
			key: 'accounts:address:69a6ba19f58605c6fd260b9909a5108523db84',
			value: ['diff5', 'diff6', 'diff7', 'diff5'],
		},
	],
	created: ['chain:validators', 'consensus:bft'],
};
const diffStringSchema = {
	$id: '/state/diffString',
	type: 'object',
	required: ['updated', 'created'],
	properties: {
		updated: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					key: {
						dataType: 'string',
						fieldNumber: 1,
					},
					value: {
						type: 'array',
						fieldNumber: 2,
						items: {
							dataType: 'string',
						},
					},
				},
			},
		},
		created: {
			type: 'array',
			fieldNumber: 2,
			items: {
				dataType: 'string',
			},
		},
	},
};

const objectEncoded = StateDiff.encode(diff).finish();
const objectStringEncoded = StateDiffString.encode(diffString).finish();

module.exports = {
	validNestedArrayEncodingsTestCases: [
		{
			description: 'Encoding of nested array object sample',
			input: { object: diff, schema: diffSchema },
			output: { value: objectEncoded },
		},
		{
			description: 'Encoding of nested array string sample',
			input: { object: diffString, schema: diffStringSchema },
			output: { value: objectStringEncoded },
		},
	],

	validNestedArrayDecodingsTestCases: [
		{
			description: 'Decoding of nested array object sample',
			input: { value: objectEncoded, schema: diffSchema },
			output: { object: diff },
		},
		{
			description: 'Decoding of nested array string sample',
			input: { value: objectStringEncoded, schema: diffStringSchema },
			output: { object: diffString },
		},
	],
};
