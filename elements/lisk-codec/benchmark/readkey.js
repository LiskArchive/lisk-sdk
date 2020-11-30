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
// readKey x 167,462,050 ops/sec ±0.83% (89 runs sampled)

const { Suite } = require('benchmark');
const { readKey } = require('../dist-node/keys');
const suite = new Suite();

suite
	.add('readKey', () => {
		readKey(48);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: true });
