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

import { EMPTY_BUFFER, EMPTY_HASH } from './constants';
import { GenesisAccountState, GenesisBlock, GenesisBlockParams } from './types';
import { validateGenesisBlock } from './validate';

export const createGenesisBlock = (
	params: GenesisBlockParams,
): GenesisBlock => {
	// Default values
	const initRounds = params.initRounds ?? 3;
	const height = params.height ?? 0;
	const timestamp = params.timestamp ?? Math.floor(Date.now() / 1000);
	const previousBlockID = params.previousBlockID ?? Buffer.from(EMPTY_BUFFER);

	// Constant values
	const version = 0;
	const generatorPublicKey = Buffer.from(EMPTY_BUFFER);
	const reward = BigInt(0);
	const payload = Buffer.from(EMPTY_BUFFER);
	const signature = Buffer.from(EMPTY_BUFFER);
	const transactionRoot = Buffer.from(EMPTY_HASH);
	const id = Buffer.from(EMPTY_BUFFER);

	const { initDelegates } = params;

	const accounts: ReadonlyArray<GenesisAccountState> = [
		...params.accounts,
	].sort((a, b): number => a.address.compare(b.address));

	const header = {
		generatorPublicKey,
		height,
		id,
		previousBlockID,
		reward,
		signature,
		timestamp,
		transactionRoot,
		version,
		asset: {
			initRounds,
			initDelegates,
			accounts,
		},
	};

	const genesisBlock: GenesisBlock = {
		header,
		payload,
	};

	validateGenesisBlock(genesisBlock);

	return genesisBlock;
};
