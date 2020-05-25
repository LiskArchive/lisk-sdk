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
const { calculateDiff, undo } = require('../dist-node/diff');

const suite = new Suite();

const randomBytes = (size) => {
	let result = '';
	const characters = 'abcdef0123456789';
	const charactersLength = characters.length;
	for (let i = 0; i < 2 * size; i += 1) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}

	return Buffer.from(result, 'hex');
};

const randomBytes1 = randomBytes(115);
const randomBytes2 = randomBytes(815);
const randomBytes3 = randomBytes(16);
const randomBytes4 = randomBytes(12);

const buffer1 = Buffer.concat([
    randomBytes1,
    randomBytes3,
    randomBytes2,
]);
const buffer2 = Buffer.concat([
    randomBytes4,
    randomBytes1,
    randomBytes2,
]);

const diff = calculateDiff(buffer1, buffer2);

/**
 * calculateDiff x 2,759 ops/sec ±0.74% (87 runs sampled)
 * undo x 6,376 ops/sec ±0.49% (91 runs sampled)
 */
suite
    .add('calculateDiff', () => {
        calculateDiff(buffer1, buffer2);
    })
    .add('undo', () => {
        undo(buffer2, diff);
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .run({ async: true });