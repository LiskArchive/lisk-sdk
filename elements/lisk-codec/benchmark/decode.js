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
// decode x 211,879 ops/sec ±0.64% (88 runs sampled)

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

const message = Buffer.from(
	'0a37313337313839333731393331333731383933373139333133373138393337313933313337313839333731393331333731383933373139331237313337313839333731393331333731383933373139333133373138393337313933313337313839333731393331333731383933373139331a720a373133373138393337313933313337313839333731393331333731383933373139333133373138393337313933313337313839333731393312ab010a37313337313839333731393331333731383933373139333133373138393337313933313337313839333731393331333731383933373139331237313337313839333731393331333731383933373139333133373138393337313933313337313839333731393331333731383933373139331a721237313337313839333731393331333731383933373139333133373138393337313933313337313839333731393331333731383933373139331a37313337313839333731393331333731383933373139333133373138393337313933313337313839333731393331333731383933373139332237313337313839333731393331333731383933373139333133373138393337313933313337313839333731393331333731383933373139331a373133373138393337313933313337313839333731393331333731383933373139333133373138393337313933313337313839333731393322373133373138393337313933313337313839333731393331333731383933373139333133373138393337313933313337313839333731393328904e',
	'hex',
);

suite
	.add('decode', () => {
		codec.decode(testSchema, message);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: true });
