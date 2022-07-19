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
const { getRandomBytes } = require('@liskhq/lisk-cryptography');
const { MerkleTree } = require('../dist-node/merkle_tree');

const suite = new Suite();
const size = 150;
const testSamples = [];

for (let i = 0; i < size; i += 1) {
	testSamples.push(utils.getRandomBytes(32));
}

suite
	.add('constructor', async () => {
		const tree = new MerkleTree();
		await tree.init(testSamples);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: true });
