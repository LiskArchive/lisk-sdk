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

import { Chain, DataAccess, TAG_BLOCK_HEADER } from '@liskhq/lisk-chain';

import {
	getRandomBytes,
	signDataWithPrivateKey,
	getAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	getAddressAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';
import * as testing from '../../../../../src/testing';

const getPrivateKey = (address: Buffer) => {
	const passphrase = testing.fixtures.getPassphraseFromDefaultConfig(address);
	const { privateKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);

	return privateKey;
};

const forgeWithoutGenerator = async (
	processEnv: testing.BlockProcessingEnv,
	targetHeight: number,
	targetGenerator: Buffer,
) => {
	const chain = processEnv.getChain();
	while (chain.lastBlock.header.height !== targetHeight) {
		let nextBlock = await processEnv.createBlock();
		// Skip targeted generator slot to mimic not forged for last 2 rounds
		if (nextBlock.header.generatorPublicKey.equals(targetGenerator)) {
			nextBlock = await processEnv.createBlock([], nextBlock.header.timestamp + 10);
		}
		await processEnv.process(nextBlock);
	}
	let nextBlock = await processEnv.createBlock();
	while (!nextBlock.header.generatorPublicKey.equals(targetGenerator)) {
		nextBlock = await processEnv.createBlock([], nextBlock.header.timestamp + 10);
	}

	return nextBlock;
};

describe('given a block with protocol violation', () => {
	let processEnv: testing.BlockProcessingEnv;
	let networkIdentifier: Buffer;
	let chain: Chain;
	let dataAccess: DataAccess;
	const databasePath = '/tmp/lisk/process_block/test';

	beforeEach(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
				genesisConfig: {
					...testing.fixtures.defaultConfig.genesisConfig,
					rewards: {
						...testing.fixtures.defaultConfig.genesisConfig.rewards,
						offset: 1,
					},
				},
			},
		});
		networkIdentifier = processEnv.getNetworkId();
		chain = processEnv.getChain();
		dataAccess = processEnv.getDataAccess();
	});

	afterEach(async () => {
		await processEnv.cleanup({ databasePath });
	});

	describe('when SeedReveal is not preimage of the last block forged', () => {
		it('should reject a block if reward is not 0', async () => {
			await processEnv.processUntilHeight(103);
			const { lastBlock } = chain;
			const passphrase = await processEnv.getNextValidatorPassphrase(lastBlock.header);
			const { address } = getAddressAndPublicKeyFromPassphrase(passphrase);
			const nextBlock = await processEnv.createBlock();
			// Mutate valid block to have reward 500000000 with invalid seed reveal
			(nextBlock.header as any).reward = BigInt(500000000);
			(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
			const signature = signDataWithPrivateKey(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				dataAccess.encodeBlockHeader(nextBlock.header, true),
				getPrivateKey(address),
			);
			(nextBlock.header as any).signature = signature;

			await expect(processEnv.process(nextBlock)).rejects.toThrow(
				'Invalid block reward: 500000000 expected: 0',
			);
			expect(chain.lastBlock.header.id).toEqual(lastBlock.header.id);
		});

		it('should accept a block if reward is 0', async () => {
			await processEnv.processUntilHeight(103);
			const { lastBlock } = chain;
			const passphrase = await processEnv.getNextValidatorPassphrase(lastBlock.header);
			const { address } = getAddressAndPublicKeyFromPassphrase(passphrase);
			const nextBlock = await processEnv.createBlock();
			// Mutate valid block to have reward 0 with invalid seed reveal
			(nextBlock.header as any).reward = BigInt(0);
			(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
			const signature = signDataWithPrivateKey(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				dataAccess.encodeBlockHeader(nextBlock.header, true),
				getPrivateKey(address),
			);
			(nextBlock.header as any).signature = signature;

			await processEnv.process(nextBlock);
			expect(chain.lastBlock.header.id).toEqual(nextBlock.header.id);
		});

		it('should accept a block if reward is full and forger did not forget last 2 rounds', async () => {
			// Arrange
			await processEnv.processUntilHeight(1);
			const targetHeight = chain.numberOfValidators * 2 + chain.lastBlock.header.height;
			const targetGenerator = chain.lastBlock.header.generatorPublicKey;
			const target = getAddressFromPublicKey(targetGenerator);
			// Forge 2 rounds of block without generator of the last block
			const nextBlock = await forgeWithoutGenerator(processEnv, targetHeight, targetGenerator);
			(nextBlock.header as any).reward = BigInt(500000000);
			(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
			const signature = signDataWithPrivateKey(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				dataAccess.encodeBlockHeader(nextBlock.header, true),
				getPrivateKey(target),
			);
			(nextBlock.header as any).signature = signature;

			// Act
			await expect(processEnv.process(nextBlock)).resolves.toBeUndefined();

			// Assert
			expect(chain.lastBlock.header.id).toEqual(nextBlock.header.id);
		});
	});

	describe('when BFT protocol is violated', () => {
		it('should reject a block if reward is not quarter', async () => {
			await processEnv.processUntilHeight(1);
			const targetHeight = chain.numberOfValidators * 2 + chain.lastBlock.header.height;
			const targetGenerator = chain.lastBlock.header.generatorPublicKey;
			const target = getAddressFromPublicKey(targetGenerator);
			// Forge 2 rounds of block without generator of the last block
			const nextBlock = await forgeWithoutGenerator(processEnv, targetHeight, targetGenerator);
			(nextBlock.header as any).reward = BigInt(500000000);
			(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
			const signature = signDataWithPrivateKey(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				dataAccess.encodeBlockHeader(nextBlock.header, true),
				getPrivateKey(target),
			);
			(nextBlock.header as any).signature = signature;

			await expect(processEnv.process(nextBlock)).rejects.toThrow(
				'Invalid block reward: 500000000 expected: 125000000',
			);
		});

		it('should accept a block if reward is quarter', async () => {
			await processEnv.processUntilHeight(1);
			const targetHeight = chain.numberOfValidators * 2 + chain.lastBlock.header.height;
			const targetGenerator = chain.lastBlock.header.generatorPublicKey;
			const target = getAddressFromPublicKey(targetGenerator);
			// Forge 2 rounds of block without generator of the last block
			const nextBlock = await forgeWithoutGenerator(processEnv, targetHeight, targetGenerator);

			// Make maxHeightPreviouslyForged to be current height (BFT violation) with quarter reward
			(nextBlock.header as any).reward = BigInt(125000000);
			(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
			const signature = signDataWithPrivateKey(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				dataAccess.encodeBlockHeader(nextBlock.header, true),
				getPrivateKey(target),
			);
			(nextBlock.header as any).signature = signature;

			await processEnv.process(nextBlock);
			expect(chain.lastBlock.header.id).toEqual(nextBlock.header.id);
		});
	});

	describe('when BFT protocol is violated and seed reveal is not preimage', () => {
		it('should reject a block if reward is not 0', async () => {
			await processEnv.processUntilHeight(1);
			const targetGenerator = chain.lastBlock.header.generatorPublicKey;
			const target = getAddressFromPublicKey(targetGenerator);
			// Skip forging slots until the targeted generator
			let nextBlock = await processEnv.createBlock();
			while (!nextBlock.header.generatorPublicKey.equals(targetGenerator)) {
				nextBlock = await processEnv.createBlock([], nextBlock.header.timestamp + 10);
			}

			// Make maxHeightPreviouslyForged to be current height (BFT violation) with random seed reveal and 0 reward
			(nextBlock.header as any).reward = BigInt(125000000);
			(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
			(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
			const signature = signDataWithPrivateKey(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				dataAccess.encodeBlockHeader(nextBlock.header, true),
				getPrivateKey(target),
			);
			(nextBlock.header as any).signature = signature;

			await expect(processEnv.process(nextBlock)).rejects.toThrow(
				'Invalid block reward: 125000000 expected: 0',
			);
		});

		it('should accept a block if reward is 0', async () => {
			const { lastBlock } = chain;
			await processEnv.processUntilHeight(206);
			const passphrase = await processEnv.getNextValidatorPassphrase(lastBlock.header);
			const { privateKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);
			// Forge 2 rounds of block without generator of the last block
			const nextBlock = await processEnv.createBlock();
			// Make maxHeightPreviouslyForged to be current height (BFT violation) with random seed reveal and 0 reward
			(nextBlock.header as any).reward = BigInt(0);
			(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
			(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
			const signature = signDataWithPrivateKey(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				dataAccess.encodeBlockHeader(nextBlock.header, true),
				privateKey,
			);
			(nextBlock.header as any).signature = signature;

			await processEnv.process(nextBlock);
			expect(chain.lastBlock.header.id).toEqual(nextBlock.header.id);
		});
	});
});
