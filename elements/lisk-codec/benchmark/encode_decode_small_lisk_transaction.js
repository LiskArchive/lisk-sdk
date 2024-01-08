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
const { codec } = require('../dist-node/codec');

const suite = new Suite();

const transferLikeLiskTransaction = {
	senderPublicKey: Buffer.from(
		'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		'hex',
	),
	nonce: 1,
	fee: BigInt(1500000000),
	type: 8,
	asset: {
		amount: BigInt(15000000000),
		recipientAddress: Buffer.from(
			'0b811fce4b615883709cb8a8c99407e464b2f9aa4f367095322de1b87g5fdfb1',
			'hex',
		),
		data: 'Test data',
	},
	signatures: [
		Buffer.from(
			'4d38666425327e3c950cef3d5d6bed86b7a32e32002651a49ed5dbd0143d9b2fe94d1aa970ff6492da8e174f844d3c4736f980b322d35b76903969c48375ad8a',
			'hex',
		),
		Buffer.from(
			'644abb27920144bb4e4a5030e77cbdc53ea03fb9dd4ecd9abb8a5653c581f766b4ca6f33ce5f603330959e2f8263ae187c35b1840a840107cb42899bf854db01',
			'hex',
		),
	],
};

const testSchema = {
	$id: '/testSchema',
	type: 'object',
	properties: {
		senderPublicKey: { fieldNumber: 1, dataType: 'bytes' },
		nonce: { fieldNumber: 2, dataType: 'uint32' },
		fee: { fieldNumber: 3, dataType: 'uint64' },
		type: { fieldNumber: 4, dataType: 'uint32' },
		asset: {
			type: 'object',
			fieldNumber: 5,
			properties: {
				amount: {
					fieldNumber: 1,
					dataType: 'uint64',
				},
				recipientAddress: {
					fieldNumber: 2,
					dataType: 'bytes',
				},
				data: {
					fieldNumber: 3,
					dataType: 'string',
				},
			},
		},
		signatures: {
			fieldNumber: 6,
			type: 'array',
			items: {
				dataType: 'bytes',
			},
		},
	},
};

const transferLikeLiskTransactionEncoded = codec.encode(testSchema, transferLikeLiskTransaction);

suite
	.add('Encode transfer like Lisk transaction', () => {
		codec.encode(testSchema, transferLikeLiskTransaction);
	})
	.add('Decode transfer like Lisk transaction', () => {
		codec.decode(testSchema, transferLikeLiskTransactionEncoded);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: false });
