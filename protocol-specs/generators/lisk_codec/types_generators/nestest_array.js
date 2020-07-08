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

const generateValidPeerInfoEncodings = () => {
	const input = {
		diff: {
			object: {
				updated: [
					{
						key: 'accounts:address:rUL46GfWGBcb9JguZCaUQhSPbhE=',
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
				created: ['chain:delegates', 'consensus:bft'],
			},
			schema: {
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
			},
		},
		diffString: {
			object: {
				updated: [
					{
						key: 'accounts:address:rUL46GfWGBcb9JguZCaUQhSPbhE=',
						value: ['diff1', 'diff2'],
					},
					{
						key: 'accounts:address:aaa6GfWGBcb9JguZCaUQhSPbhE=',
						value: ['diff5', 'diff6', 'diff7', 'diff5'],
					},
				],
				created: ['chain:delegates', 'consensus:bft'],
			},
			schema: {
				$id: '/state/diff-string',
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
			},
		},
	};

	const objectEncoded = StateDiff.encode(input.diff.object).finish();
	const objectStringEncoded = StateDiffString.encode(input.diffString.object).finish();

	return [
		{
			description: 'Encoding of nested array object sample',
			input: input.diff,
			output: { value: objectEncoded.toString('hex') },
		},
		{
			description: 'Encoding of nested array string sample',
			input: input.diffString,
			output: { value: objectStringEncoded.toString('hex') },
		},
	];
};

module.exports = generateValidPeerInfoEncodings;
