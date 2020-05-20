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

		expect(liskBinaryMessage.toString('hex')).toBe(
			'0a0670726f702061120670726f7020621a120a0770726f70206361121e0a0870726f7020636261120870726f70206362621a16120970726f7020636263611a0970726f702063626362220870726f70206362641a0770726f70206363220670726f702064280a',
		);
	});

	it('it should not encode missing propertiees of an object to Buffer', () => {
		const obj = {
			b: 'prop b',
			a: 'prop a',
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

		expect(liskBinaryMessage.toString('hex')).toBe(
			'0a0670726f702061120670726f7020621a120a0770726f70206361121e0a0870726f7020636261120870726f70206362621a16120970726f7020636263611a0970726f702063626362220870726f70206362641a0770726f70206363280a',
		);
	});
});
