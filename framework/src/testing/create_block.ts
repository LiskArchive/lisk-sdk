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
import {
	Block,
	BlockHeader,
	BlockHeaderAsset,
	signingBlockHeaderSchema,
	blockHeaderSchema,
	blockHeaderAssetSchema,
	Transaction,
	TAG_BLOCK_HEADER,
} from '@liskhq/lisk-chain';
import {
	getPrivateAndPublicKeyFromPassphrase,
	getRandomBytes,
	hash,
	signDataWithPrivateKey,
} from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { objects } from '@liskhq/lisk-utils';
import { MerkleTree } from '@liskhq/lisk-tree';

interface CreateBlock<T = BlockHeaderAsset> {
	passphrase: string;
	networkIdentifier: Buffer;
	timestamp: number;
	previousBlockID: Buffer;
	payload?: Transaction[];
	header?: Partial<BlockHeader<T>>;
}

export const encodeBlockHeader = (header: BlockHeader, skipSignature = false): Buffer => {
	const encodedAsset = codec.encode(blockHeaderAssetSchema, header.asset);
	const rawHeader = { ...header, asset: encodedAsset };
	const schema = skipSignature ? signingBlockHeaderSchema : blockHeaderSchema;

	return codec.encode(schema, rawHeader);
};

export const createBlockHeaderWithDefaults = <T = unknown>(
	header?: Partial<BlockHeader<T>>,
): Partial<BlockHeader<T>> => ({
	version: header?.version ?? 2,
	timestamp: header?.timestamp ?? 0,
	height: header?.height ?? 1,
	previousBlockID: header?.previousBlockID ?? hash(getRandomBytes(4)),
	transactionRoot: header?.transactionRoot ?? hash(getRandomBytes(4)),
	generatorPublicKey: header?.generatorPublicKey ?? getRandomBytes(32),
	reward: header?.reward ?? BigInt(0),
	asset: (header?.asset ?? {
		maxHeightPreviouslyForged: 0,
		maxHeightPrevoted: 0,
		seedReveal: getRandomBytes(16),
	}) as T,
});

export const createFakeBlockHeader = <T = unknown>(
	header?: Partial<BlockHeader<T>>,
): BlockHeader<T> => {
	const headerWithDefault = createBlockHeaderWithDefaults(header);
	const headerWithSignature = objects.mergeDeep({}, headerWithDefault, {
		signature: getRandomBytes(64),
	}) as BlockHeader;
	const id = hash(encodeBlockHeader(headerWithSignature));

	return ({
		...headerWithSignature,
		id,
	} as unknown) as BlockHeader<T>;
};

export const createBlock = <T = BlockHeaderAsset>({
	passphrase,
	networkIdentifier,
	timestamp,
	previousBlockID,
	payload,
	header,
}: CreateBlock<T>): Block<T> => {
	const { publicKey, privateKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);
	const txTree = new MerkleTree(payload?.map(tx => tx.id));

	const asset = {
		maxHeightPreviouslyForged: 0,
		maxHeightPrevoted: 0,
		seedReveal: getRandomBytes(16),
		...header?.asset,
	};

	const blockHeader = createBlockHeaderWithDefaults({
		previousBlockID,
		timestamp,
		transactionRoot: header?.transactionRoot ?? txTree.root,
		generatorPublicKey: publicKey,
		...header,
		asset,
	});

	const headerBytesWithoutSignature = encodeBlockHeader(blockHeader as BlockHeader, true);
	const signature = signDataWithPrivateKey(
		TAG_BLOCK_HEADER,
		networkIdentifier,
		headerBytesWithoutSignature,
		privateKey,
	);
	const headerBytes = encodeBlockHeader({
		...(blockHeader as BlockHeader),
		signature,
	});
	const id = hash(headerBytes);

	const block = {
		header: {
			...blockHeader,
			signature,
			id,
		},
		payload,
	};

	return (block as unknown) as Block<T>;
};
