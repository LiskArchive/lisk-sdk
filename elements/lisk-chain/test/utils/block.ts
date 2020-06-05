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
import { codec } from '@liskhq/lisk-codec';
import { MerkleTree } from '@liskhq/lisk-tree';
import {
	BaseTransaction,
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
} from '@liskhq/lisk-transactions';
import * as genesisBlockJSON from '../fixtures/genesis_block.json';
import { Block, BlockHeader } from '../../src/types';
import {
	signingBlockHeaderSchema,
	blockHeaderSchema,
	blockSchema,
} from '../../src/schema';

export const defaultNetworkIdentifier = Buffer.from(
	'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e',
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

export const createFakeBlockHeader = <T = any>(
	header?: Partial<BlockHeader<T>>,
): BlockHeader<T> => ({
	id: hash(getRandomBytes(8)),
	version: 2,
	timestamp: header?.timestamp ?? 0,
	height: header?.height ?? 0,
	previousBlockID: header?.previousBlockID ?? hash(getRandomBytes(4)),
	transactionRoot: header?.transactionRoot ?? hash(getRandomBytes(4)),
	generatorPublicKey: header?.generatorPublicKey ?? getRandomBytes(32),
	reward: header?.reward ?? BigInt(500000000),
	asset: header?.asset ?? ({} as T),
	signature: header?.signature ?? getRandomBytes(64),
});

export const encodeDefaultBlockHeader = (header: BlockHeader): Buffer => {
	const asset = codec.encode(defaultBlockHeaderAssetSchema, header.asset);
	return codec.encode(blockHeaderSchema, { ...header, asset });
};

export const encodedDefaultBlock = (block: Block): Buffer => {
	const payload = block.payload.map(tx => tx.getBytes());
	const header = encodeDefaultBlockHeader(block.header);

	return codec.encode(blockSchema, { header, payload });
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

	const encodedAsset = codec.encode(
		defaultBlockHeaderAssetSchema,
		blockHeader.asset,
	);
	const encodedHeaderWithoutSignature = codec.encode(signingBlockHeaderSchema, {
		...blockHeader,
		asset: encodedAsset,
	});

	const signature = signDataWithPrivateKey(
		Buffer.concat([networkIdentifier, encodedHeaderWithoutSignature]),
		keypair.privateKey,
	);
	const header = { ...blockHeader, asset: encodedAsset, signature };
	const encodedHeader = codec.encode(blockHeaderSchema, header);
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

// FIXME: Update to new genesis block format
export const genesisBlock = (): Block => {
	const block = {
		header: {
			id: Buffer.from(genesisBlockJSON.id, 'hex'),
			version: genesisBlockJSON.version,
			height: genesisBlockJSON.height,
			previousBlockID: Buffer.from(genesisBlockJSON.id, 'hex'),
			reward: BigInt(genesisBlockJSON.reward),
			timestamp: genesisBlockJSON.timestamp,
			transactionRoot: Buffer.from(genesisBlockJSON.transactionRoot, 'hex'),
			generatorPublicKey: Buffer.from(
				genesisBlockJSON.generatorPublicKey,
				'hex',
			),
			signature: Buffer.from(genesisBlockJSON.blockSignature, 'hex'),
			asset: {
				maxHeightPreviouslyForged: genesisBlockJSON.maxHeightPreviouslyForged,
				maxHeightPrevoted: genesisBlockJSON.maxHeightPrevoted,
				seedReveal: Buffer.from(genesisBlockJSON.seedReveal, 'hex'),
			},
		},
		payload: genesisBlockJSON.transactions.map(tx => {
			if (tx.type === 8) {
				return new TransferTransaction({
					...tx,
					id: Buffer.from(tx.id, 'hex'),
					senderPublicKey: Buffer.from(tx.senderPublicKey, 'hex'),
					nonce: BigInt(tx.nonce),
					fee: BigInt(tx.fee),
					signatures: tx.signatures.map(s => Buffer.from(s, 'hex')),
					asset: {
						recipientAddress: Buffer.from(
							tx.asset.recipientId as string,
							'hex',
						),
						amount: BigInt(tx.asset.amount),
						data: '',
					},
				});
			}
			if (tx.type === 10) {
				return new DelegateTransaction({
					...tx,
					id: Buffer.from(tx.id, 'hex'),
					senderPublicKey: Buffer.from(tx.senderPublicKey, 'hex'),
					nonce: BigInt(tx.nonce),
					fee: BigInt(tx.fee),
					signatures: tx.signatures.map(s => Buffer.from(s, 'hex')),
				} as any);
			}
			if (tx.type === 13) {
				return new VoteTransaction({
					...tx,
					id: Buffer.from(tx.id, 'hex'),
					senderPublicKey: Buffer.from(tx.senderPublicKey, 'hex'),
					nonce: BigInt(tx.nonce),
					fee: BigInt(tx.fee),
					signatures: tx.signatures.map(s => Buffer.from(s, 'hex')),
					asset: {
						votes: tx.asset.votes?.map(v => ({
							delegateAddress: Buffer.from(v.delegateAddress, 'hex'),
							amount: BigInt(v.amount),
						})) as any,
					},
				});
			}
			throw new Error('Unexpected transaction type');
		}),
	};
	const encodedHeader = encodeDefaultBlockHeader(block.header);
	const id = hash(encodedHeader);
	block.header.id = id;
	return block;
};
