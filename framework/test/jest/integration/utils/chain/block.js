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
 *
 */

'use strict';

const {
	getDelegateKeypairForCurrentSlot,
} = require('../../../../../src/modules/chain/forger');

const processBlock = async (chainModule, block) =>
	chainModule.blocks.processBlock(block);

const deleteLastBlock = async chainModule => chainModule.blocks.recoverChain();

/**
 * Generates a valid block with transactions if you don't pass any properties.
 * You can try to mess with generation of invalid/non-standard blocks by overriding
 * any of the listed properties.
 * Properties depend on each other - usually to get a keypair you have to calculate slot before, to which you need a timeout.
 * Useful for arguments generation in fork-choice rules test scenarios.
 * @param forger
 * @param transactions
 * @param properties {{
 *    previousBlock: Object,
 *    height: number,
 *    slot: number,
 *    round: number,
 *    timestamp: number,
 *    keypair: {publicKey: Buffer<32>, privateKey: Buffer<64>}
 *  }}
 * @returns {Promise<*>}
 */
const generateBlock = async (forger, transactions, properties = {}) => {
	const defaultsNoDeps = {
		previousBlock: forger.blocksModule.lastBlock,
		height: forger.blocksModule.lastBlock.height,
	};

	const defaultsDeps = {
		slot:
			forger.slots.getSlotNumber(defaultsNoDeps.previousBlock.timestamp) + 1,
		round: forger.slots.calcRound(defaultsNoDeps.height + 1),
	};

	const defaults2xDeps = {
		timestamp: forger.slots.getSlotTime(defaultsDeps.slot),
		keypair: await getDelegateKeypairForCurrentSlot(
			forger.dposModule,
			forger.keypairs,
			defaultsDeps.slot,
			defaultsDeps.round,
			forger.constants.activeDelegates,
		),
	};

	const { previousBlock, timestamp, height, keypair } = {
		...defaults2xDeps,
		...defaultsDeps,
		...defaultsNoDeps,
		...properties,
	};

	return forger.processorModule.create({
		height,
		keypair,
		timestamp,
		transactions,
		previousBlock,
	});
};

/**
 * Apply block to both application state and database by calling forger.processorModule.process.
 * @param forger
 * @param block
 * @returns {Promise<boolean>} was the block applied?
 */
const applyBlock = async (forger, block) => {
	await forger.processorModule.process(block);
	return block.height === forger.blocksModule.lastBlock.height;
};

/**
 * Generate and apply block in one go. Return last block - ignore applyBlock boolean result.
 * @throws when processor.process throws
 * @param forger
 * @param transactions
 * @param properties
 * @returns {Promise<lastBlock>}
 */
const generateAndApplyBlock = async (forger, transactions, properties = {}) => {
	await applyBlock(
		forger,
		await generateBlock(forger, transactions, properties),
	);
	return forger.blocksModule.lastBlock;
};

module.exports = {
	processBlock,
	deleteLastBlock,
	generateBlock,
	applyBlock,
	generateAndApplyBlock,
};
