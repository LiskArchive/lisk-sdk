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

const suite = new Suite();

const mandatoryKeys = [...Array(44).keys()].map(() => crypto.randomBytes(32));
const optionalKeys = [...Array(20).keys()].map(() => crypto.randomBytes(32));
const signatures = [...Array(65).keys()].map(() => crypto.randomBytes(64));

const biggestMultisigTransactionRegistration = {
	senderPublicKey: Buffer.from(
		'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		'hex',
	),
	nonce: 1,
	fee: BigInt(1500000000),
	type: 12,
	asset: {
		mandatoryKeys,
		optionalKeys,
		numberOfSignatures: 44,
	},
	signatures,
};

const testSchema = {
	$id: '/testSchema',
	type: 'object',
	properties: {
		senderPublicKey: { fieldNumber: 1, dataType: 'bytes' },
		nonce: { fieldNumber: 2, dataType: 'uint32' },
		free: { fieldNumber: 3, dataType: 'uint64' },
		type: { fieldNumber: 4, dataType: 'uint32' },
		asset: {
			type: 'object',
			fieldNumber: 5,
			properties: {
				numberOfSignatures: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				mandatoryKeys: {
					fieldNumber: 2,
					type: 'array',
					items: {
						dataType: 'bytes',
					},
				},
				optionalKeys: {
					fieldNumber: 3,
					type: 'array',
					items: {
						dataType: 'bytes',
					},
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

const biggestMultisigTransactionRegistrationEncoded = codec.encode(
	testSchema,
	biggestMultisigTransactionRegistration,
);

suite
	.add('Encode biggest possible Lisk transaction', () => {
		codec.encode(testSchema, biggestMultisigTransactionRegistration);
	})
	.add('Decode biggest possible Lisk transaction', () => {
		codec.decode(testSchema, biggestMultisigTransactionRegistrationEncoded);
	})
	.on('cycle', function (event) {
		console.log(String(event.target));
	})
	.run({ async: false });
