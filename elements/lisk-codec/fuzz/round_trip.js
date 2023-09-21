/*
 * Copyright © 2023 Lisk Foundation
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
const { utils } = require('@liskhq/lisk-cryptography');
const { codec } = require('../dist-node');

const testSchema = {
	$id: '/lisk/transaction-mock',
	type: 'object',
	required: ['module', 'command', 'nonce', 'fee', 'senderPublicKey', 'params'],
	properties: {
		module: {
			dataType: 'string',
			fieldNumber: 1,
			minLength: 1,
			maxLength: 32,
		},
		command: {
			dataType: 'string',
			fieldNumber: 2,
			minLength: 1,
			maxLength: 32,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		fee: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		senderPublicKey: {
			dataType: 'bytes',
			fieldNumber: 5,
			minLength: 32,
			maxLength: 32,
		},
		params: {
			dataType: 'bytes',
			fieldNumber: 6,
		},
		signatures: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 7,
		},
	},
};

function mutateRandomByte(buffer) {
	const mutationType = Math.random();

	// Change a random byte
	if (mutationType < 0.33) {
		const index = Math.floor(Math.random() * buffer.length);
		const mutation = utils.getRandomBytes(1)[0];
		buffer[index] = mutation;
	}
	// Add a random byte
	else if (mutationType < 0.66) {
		const index = Math.floor(Math.random() * (buffer.length + 1));
		const mutation = utils.getRandomBytes(1);
		buffer = Buffer.concat([buffer.subarray(0, index), mutation, buffer.subarray(index)]);
	}
	// Remove a byte
	else {
		if (buffer.length === 1) {
			return buffer; // Can't remove byte from buffer of length 1
		}
		const index = Math.floor(Math.random() * buffer.length);
		buffer = Buffer.concat([buffer.subarray(0, index), buffer.subarray(index + 1)]);
	}

	return buffer;
}

let successCounter = 0;
let totalCounter = 100000;

while (true) {
	// get random bytes length between 0 - 100
	let original = codec.encode(testSchema, {
		module: (Math.random() + 1).toString(36).substring(7),
		command: (Math.random() + 1).toString(36).substring(7),
		nonce: BigInt(Math.floor(Math.random() * 10000000)),
		fee: BigInt(Math.floor(Math.random() * 10000000)),
		senderPublicKey: utils.getRandomBytes(32),
		params: utils.getRandomBytes(10),
		signatures: new Array(Math.floor(Math.random() * 3))
			.fill(0)
			.map(() => utils.getRandomBytes(64)),
	});
	for (let i = 0; i < totalCounter; i++) {
		try {
			original = mutateRandomByte(original);
			const decodedObj = codec.decode(testSchema, original);
			const reEncoded = codec.encode(testSchema, decodedObj);

			if (!reEncoded.equals(original)) {
				console.error('Fail to satisfy encode(decode(val)) == val', {
					original: original.toString('hex'),
					reEncoded: reEncoded.toString('hex'),
					decodedObj,
				});
				process.exit(1);
			}
			successCounter += 1;
		} catch (error) {
			// console.log(error)
			// expected
		}
	}
	console.log(`Checked value for ${totalCounter}. Successfully validated ${successCounter}`);
	successCounter = 0;
}
