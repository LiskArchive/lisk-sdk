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

const BaseGenerator = require('../base_generator');
const defaultConfig = require('../../config/devnet');

const { genesisBlock } = defaultConfig;

const generateTransactionMerkleRoot = () => {
	const merkleRoot = '';

	return {
		description: 'Given a valid block',
		input: {
			block: genesisBlock,
		},
		output: { merkleRoot },
	};
};

const transactionMerkleRootSuite = () => ({
	title: 'Transaction Merkle tree root',
	summary: 'Replace payload hash with Merkle tree root in block header',
	config: { network: 'devnet' },
	runner: 'transaction_merkle_root',
	handler: 'transaction_merkle_root',
	testCases: [generateTransactionMerkleRoot()],
});

BaseGenerator.runGenerator('transaction_merkle_root', [
	transactionMerkleRootSuite,
]);
