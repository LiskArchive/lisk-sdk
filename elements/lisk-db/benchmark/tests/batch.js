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
const { getFakeBlock } = require('./fixtures');

const batchSuite = async (ldb, rdb, payload_size) => {
	const suite = new Suite();
	const data = prepare(payload_size);

	suite
		.add(`LevelDB: batch([key:string, val: Buffer]) x ${payload_size}(bytes)`, async () => {
			await ldb.batch(data);
		})
		.add(`RocksDB: batch([key:string, val: Buffer]) x ${payload_size}(bytes)`, async () => {
			await rdb.batch(data);
		})
		.on('cycle', event => {
			console.log(String(event.target));
		})
		.on('complete', async function () {
			console.log('Fastest is ' + this.filter('fastest').map('name'));
			await ldb.clear();
			await rdb.clear();
		})
		.run({ async: true });
};

const prepare = payload_size => {
	const data = [];

	for (let i = 0; i < 10; i++) {
		data.push({
			type: 'put',
			...getFakeBlock(payload_size),
		});
	}

	return data;
};

module.exports.batchSuite = batchSuite;
