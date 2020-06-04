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

const { getFakeBlock } = require('./tests/fixtures');
const { LevelDB, RocksDB } = require('./databases');
const { getSuite } = require('./tests/get');
const { putSuite } = require('./tests/put');
const { delSuite } = require('./tests/del');
const { batchSuite } = require('./tests/batch');

let ldb = LevelDB.createDb('leveldb_bench');
let rdb = RocksDB.createDb('rocksdb_bench');

// 15,000 (15Kb) payload
const benchDB = async payload_size => {
	await getSuite(ldb, rdb, getFakeBlock(payload_size));
	await putSuite(ldb, rdb, getFakeBlock(payload_size));
	await delSuite(ldb, rdb, getFakeBlock(payload_size));
	await batchSuite(ldb, rdb, payload_size);
};

const cliArgs = process.argv.slice(2);
let payload_size = 1024;

switch (cliArgs[0]) {
	case '15000':
		payload_size = parseInt(cliArgs[0], 10);
		break;
	case '50000':
		payload_size = parseInt(cliArgs[0], 10);
		break;
	case '100000':
		payload_size = parseInt(cliArgs[0], 10);
		break;
	case '150000':
		payload_size = parseInt(cliArgs[0], 10);
		break;
}

benchDB(payload_size)
	.then(console.log(`Start benchmarking for payload ${payload_size}!!!`))
	.catch(err => {
		console.log(err);
		process.exit(1);
	});
