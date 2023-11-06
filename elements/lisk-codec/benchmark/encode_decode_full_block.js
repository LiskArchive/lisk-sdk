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
const crypto = require('crypto');

const { Suite } = require('benchmark');
const { codec } = require('../dist-node/codec');

const transactions = [...Array(65).keys()].map(() => crypto.randomBytes(220));

const suite = new Suite();

const block = {
	header: Buffer.from('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'hex'),
	transactions,
};

const testSchema = {
	$id: '/blockSchema',
	type: 'object',
	properties: {
		header: { dataType: 'bytes', fieldNumber: 1 },
		transactions: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
	},
	required: ['header', 'transactions'],
};

const blockEncoded = codec.encode(testSchema, block);

suite
	.add('Encode Lisk block', () => {
		codec.encode(testSchema, block);
	})
	.add('Decode Lisk block', () => {
		codec.decode(testSchema, blockEncoded);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: false });
