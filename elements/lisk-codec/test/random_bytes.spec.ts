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

import { Codec } from '../src/codec';

describe('random bytes', () => {
	const schema = {
		$id: '/testSchema',
		type: 'object',
		properties: {
			b: { fieldNumber: 2, dataType: 'string' },
			a: { fieldNumber: 1, dataType: 'string' },
			d: { fieldNumber: 4, dataType: 'bytes' },
			e: { fieldNumber: 5, dataType: 'uint32' },
			c: {
				type: 'object',
				fieldNumber: 3,
				properties: {
					cc: { fieldNumber: 3, dataType: 'string' },
					ca: { fieldNumber: 1, dataType: 'string' },
					cb: {
						type: 'object',
						fieldNumber: 2,
						properties: {
							cbb: { fieldNumber: 2, dataType: 'string' },
							cba: { fieldNumber: 1, dataType: 'string' },
							cbc: {
								type: 'object',
								fieldNumber: 3,
								properties: {
									cbcb: { fieldNumber: 3, dataType: 'string' },
									cbca: { fieldNumber: 2, dataType: 'string' },
								},
							},
							cbd: { fieldNumber: 4, dataType: 'string' },
						},
					},
				},
			},
			f: {
				type: 'array',
				fieldNumber: 6,
				items: {
					type: 'object',
					properties: {
						fc: { fieldNumber: 3, dataType: 'string' },
						fa: { fieldNumber: 1, dataType: 'string' },
						fb: {
							type: 'object',
							fieldNumber: 2,
							properties: {
								fbb: { fieldNumber: 2, dataType: 'string' },
								fba: { fieldNumber: 1, dataType: 'string' },
								fbc: {
									type: 'object',
									fieldNumber: 3,
									properties: {
										fbcb: { fieldNumber: 3, dataType: 'string' },
										fbca: { fieldNumber: 2, dataType: 'string' },
									},
								},
								fbd: { fieldNumber: 4, dataType: 'string' },
							},
						},
					},
				},
			},
		},
	};
	let codec: Codec;

	beforeEach(() => {
		codec = new Codec();
		codec.addSchema(schema);
	});

	describe('decode and encode', () => {
		const testCases = [Buffer.from('80000000008000e348328000000000804800', 'hex')];

		it('should successfully encode and decode back without error', () => {
			expect.assertions(testCases.length);
			for (const testCase of testCases) {
				const decoded = codec.decode<Record<string, unknown>>(schema, testCase);
				const encoded = codec.encode(schema, decoded);
				const decodedSecondTime = codec.decode<Record<string, unknown>>(schema, encoded);
				const encodedSecondTime = codec.encode(schema, decodedSecondTime);
				expect(encodedSecondTime).toEqual(encoded);
			}
		});
	});
});
