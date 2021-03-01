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

import { getRandomBytes } from '@liskhq/lisk-cryptography';

import { TokenModule } from '../../../src/modules/token/token_module';
import { createBlock } from '../../../src/testing';
import {
	getBlockProcessingEnv,
	BlockProcessingEnvResult,
} from '../../../src/testing/block_processing_env';
import { defaultAccount } from '../../../src/testing/fixtures';

describe('getBlockProcessingEnv', () => {
	let blockProcessEnv: BlockProcessingEnvResult;
	const databasePath = '/tmp/lisk/block_process/test';
	const modules = [TokenModule];

	beforeEach(async () => {
		blockProcessEnv = await getBlockProcessingEnv({
			modules,
			options: {
				databasePath,
			},
		});
	});

	afterEach(async () => {
		await blockProcessEnv.cleanup({ databasePath });
	});

	it('should be able to process a valid block', async () => {
		const lastBlockHeader = blockProcessEnv.getLastBlock().header;
		const block = createBlock({
			passphrase: defaultAccount.passphrase,
			networkIdentifier: blockProcessEnv.getNetworkId(),
			timestamp: lastBlockHeader.timestamp + 10,
			previousBlockID: lastBlockHeader.id,
			header: {
				asset: {
					maxHeightPreviouslyForged: lastBlockHeader.height,
					maxHeightPrevoted: 0,
					seedReveal: getRandomBytes(16),
				},
			},
			payload: [],
		});
		expect(blockProcessEnv.getLastBlock().header.height).toEqual(0);
		await expect(blockProcessEnv.process(block)).toResolve();
		expect(blockProcessEnv.getLastBlock().header.height).toEqual(block.header.height);
		expect(blockProcessEnv.getLastBlock().header.id).toEqual(block.header.id);
	});

	it('should be able to process blocks until given height', async () => {
		const createBlockUntilHeight = 10;
		await blockProcessEnv.processUntilHeight(createBlockUntilHeight);
		expect(blockProcessEnv.getLastBlock().header.height).toEqual(createBlockUntilHeight);
	});

	it('should enable to use data access', async () => {
		const account = await blockProcessEnv
			.getDataAccess()
			.getAccountByAddress(defaultAccount.address);
		expect(account.address).toEqual(defaultAccount.address);
	});
});
