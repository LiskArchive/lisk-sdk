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
	hash,
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	getPrivateAndPublicKeyBytesFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const BigNum = require('@liskhq/bignum');
const genesisBlock = require('./genesis_block');
const {
	app: { genesisConfig },
	modules: {
		chain: { forging },
	},
} = require('./config');
const blocksLogic = require('../../../../src/modules/chain/blocks/block');
const {
	BlockSlots,
} = require('../../../../src/modules/chain/blocks/block_slots');
const {
	calculateMilestone,
	calculateReward,
	calculateSupply,
} = require('../../../../src/modules/chain/blocks/block_reward');

const NUMBER_OF_DELEGATE = 101;
const TOTAL_AMOUNT = '10000000000000000';

const slots = new BlockSlots({
	epochTime: genesisConfig.EPOCH_TIME,
	interval: genesisConfig.BLOCK_TIME,
	blocksPerRound: NUMBER_OF_DELEGATE,
});

const rewards = {
	distance: genesisConfig.REWARDS.DISTANCE,
	rewardOffset: genesisConfig.REWARDS.OFFSET,
	milestones: genesisConfig.REWARDS.MILESTONES,
	totalAmount: TOTAL_AMOUNT,
};

const blockReward = {
	calculateMilestone: height => calculateMilestone(height, rewards),
	calculateReward: height => calculateReward(height, rewards),
	calculateSupply: height => calculateSupply(height, rewards),
};

const keyPairs = () => {
	const { delegates, defaultPassword } = forging;
	const keypairs = delegates.map(delegate => {
		const parsedEncryptedPassphrase = parseEncryptedPassphrase(
			delegate.encryptedPassphrase
		);
		const passphrase = decryptPassphraseWithPassword(
			parsedEncryptedPassphrase,
			defaultPassword
		);
		const keyPairBuffer = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
		return {
			publicKey: keyPairBuffer.publicKeyBytes,
			privateKey: keyPairBuffer.privateKeyBytes,
		};
	});
	return keypairs;
};

const addDelegateVoteProperty = list =>
	list.map(delegate => ({
		...delegate,
		votes: TOTAL_AMOUNT,
	}));

const getDelegate = (height, timestamp, list) => {
	// get round
	const round = slots.calcRound(height);
	const seedSource = round.toString();
	const sortedDelegates = sortDelegates(list);
	const truncDelegateList = sortedDelegates.map(delegate => delegate.publicKey);
	let currentSeed = hash(seedSource, 'utf8');

	for (let i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
		for (let x = 0; x < 4 && i < delCount; i++, x++) {
			const newIndex = currentSeed[x] % delCount;
			const b = truncDelegateList[newIndex];
			truncDelegateList[newIndex] = truncDelegateList[i];
			truncDelegateList[i] = b;
		}
		currentSeed = hash(currentSeed);
	}

	const currentSlot = slots.getSlotNumber(timestamp);
	const delegateId = truncDelegateList[currentSlot % 101];
	return list.find(delegate => delegate.publicKey === delegateId);
};

const sortDelegates = delegates =>
	delegates.sort((prev, next) => {
		if (!prev.votes || !next.votes) {
			throw new Error('Delegate cannot be sorted without votes');
		}
		if (!prev.publicKey || !next.publicKey) {
			throw new Error('Delegate cannot be sorted without public key');
		}
		if (new BigNum(prev.votes).sub(next.votes).gte(1)) {
			return -1;
		}
		if (new BigNum(prev.votes).sub(next.votes).lte(-1)) {
			return 1;
		}
		if (prev.publicKey > next.publicKey) {
			return 1;
		}
		if (prev.publicKey < next.publicKey) {
			return -1;
		}

		return 0;
	});

const create = (transactions, previousBlock, height) => {
	previousBlock.height = previousBlock.height || height - 1;
	const nextTime = slots.getSlotTime(
		slots.getSlotNumber(previousBlock.timestamp) + 1
	);
	const keypair = getDelegate(
		height,
		nextTime,
		addDelegateVoteProperty(keyPairs())
	);
	// get keypair correspond to heights
	const block = blocksLogic.create({
		blockReward,
		transactions,
		previousBlock,
		keypair,
		timestamp: nextTime,
		maxPayloadLength: 1 * 10,
	});

	return {
		...block,
		totalAmount: block.totalAmount.toString(),
		totalFee: block.totalFee.toString(),
		reward: block.reward.toString(),
	};
};

module.exports = {
	genesisBlock,
	create,
};
