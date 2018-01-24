/*
 * Copyright © 2018 Lisk Foundation
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

const {load} = require('./config');

module.exports = {
	accounts: {
		// sql to be included
	},
	blocks: {
		aggregateBlocksReward: load('blocks/aggregateBlocksReward.sql'),
		count: load('blocks/count.sql'),
		deleteBlock: load('blocks/deleteBlock.sql'),
		getGenesisBlock: load('blocks/getGenesisBlock.sql'),
		getGenesisBlockId: load('blocks/getGenesisBlockId.sql'),
		getIdSequence: load('blocks/getIdSequence.sql'),
		loadBlocksOffset: load('blocks/loadBlocksOffset.sql'),
		loadLastBlock: load('blocks/loadLastBlock.sql'),
		blockExists: load('blocks/blockExists.sql'),
		deleteAfterBlock: load('blocks/deleteAfterBlock.sql'),
		getBlocksForTransport: load('blocks/getBlocksForTransport.sql'),
		getHeightByLastId: load('blocks/getHeightByLastId.sql')
	},
	delegates: {
		countDuplicatedDelegates: load('delegates/countDuplicatedDelegates.sql'),
		getDelegatesByPublicKeys: load('delegates/getDelegatesByPublicKeys.sql'),
		insertFork: load('delegates/insertFork.sql')
	},
	peers: {
		// sql to be included
	}
	// etc...
};
