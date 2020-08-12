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

import { Options } from '../../src/application/node/node';
import * as genesisBlockJSON from './config/devnet/genesis_block.json';

export const cacheConfig = 'aCacheConfig';

export const nodeOptions = {
	version: '1.0.0',
	networkVersion: '1.0',
	rootPath: '~/.lisk',
	label: 'default',
	genesisBlock: genesisBlockJSON,
	network: {
		enabled: false,
	},
	forging: {
		waitThreshold: 2,
		delegates: [],
	},
	genesisConfig: {
		activeDelegates: 101,
		standbyDelegates: 2,
		maxPayloadLength: 15 * 1024, // 15kb
		bftThreshold: 68, // Two third of active delegates Math.ceil(activeDelegates * 2 / 3)
		baseFees: [],
		blockTime: 10, // 10 seconds
		minFeePerByte: 10000, // 10k beddows or 0.00001 LSK
		communityIdentifier: 'Lisk',
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
	},
} as Options;
