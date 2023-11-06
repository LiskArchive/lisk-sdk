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
// writeBoolean x 3,543,238 ops/sec ±1.59% (89 runs sampled)

const { Suite } = require('benchmark');
const { codec } = require('../dist-node/codec');

const suite = new Suite();

const testSchema = {
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
	},
};

const obj = {
	b: '1371893719313718937193137189371931371893719313718937193',
	a: '1371893719313718937193137189371931371893719313718937193',
	d: Buffer.from('1371893719313718937193137189371931371893719313718937193'),
	e: 10000,
	c: {
		cc: '1371893719313718937193137189371931371893719313718937193',
		ca: '1371893719313718937193137189371931371893719313718937193',
		cb: {
			cbb: '1371893719313718937193137189371931371893719313718937193',
			cba: '1371893719313718937193137189371931371893719313718937193',
			cbc: {
				cbcb: '1371893719313718937193137189371931371893719313718937193',
				cbca: '1371893719313718937193137189371931371893719313718937193',
			},
			cbd: '1371893719313718937193137189371931371893719313718937193',
		},
	},
};

suite
	.add('encode', () => {
		codec.encode(testSchema, obj);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: true });
