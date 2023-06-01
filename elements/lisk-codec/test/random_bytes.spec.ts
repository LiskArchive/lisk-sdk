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
		const testCases = [Buffer.from('10000000008000e348328000000000804800', 'hex')];

		it('should fail to decode random bytes', () => {
			expect.assertions(testCases.length);
			for (const testCase of testCases) {
				// eslint-disable-next-line no-loop-func
				expect(() => codec.decode(schema, testCase)).toThrow('Invalid field number');
			}
		});
	});
});
