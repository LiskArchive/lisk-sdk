/*
 * Copyright © 2019 Lisk Foundation
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

import { utils, address, legacy } from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { MerkleTree } from '@liskhq/lisk-tree';
import { Block, BlockAssets, BlockHeader, BlockHeaderAttrs, Transaction } from '@liskhq/lisk-chain';

export const defaultChainID = Buffer.from('1000000', 'hex');

export const genesisBlock = (): Block => {
	const header = new BlockHeader({
		generatorAddress: Buffer.alloc(0),
		height: 0,
		version: 0,
		previousBlockID: utils.getRandomBytes(32),
		timestamp: Math.floor(Date.now() / 1000 - 24 * 60 * 60),
		stateRoot: utils.hash(Buffer.alloc(0)),
		eventRoot: utils.hash(Buffer.alloc(0)),
		maxHeightGenerated: 0,
		maxHeightPrevoted: 0,
		impliesMaxPrevotes: true,
		assetRoot: utils.hash(Buffer.alloc(0)),
		validatorsHash: utils.getRandomBytes(32),
		aggregateCommit: {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		transactionRoot: utils.hash(Buffer.alloc(0)),
		signature: Buffer.alloc(0),
	});

	return new Block(header, [], new BlockAssets());
};

const getKeyPair = (): { publicKey: Buffer; privateKey: Buffer } => {
	const passphrase = Mnemonic.generateMnemonic();
	return legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
};

export const createFakeBlockHeader = (header?: Partial<BlockHeaderAttrs>): BlockHeader =>
	new BlockHeader({
		version: 2,
		timestamp: header?.timestamp ?? 0,
		impliesMaxPrevotes: header?.impliesMaxPrevotes ?? true,
		height: header?.height ?? 0,
		previousBlockID: header?.previousBlockID ?? utils.hash(utils.getRandomBytes(4)),
		transactionRoot: header?.transactionRoot ?? utils.hash(utils.getRandomBytes(4)),
		maxHeightGenerated: header?.maxHeightGenerated ?? 0,
		maxHeightPrevoted: header?.maxHeightPrevoted ?? 0,
		assetRoot: header?.assetRoot ?? utils.hash(utils.getRandomBytes(4)),
		aggregateCommit: header?.aggregateCommit ?? {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		validatorsHash: header?.validatorsHash ?? utils.getRandomBytes(32),
		stateRoot: header?.stateRoot ?? utils.hash(utils.getRandomBytes(4)),
		eventRoot: header?.eventRoot ?? utils.hash(utils.getRandomBytes(4)),
		generatorAddress: header?.generatorAddress ?? utils.getRandomBytes(32),
		signature: header?.signature ?? utils.getRandomBytes(64),
	});

/**
 * Utility function to create a block object with valid computed properties while any property can be overridden
 * Calculates the signature, transactionRoot etc. internally. Facilitating the creation of block with valid signature and other properties
 */
export const createValidDefaultBlock = async (
	block?: {
		header?: Partial<BlockHeaderAttrs>;
		transactions?: Transaction[];
		assets?: BlockAssets;
	},
	chainID: Buffer = defaultChainID,
): Promise<Block> => {
	const keypair = getKeyPair();
	const transactions = block?.transactions ?? [];
	const txTree = new MerkleTree();
	await txTree.init(transactions.map(tx => tx.id));

	const blockHeader = new BlockHeader({
		version: 2,
		height: 1,
		previousBlockID: genesisBlock().header.id,
		impliesMaxPrevotes: true,
		timestamp: 1000,
		transactionRoot: txTree.root,
		stateRoot: utils.getRandomBytes(32),
		eventRoot: utils.getRandomBytes(32),
		generatorAddress: address.getAddressFromPublicKey(keypair.publicKey),
		aggregateCommit: {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		assetRoot: utils.hash(Buffer.alloc(0)),
		maxHeightPrevoted: 0,
		maxHeightGenerated: 0,
		validatorsHash: utils.getRandomBytes(32),
		...block?.header,
	});

	blockHeader.sign(chainID, keypair.privateKey);

	// Assigning the id ahead
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	blockHeader.id;
	return new Block(blockHeader, transactions, block?.assets ?? new BlockAssets());
};
