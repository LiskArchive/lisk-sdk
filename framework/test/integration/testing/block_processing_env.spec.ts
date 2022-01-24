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

import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import * as testing from '../../../src/testing';
import { defaultConfig } from '../../../src/testing/fixtures/config';

describe('getBlockProcessingEnv', () => {
	const databasePath = '/tmp/lisk/processing_env/test';

	let processEnv: testing.BlockProcessingEnv;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
	});

	afterAll(async () => {
		await processEnv.cleanup({ databasePath });
	});

	it('should get genesis block as the last block', () => {
		// Act & Assert
		const { height } = processEnv.getLastBlock().header;
		expect(height).toEqual(0);
	});

	it('should return all registered validators', async () => {
		// Act & Assert
		const validators = await processEnv.invoke<{ list: string[] }>('validators_getGeneratorList');
		expect(validators.list).toHaveLength(defaultConfig.generation.delegates.length);
	});

	it('should return a valid passphrase for next validator', async () => {
		// Arrange
		const { header } = processEnv.getLastBlock();

		// Act & Assert
		const passphrase = await processEnv.getNextValidatorPassphrase(header);
		expect(passphrase).toBeString();
		expect(passphrase.split(' ')).toHaveLength(24);
	});

	it('should be able to process a valid block', async () => {
		// Arrange
		const block = await processEnv.createBlock();

		// Act & Assert
		expect(processEnv.getLastBlock().header.height).toEqual(0);
		await expect(processEnv.process(block)).toResolve();
		expect(processEnv.getLastBlock().header.height).toEqual(block.header.height);
		expect(processEnv.getLastBlock().header.id).toEqual(block.header.id);
	});

	it('should be able to process blocks until given height', async () => {
		// Arrange
		const untilHeight = 101;

		// Act & Assert
		await processEnv.processUntilHeight(untilHeight);
		expect(processEnv.getLastBlock().header.height).toEqual(untilHeight);
	});

	it('should process block with correct validator', async () => {
		// Arrange
		const lastBlockHeader = processEnv.getLastBlock().header;
		const passphrase = await processEnv.getNextValidatorPassphrase(lastBlockHeader);
		const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);

		// Act & Assert
		const block = await processEnv.createBlock();
		expect(block.header.generatorAddress).toEqual(getAddressFromPublicKey(publicKey));
	});
});
