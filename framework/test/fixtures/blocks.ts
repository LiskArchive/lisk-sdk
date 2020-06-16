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

import {
	getRandomBytes,
	hash,
	signDataWithPrivateKey,
	getPrivateAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { MerkleTree } from '@liskhq/lisk-tree';
import { Block, BlockHeader, Chain } from '@liskhq/lisk-chain';
import {
	BaseTransaction,
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
} from '@liskhq/lisk-transactions';
import * as genesisBlockJSON from './config/devnet/genesis_block.json';
import { BlockProcessorV2 } from '../../src/application/node/block_processor_v2';

export const defaultNetworkIdentifier = Buffer.from(
	'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e',
	'hex',
);

const getKeyPair = (): { publicKey: Buffer; privateKey: Buffer } => {
	const passphrase = Mnemonic.generateMnemonic();
	return getPrivateAndPublicKeyFromPassphrase(passphrase);
};

export const defaultBlockHeaderAssetSchema = {
	$id: 'test/defaultBlockHeaderAssetSchema',
	type: 'object',
	properties: {
		maxHeightPreviouslyForged: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		maxHeightPrevoted: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		seedReveal: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
	},
	required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
};

export const encodeValidBlockHeader = (header: BlockHeader): Buffer => {
	const chain = new Chain({
		registeredBlocks: { 2: BlockProcessorV2.schema },
		accountAsset: { schema: {}, default: {} },
	} as any);
	return chain.dataAccess.encodeBlockHeader(header);
};

export const createFakeBlockHeader = (
	header?: Partial<BlockHeader>,
): BlockHeader => {
	const blockHeader = {
		id: hash(getRandomBytes(8)),
		version: 2,
		timestamp: header?.timestamp ?? 0,
		height: header?.height ?? 0,
		previousBlockID: header?.previousBlockID ?? hash(getRandomBytes(4)),
		transactionRoot: header?.transactionRoot ?? hash(getRandomBytes(4)),
		generatorPublicKey: header?.generatorPublicKey ?? getRandomBytes(32),
		reward: header?.reward ?? BigInt(500000000),
		asset: header?.asset ?? {
			maxHeightPreviouslyForged: 0,
			maxHeightPrevoted: 0,
			seedReveal: getRandomBytes(16),
		},
		signature: header?.signature ?? getRandomBytes(64),
	};
	const id = hash(encodeValidBlockHeader(blockHeader));

	return {
		...blockHeader,
		id,
	};
};

/**
 * Utility function to create a block object with valid computed properties while any property can be overridden
 * Calculates the signature, transactionRoot etc. internally. Facilitating the creation of block with valid signature and other properties
 */
export const createValidDefaultBlock = (
	block?: { header?: Partial<BlockHeader>; payload?: BaseTransaction[] },
	networkIdentifier: Buffer = defaultNetworkIdentifier,
): Block => {
	const keypair = getKeyPair();
	const payload = block?.payload ?? [];
	const txTree = new MerkleTree(payload.map(tx => tx.id));

	const asset = {
		maxHeightPreviouslyForged: 0,
		maxHeightPrevoted: 0,
		seedReveal: getRandomBytes(16),
		...block?.header?.asset,
	};

	const blockHeader = createFakeBlockHeader({
		version: 2,
		height: 2,
		// FIXME: Genesis block hash calculated with the new implementation, need to update when updating genesis block
		previousBlockID: Buffer.from(
			'39594f0b163706bf118515c9e5a91fcfffb96f22628f1a0002deb3cee7bcf617',
			'hex',
		),
		reward: BigInt(0),
		timestamp: 1000,
		transactionRoot: txTree.root,
		generatorPublicKey: keypair.publicKey,
		...block?.header,
		asset,
	});

	const chain = new Chain({
		registeredBlocks: { 2: BlockProcessorV2.schema },
		accountAsset: { schema: {}, default: {} },
	} as any);

	const encodedHeaderWithoutSignature = chain.dataAccess.encodeBlockHeader(
		blockHeader,
		true,
	);

	const signature = signDataWithPrivateKey(
		Buffer.concat([networkIdentifier, encodedHeaderWithoutSignature]),
		keypair.privateKey,
	);
	const header = { ...blockHeader, signature };
	const encodedHeader = chain.dataAccess.encodeBlockHeader(header);
	const id = hash(encodedHeader);

	return {
		header: {
			...header,
			asset,
			id,
		},
		payload,
	};
};

export const encodeValidBlock = (block: Block): Buffer => {
	const chain = new Chain({
		registeredBlocks: { 2: BlockProcessorV2.schema },
		accountAsset: { schema: {}, default: {} },
	} as any);
	return chain.dataAccess.encode(block);
};

// FIXME: Update to new genesis block format
export const genesisBlock = (): Block => {
	const block = {
		header: {
			...genesisBlockJSON.header,
			id: Buffer.from(genesisBlockJSON.header.id, 'base64'),
			previousBlockID: Buffer.alloc(0),
			reward: BigInt(genesisBlockJSON.header.reward),
			transactionRoot: Buffer.from(
				genesisBlockJSON.header.transactionRoot,
				'base64',
			),
			generatorPublicKey: Buffer.from(
				genesisBlockJSON.header.generatorPublicKey,
				'base64',
			),
			signature: Buffer.from(genesisBlockJSON.header.signature, 'base64'),
			asset: {
				maxHeightPreviouslyForged:
					genesisBlockJSON.header.asset.maxHeightPreviouslyForged,
				maxHeightPrevoted: genesisBlockJSON.header.asset.maxHeightPrevoted,
				seedReveal: Buffer.from(
					genesisBlockJSON.header.asset.seedReveal,
					'base64',
				),
			},
		},
		payload: genesisBlockJSON.payload.map(tx => {
			if (tx.type === 8) {
				return new TransferTransaction({
					...tx,
					id: Buffer.from(tx.id, 'base64'),
					senderPublicKey: Buffer.from(tx.senderPublicKey, 'base64'),
					nonce: BigInt(tx.nonce),
					fee: BigInt(tx.fee),
					signatures: tx.signatures.map(s => Buffer.from(s, 'base64')),
					asset: {
						recipientAddress: Buffer.from(
							tx.asset.recipientAddress as string,
							'base64',
						),
						amount: BigInt(tx.asset.amount),
						data: '',
					},
				});
			}
			if (tx.type === 10) {
				return new DelegateTransaction({
					...tx,
					id: Buffer.from(tx.id, 'base64'),
					senderPublicKey: Buffer.from(tx.senderPublicKey, 'base64'),
					nonce: BigInt(tx.nonce),
					fee: BigInt(tx.fee),
					signatures: tx.signatures.map((s: string) =>
						Buffer.from(s, 'base64'),
					),
				} as any);
			}
			if (tx.type === 13) {
				return new VoteTransaction({
					...tx,
					id: Buffer.from(tx.id, 'base64'),
					senderPublicKey: Buffer.from(tx.senderPublicKey, 'base64'),
					nonce: BigInt(tx.nonce),
					fee: BigInt(tx.fee),
					signatures: tx.signatures.map((s: string) =>
						Buffer.from(s, 'base64'),
					),
					asset: {
						votes: tx.asset.votes?.map((v: any) => ({
							delegateAddress: Buffer.from(v.delegateAddress, 'base64'),
							amount: BigInt(v.amount),
						})),
					},
				} as any);
			}
			throw new Error('Unexpected transaction type');
		}),
	};
	const chain = new Chain({
		registeredBlocks: { 2: BlockProcessorV2.schema },
		accountAsset: { schema: {}, default: {} },
	} as any);
	const encodedHeader = chain.dataAccess.encodeBlockHeader(block.header);
	const id = hash(encodedHeader);
	block.header.id = id;
	return block;
};
