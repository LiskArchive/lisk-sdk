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

const loggerConfig = {
	logFileName: 'logs.log',
};
const cacheConfig = 'aCacheConfig';
const storageConfig = {
	logFileName: 'logs.log',
};

const gitLastCommitId = '#gitLastCommitId';
const buildVersion = '#buildVersion';
const peerList = ['peerList'];

const nodeOptions = {
	rootPath: '~/.lisk',
	label: 'default',
	genesisBlock: {
		transactions: [],
		id: 1,
		version: 2,
		height: 1,
		communityIdentifier: 'Lisk',
		payloadHash: '',
	},
	network: {
		enabled: false,
	},
	forging: {
		waitThreshold: 2,
	},
	constants: {
		activeDelegates: 101,
		maxPayloadLength: 15 * 1024,
		rewards: {
			milestones: [
				'500000000', // Initial Reward
				'400000000', // Milestone 1
				'300000000', // Milestone 2
				'200000000', // Milestone 3
				'100000000', // Milestone 4
			],
			offset: 2160, // Start rewards at first block of the second round
			distance: 3000000, // Distance between each milestone
		},
		totalAmount: '10000000000000000',
	},
};

module.exports = {
	loggerConfig,
	cacheConfig,
	storageConfig,
	nodeOptions,
	gitLastCommitId,
	buildVersion,
	peerList,
};
