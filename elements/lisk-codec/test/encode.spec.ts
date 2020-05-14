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
import { codec } from '../src/codec';

const testSchema = {
	$id: 'testSchema',
	type: 'object',
	properties: {
		b: { fieldNumber: 2, dataType: 'string' },
		a: { fieldNumber: 1, dataType: 'string' },
		d: { fieldNumber: 4, dataType: 'bytes' },
		e: { fieldNumber: 5, dataType: 'int32' },
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
	},
};

describe('encode', () => {
	it('it should encode an object to Buffer', () => {
		const obj = {
			b: 'prop b',
			a: 'prop a',
			d: Buffer.from('prop d'),
			e: 10,
			c: {
				cc: 'prop cc',
				ca: 'prop ca',
				cb: {
					cbb: 'prop cbb',
					cba: 'prop cba',
					cbc: {
						cbcb: 'prop cbcb',
						cbca: 'prop cbca',
					},
					cbd: 'prop cbd',
				},
			},
		};

		const liskBinaryMessage = codec.encode(testSchema, obj);

		expect(liskBinaryMessage.toString('hex')).toBe('0a70726f7020611270726f7020620a70726f702063610a70726f70206362611270726f70206362621270726f7020636263611a70726f7020636263622270726f70206362641a70726f702063632270726f702064280a');
	});
});
