/*
 * Copyright © 2022 Lisk Foundation
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
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { encodeBlock } from '../../../../src/engine/legacy/codec';
import { LegacyBlockHeader, LegacyBlockWithID } from '../../../../src/engine/legacy/types';

// Version 2 blocks
export const blockFixtures = [
	{
		header: {
			id: Buffer.from('7866ac51d17ef72bf6937130e0602df0e16a8dcfd2627560c70dde9898e426a5', 'hex'),
			version: 2,
			timestamp: 1663169830,
			height: 19583714,
			previousBlockID: Buffer.from(
				'b458e2fca72c45126e14a61ed04158121c920151c47113c873eb6c770a4f0187',
				'hex',
			),
			transactionRoot: Buffer.from(
				'1fc8efa3c62e1bca9e7a91f63e3050805ef3d55ec476df41d2a0c1eb4781be77',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'c93a0176fb162c4c571c44d2875da82fb3d1a56fd2b721e4ae33346d211c8a4d',
				'hex',
			),
			reward: BigInt(100000000),
			asset: Buffer.from('08b0a5ab091094a5ab091a1001dc1fe309769dfd3b806035e89436c6', 'hex'),
			signature: Buffer.from(
				'2723428c12f37776ee8f460f9272a8c319657eee6ab477d3d850c6df461ec49848747857ccf842d2e5b17139fa98142f48698d3bad6d02eda6f6c2d1ec1e720b',
				'hex',
			),
		},
		transactions: [
			Buffer.from(
				'0802100018950b2090a10f2a20fdb1de14521b437e61a89d1a2c54f20eef3a897819269ddfed7c2c6f6372ec85322e08e7f6e35e12142d84df54c6465a06069e3e5b566086f827acf4261a11726f62696e686f6f64207061796f7574733a40ce3761c3bd3c7e1e39cf370dc82d11e84f3b1ec85175aad5f004d41de4ec04a6cf0ae4e0f2ed8ad98ce4b93eaafab48f11aeb0dd6b4942d8e0ed0fdf88648e04',
				'hex',
			),
		],
	},
	{
		header: {
			version: 2,
			timestamp: 1663169840,
			height: 19583715,
			previousBlockID: Buffer.from(
				'7866ac51d17ef72bf6937130e0602df0e16a8dcfd2627560c70dde9898e426a5',
				'hex',
			),
			transactionRoot: Buffer.from(
				'80683eece5491fb875566d0b68246e47bda5bae7269766d3437d668a27d7136e',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'fbac76743fad9448ed0b45fb4c97a62f81a358908aa14f6a2c76d2a8dc207141',
				'hex',
			),
			reward: BigInt('100000000'),
			asset: Buffer.from('0880a5ab091094a5ab091a10a15dd87df61606cd474f1038af29d5b3', 'hex'),
			signature: Buffer.from(
				'31c75cd21a676f19a3e5c72afd941a1c75bfb6f8088c15ea64c5e91c1e0fc37636e9a14b897b0dc61075db851fe0ba2b9c7b383eeb30d05d5dc846991aaa9108',
				'hex',
			),
			id: Buffer.from('31636e108a3ee5d22672631c582dbd8e06576b932f3cd303144abf165a3bc84d', 'hex'),
		},
		transactions: [
			Buffer.from(
				'0802100018960b2090a10f2a20fdb1de14521b437e61a89d1a2c54f20eef3a897819269ddfed7c2c6f6372ec85322e08e7f6e35e1214ef93860e2196de35f10cdf1b8b17adff7129dae41a11726f62696e686f6f64207061796f7574733a403f2c770abe2f6ad25bce6d83f8b51e8713554bc314042cbce86ff7f5033fdff6f041ad41af0ccb42d946c8c42b95d5f4aab90db6f5b3cef067385fe2c39c5309',
				'hex',
			),
		],
	},
];

export const createFakeLegacyBlockHeaderV2 = (
	header?: Partial<LegacyBlockHeader>,
	transactions?: Buffer[],
): LegacyBlockWithID => {
	const transactionRoot = transactions
		? regularMerkleTree.calculateMerkleRootWithLeaves(transactions.map(tx => utils.hash(tx)))
		: utils.hash(utils.getRandomBytes(32));

	const blockHeader = {
		version: 2,
		timestamp: header?.timestamp ?? 0,
		height: header?.height ?? 0,
		previousBlockID: header?.previousBlockID ?? utils.hash(utils.getRandomBytes(32)),
		transactionRoot,
		generatorPublicKey: header?.generatorPublicKey ?? utils.getRandomBytes(32),
		reward: header?.reward ?? BigInt(500000000),
		asset: header?.asset ?? utils.getRandomBytes(20),
		signature: header?.signature ?? utils.getRandomBytes(64),
	};
	const id = utils.hash(encodeBlock({ header: blockHeader, transactions: transactions ?? [] }));

	return {
		header: { ...blockHeader, id },
		transactions: transactions ?? [],
	};
};

/**
 * @params start: Start height of the block range going backwards
 * @params numberOfBlocks: Number of blocks to be generated with decreasing height
 * */
export const getLegacyBlocksRangeV2 = (start: number, numberOfBlocks: number): Buffer[] => {
	const blocks: LegacyBlockWithID[] = [];

	for (let i = start; i >= start - numberOfBlocks; i -= 1) {
		// After the startHeight, all the blocks are generated with previousBlockID as previous height block ID
		const block = createFakeLegacyBlockHeaderV2({
			height: i,
			previousBlockID: i === start ? utils.getRandomBytes(32) : blocks[start - i - 1].header.id,
		});
		blocks.push(block);
	}

	return blocks.map(b => encodeBlock(b));
};
