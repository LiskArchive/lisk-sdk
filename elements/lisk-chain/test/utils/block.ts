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
import * as genesis from '../fixtures/genesis_block.json';
import { Block, BlockHeader, GenesisBlock, GenesisBlockHeader } from '../../src/types';
import { Transaction } from '../../src/transaction';
import {
	signingBlockHeaderSchema,
	blockHeaderSchema,
	blockSchema,
	blockHeaderAssetSchema,
	getGenesisBlockHeaderAssetSchema,
} from '../../src/schema';
import { defaultAccountSchema, defaultAccountModules } from './account';
import { readGenesisBlockJSON } from '../../src';

export const defaultNetworkIdentifier = Buffer.from(
	'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e',
);

const getKeyPair = (): { publicKey: Buffer; privateKey: Buffer } => {
	const passphrase = Mnemonic.generateMnemonic();
	return getPrivateAndPublicKeyFromPassphrase(passphrase);
};

export const genesisBlockAssetSchema = getGenesisBlockHeaderAssetSchema(defaultAccountSchema);

export const genesisBlock: GenesisBlock = {
	header: {
		...genesis.header,
		id: Buffer.from(genesis.header.id, 'base64'),
		previousBlockID: Buffer.from(genesis.header.previousBlockID, 'base64'),
		transactionRoot: Buffer.from(genesis.header.transactionRoot, 'base64'),
		generatorPublicKey: Buffer.from(genesis.header.generatorPublicKey, 'base64'),
		reward: BigInt(genesis.header.reward),
		signature: Buffer.from(genesis.header.signature, 'base64'),
		asset: {
			initRounds: genesis.header.asset.initRounds,
			initDelegates: genesis.header.asset.initDelegates.map(address =>
				Buffer.from(address, 'base64'),
			),
			accounts: genesis.header.asset.accounts.map(account => ({
				address: Buffer.from(account.address, 'base64'),
				token: {
					balance: BigInt(account.token.balance),
				},
				sequence: {
					nonce: BigInt(account.sequence.nonce),
				},
				keys: {
					mandatoryKeys: account.keys.mandatoryKeys.map(key => Buffer.from(key, 'base64')),
					optionalKeys: account.keys.optionalKeys.map(key => Buffer.from(key, 'base64')),
					numberOfSignatures: account.keys.numberOfSignatures,
				},
				dpos: {
					delegate: {
						...account.dpos.delegate,
						totalVotesReceived: BigInt(account.dpos.delegate.totalVotesReceived),
					},
					sentVotes: account.dpos.sentVotes.map(vote => ({
						delegateAddress: Buffer.from(vote.delegateAddress, 'base64'),
						amount: BigInt(vote.amount),
					})),
					unlocking: account.dpos.unlocking.map(
						(unlock: { delegateAddress: string; amount: string; unvoteHeight: string }) => ({
							delegateAddress: Buffer.from(unlock.delegateAddress, 'base64'),
							amount: BigInt(unlock.amount),
							unvoteHeight: unlock.unvoteHeight,
						}),
					),
				},
			})),
		},
	},
	payload: [],
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

export const encodeGenesisBlockHeader = (header: GenesisBlockHeader): Buffer => {
	const asset = codec.encode(
		genesisBlockAssetSchema,
		(header.asset as unknown) as Record<string, unknown>,
	);
	return codec.encode(blockHeaderSchema, { ...header, asset });
};

export const encodeDefaultBlockHeader = (header: BlockHeader): Buffer => {
	const asset = codec.encode(blockHeaderAssetSchema, header.asset);
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
	block?: { header?: Partial<BlockHeader>; payload?: Transaction[] },
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
		height: 1,
		previousBlockID: genesisBlock.header.id,
		reward: BigInt(0),
		timestamp: genesisBlock.header.timestamp + 10,
		transactionRoot: txTree.root,
		generatorPublicKey: keypair.publicKey,
		...block?.header,
		asset,
	});

	const encodedAsset = codec.encode(blockHeaderAssetSchema, blockHeader.asset);
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

export const registeredBlockHeaders = {
	0: genesisBlockAssetSchema,
	2: blockHeaderAssetSchema,
};

try {
	readGenesisBlockJSON(genesis, defaultAccountModules);
} catch (error) {
	console.error(error);
}
