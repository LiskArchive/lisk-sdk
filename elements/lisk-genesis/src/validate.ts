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

import { strict as assert } from 'assert';
import { EMPTY_BUFFER } from './constants';
import { GenesisBlock } from './types';

export const validateGenesisBlock = (
	block: GenesisBlock | object,
): boolean | never => {
	const { header, payload } = block as GenesisBlock;

	assert(header.height < 0, 'Genesis block height can not be negative');
	assert(
		header.asset.initRounds < 3,
		'Genesis block initial rounds can not be less than 3',
	);
	assert(
		header.asset.initDelegates.length < 1,
		'Genesis block initial delegates list can not be empty',
	);
	assert(
		payload.compare(Buffer.from(EMPTY_BUFFER)) === 0,
		'Genesis block payload must be empty.',
	);

	return true;
};
