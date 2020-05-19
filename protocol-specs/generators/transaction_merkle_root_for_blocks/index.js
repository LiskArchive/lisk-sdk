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

'use strict';

const {
	bufferToHex,
	hash,
	intToBuffer,
	getRandomBytes,
} = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');

const getRandomTransactionIds = () => {
	const ids = [];
	for (let index = 0; index < 303; index += 1) {
		ids.push(getRandomBytes(32));
	}
	return ids;
};

const LEAFPREFIX = intToBuffer(0);
const BRANCHPREFIX = intToBuffer(1);

const concat = (m1, m2) => Buffer.concat([m1, m2]);

const leafHash = m => hash(concat(LEAFPREFIX, m));

const branchHash = m => hash(concat(BRANCHPREFIX, m));

const merkleRoot = transactionIds => {
	const len = transactionIds.length;
	if (len === 0) return Buffer.from([]);
	if (len === 1) return leafHash(transactionIds[0]);

	const k = 2 ** Math.floor(Math.log2(len - 1));
	const newData = transactionIds.splice(k);

	return branchHash(concat(merkleRoot(transactionIds), merkleRoot(newData)));
};

const generateTransactionMerkleRoot = () => {
	const transactionIds = getRandomTransactionIds();
	const ids = transactionIds.map(t => bufferToHex(t));
	const transactionMerkleRoot = merkleRoot(transactionIds);

	return {
		description: 'Given a valid block',
		input: {
			transactionIds: ids,
		},
		output: {
			transactionMerkleRoot: transactionMerkleRoot.toString('hex'),
		},
	};
};

const transactionMerkleRootSuite = () => ({
	title: 'Transaction Merkle tree root',
	summary: 'Replace payload hash with Merkle tree root in block header',
	config: {},
	runner: 'transaction_merkle_root',
	handler: 'transaction_merkle_root',
	testCases: [generateTransactionMerkleRoot()],
});

BaseGenerator.runGenerator('transaction_merkle_root', [
	transactionMerkleRootSuite,
]);
