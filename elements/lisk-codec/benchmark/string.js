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

const { Suite } = require('benchmark');
const { readString, writeString } = require('../dist-node/string');

const suite = new Suite();
const stringBuffer = Buffer.from('>!test@123test#', 'utf8');

suite
	.add('readString', () => {
		readString(stringBuffer, 0);
	})
	.add('writeString', () => {
		writeString('>!test@123test#');
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: true });

/**
 * String write benchmark results
 * writeString x 1,808,985 ops/sec ±1.03% (87 runs sampled)
 */
