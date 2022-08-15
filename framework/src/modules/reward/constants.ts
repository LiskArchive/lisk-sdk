/*
 * Copyright © 2021 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';

export const MODULE_ID_REWARD = 10;
export const TOKEN_ID_LSK_MAINCHAIN = {
	chainID: utils.intToBuffer(0, 4),
	localID: utils.intToBuffer(0, 4),
};

export const REWARD_NO_REDUCTION = 0;
export const REWARD_REDUCTION_SEED_REVEAL = 1;
export const REWARD_REDUCTION_MAX_PREVOTES = 2;
export const REWARD_REDUCTION_FACTOR_BFT = 4;

export const TYPE_ID_REWARD_MINTED = Buffer.from([0, 0, 0, 1]);

export const defaultConfig = {
	tokenID: '0000000000000000',
	offset: 2160,
	distance: 3000000,
	brackets: ['500000000', '400000000', '300000000', '200000000', '100000000'],
};
