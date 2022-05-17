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
 *
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Block, BlockHeader, Transaction, BlockHeaderAttrs, BlockAssets } from '@liskhq/lisk-chain';
import {
	getAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	getRandomBytes,
	hash,
} from '@liskhq/lisk-cryptography';
import { MerkleTree } from '@liskhq/lisk-tree';

interface CreateBlock {
	passphrase: string;
	networkIdentifier: Buffer;
	timestamp: number;
	previousBlockID: Buffer;
	transactions?: Transaction[];
	header?: Partial<BlockHeader>;
	assets?: BlockAssets;
}

export const createBlockHeaderWithDefaults = (header?: Partial<BlockHeaderAttrs>): BlockHeader =>
	new BlockHeader({
		version: header?.version ?? 2,
		timestamp: header?.timestamp ?? 0,
		height: header?.height ?? 1,
		previousBlockID: header?.previousBlockID ?? hash(getRandomBytes(4)),
		transactionRoot: header?.transactionRoot ?? hash(getRandomBytes(4)),
		stateRoot: header?.stateRoot ?? hash(getRandomBytes(4)),
		eventRoot: header?.eventRoot ?? hash(getRandomBytes(4)),
		generatorAddress: header?.generatorAddress ?? getRandomBytes(32),
		aggregateCommit: header?.aggregateCommit ?? {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		maxHeightGenerated: header?.maxHeightGenerated ?? 0,
		maxHeightPrevoted: header?.maxHeightPrevoted ?? 0,
		assetsRoot: header?.assetsRoot ?? hash(getRandomBytes(4)),
		validatorsHash: header?.validatorsHash ?? hash(getRandomBytes(4)),
	});

export const createFakeBlockHeader = (header?: Partial<BlockHeaderAttrs>): BlockHeader => {
	const headerWithDefault = createBlockHeaderWithDefaults(header);
	const { privateKey } = getPrivateAndPublicKeyFromPassphrase(getRandomBytes(10).toString('hex'));
	headerWithDefault.sign(getRandomBytes(32), privateKey);
	return headerWithDefault;
};

export const createBlock = async ({
	passphrase,
	networkIdentifier,
	timestamp,
	previousBlockID,
	transactions,
	assets,
	header,
}: CreateBlock): Promise<Block> => {
	const { publicKey, privateKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);
	const txTree = new MerkleTree();
	await txTree.init(transactions?.map(tx => tx.id) ?? []);

	const blockHeader = createBlockHeaderWithDefaults({
		previousBlockID,
		timestamp,
		transactionRoot: header?.transactionRoot ?? txTree.root,
		eventRoot: header?.eventRoot,
		stateRoot: header?.stateRoot,
		generatorAddress: getAddressFromPublicKey(publicKey),
		...header,
	});

	blockHeader.sign(networkIdentifier, privateKey);

	return new Block(blockHeader, transactions ?? [], assets ?? new BlockAssets());
};
