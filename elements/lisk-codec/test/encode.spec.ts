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
		c: {
			dataType: 'object',
			fieldNumber: 3,
			properties: {
				cc: { fieldNumber: 3, dataType: 'string' },
				ca: { fieldNumber: 1, dataType: 'string' },
				cb: {
					dataType: 'object',
					fieldNumber: 2,
					properties: {
						cbb: { fieldNumber: 2, dataType: 'string' },
						cba: { fieldNumber: 1, dataType: 'string' },
						cbc: {
							dataType: 'object',
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
		expect(liskBinaryMessage.toString('hex')).toBe('0970726f7020611170726f7020620970726f702063610970726f70206362611170726f70206362621170726f7020636263611970726f7020636263622170726f70206362641970726f702063632170726f702064');
	});
});
