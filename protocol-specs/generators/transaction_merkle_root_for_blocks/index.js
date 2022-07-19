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

const { utils } = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');

const getRandomTransactionIds = count => {
	const ids = [];
	for (let index = 0; index < count; index += 1) {
		ids.push(utils.getRandomBytes(32));
	}
	return ids;
};

const LEAFPREFIX = utils.intToBuffer(0);
const BRANCHPREFIX = utils.intToBuffer(1);

const concat = (m1, m2) => Buffer.concat([m1, m2]);

const leafHash = m => utils.hash(concat(LEAFPREFIX, m));

const branchHash = m => utils.hash(concat(BRANCHPREFIX, m));

const merkleRoot = transactionIds => {
	const len = transactionIds.length;
	if (len === 0) return utils.hash(Buffer.from([]));
	if (len === 1) return leafHash(transactionIds[0]);

	const k = 2 ** Math.floor(Math.log2(len - 1));
	const newData = transactionIds.splice(k);

	return branchHash(concat(merkleRoot(transactionIds), merkleRoot(newData)));
};

const generateTransactionMerkleRoot = () =>
	[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50, 150, 300, 1000].map(count => {
		const transactionIds = getRandomTransactionIds(count);
		const ids = transactionIds.map(t => utils.bufferToHex(t));
		const transactionMerkleRoot = merkleRoot(transactionIds);

		return {
			description: `Given valid transaction ids: ${count}`,
			input: {
				transactionIds: ids,
			},
			output: {
				transactionMerkleRoot,
			},
		};
	});

const transactionMerkleRootSuite = () => ({
	title: 'Transaction Merkle tree root',
	summary: 'Replace payload hash with Merkle tree root in block header',
	config: {},
	runner: 'transaction_merkle_root',
	handler: 'transaction_merkle_root',
	testCases: [...generateTransactionMerkleRoot()],
});

BaseGenerator.runGenerator('transaction_merkle_root', [transactionMerkleRootSuite]);
