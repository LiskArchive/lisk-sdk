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

import { getRandomBytes, getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';

import { createBlock } from '../../../src/testing';
import {
	getBlockProcessingEnv,
	BlockProcessingEnv,
} from '../../../src/testing/block_processing_env';
import { defaultConfig } from '../../../src/testing/fixtures/config';

describe('getBlockProcessingEnv', () => {
	let blockProcessEnv: BlockProcessingEnv;
	const databasePath = '/tmp/lisk/block_process/test';
	const { blockTime } = defaultConfig.genesisConfig;

	beforeEach(async () => {
		blockProcessEnv = await getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
	});

	afterEach(async () => {
		await blockProcessEnv.cleanup({ databasePath });
	});

	it('should get genesis block as the last block', () => {
		// Act & Assert
		const { height } = blockProcessEnv.getLastBlock().header;
		expect(height).toEqual(0);
	});

	it('should return all registered validators', async () => {
		// Act & Assert
		const validators = await blockProcessEnv.getValidators();
		expect(validators).toHaveLength(defaultConfig.forging.delegates.length);
	});

	it('should return a valid passphrase for next validator', async () => {
		// Arrange
		const { header } = blockProcessEnv.getLastBlock();

		// Act & Assert
		const passphrase = await blockProcessEnv.getNextValidatorPassphrase(header);
		expect(passphrase).toBeString();
		expect(passphrase.split(' ')).toHaveLength(12);
	});

	it('should be able to process a valid block', async () => {
		// Arrange
		const lastBlockHeader = blockProcessEnv.getLastBlock().header;
		const passphrase = await blockProcessEnv.getNextValidatorPassphrase(lastBlockHeader);
		const block = createBlock({
			passphrase,
			networkIdentifier: blockProcessEnv.getNetworkId(),
			timestamp: lastBlockHeader.timestamp + blockTime,
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

		// Act & Assert
		expect(blockProcessEnv.getLastBlock().header.height).toEqual(0);
		await expect(blockProcessEnv.process(block)).toResolve();
		expect(blockProcessEnv.getLastBlock().header.height).toEqual(block.header.height);
		expect(blockProcessEnv.getLastBlock().header.id).toEqual(block.header.id);
	});

	it('should be able to process blocks until given height', async () => {
		// Arrange
		const untilHeight = 101;

		// Act & Assert
		await blockProcessEnv.processUntilHeight(untilHeight);
		expect(blockProcessEnv.getLastBlock().header.height).toEqual(untilHeight);
	});

	it('should process block with correct validator', async () => {
		// Arrange
		const lastBlockHeader = blockProcessEnv.getLastBlock().header;
		const passphrase = await blockProcessEnv.getNextValidatorPassphrase(lastBlockHeader);
		const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);

		// Act & Assert
		await blockProcessEnv.processUntilHeight(1);
		expect(blockProcessEnv.getLastBlock().header.generatorPublicKey).toEqual(publicKey);
	});
});
