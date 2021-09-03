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

import { RawBlock, TransactionJSON } from '@liskhq/lisk-chain';
import { RegisteredSchema } from '../types';

interface DefaultAccountJSON {
	[name: string]: { [key: string]: unknown } | undefined;
}

type AccountJSON<T = DefaultAccountJSON> = T & { address: string };

interface BlockJSON {
	readonly header: BlockHeaderJSON;
	readonly payload: ReadonlyArray<TransactionJSON>;
}

interface BaseBlockHeaderJSON {
	readonly id: string;
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly previousBlockID: string;
	readonly transactionRoot: string;
	readonly generatorPublicKey: string;
	readonly reward: string;
	readonly signature: string;
	readonly asset: string;
}

export type BlockHeaderJSON = Omit<BaseBlockHeaderJSON, 'asset'> & { asset: BlockAssetJSON };

interface BlockAssetJSON {
	readonly seedReveal: string;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
}

export interface PluginCodec {
	decodeAccount: <T = DefaultAccountJSON>(data: Buffer | string) => AccountJSON<T>;
	decodeBlock: (data: Buffer | string) => BlockJSON;
	decodeRawBlock: (data: Buffer | string) => RawBlock;
	decodeTransaction: (data: Buffer | string) => TransactionJSON;
	encodeTransaction: (transaction: TransactionJSON) => string;
}

export const createPluginCodec = (_schemas: RegisteredSchema): PluginCodec => {
	const pluginCodec = {
		// decodeAccount: <K = DefaultAccountJSON>(data: Buffer | string): AccountJSON<K> => {
		// 	const accountBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
		// 	return decodeAccountToJSON(accountBuffer, schemas.account);
		// },
		// decodeBlock: (data: Buffer | string): BlockJSON => {
		// 	const blockBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
		// 	return decodeBlockToJSON(schemas, blockBuffer);
		// },
		// decodeRawBlock: (data: Buffer | string): RawBlock => {
		// 	const blockBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
		// 	return decodeRawBlock(schemas.block, blockBuffer);
		// },
		// decodeTransaction: (data: Buffer | string): TransactionJSON => {
		// 	const transactionBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
		// 	return decodeTransactionToJSON(
		// 		transactionBuffer,
		// 		schemas.transaction,
		// 		schemas.transactionsAssets,
		// 	);
		// },
		// encodeTransaction: (transaction: TransactionJSON): string =>
		// 	encodeTransactionFromJSON(transaction, schemas.transaction, schemas.transactionsAssets),
	} as PluginCodec;

	return pluginCodec;
};

// const decodeTransactionToJSON = (
// 	transactionBuffer: Buffer,
// 	baseSchema: Schema,
// 	assetsSchemas: RegisteredSchema['transactionsAssets'],
// ): TransactionJSON => {
// 	const baseTransaction = codec.decodeJSON<BaseTransactionJSON>(baseSchema, transactionBuffer);

// 	const transactionTypeAsset = assetsSchemas.find(
// 		s => s.assetID === baseTransaction.assetID && s.moduleID === baseTransaction.moduleID,
// 	);

// 	if (!transactionTypeAsset) {
// 		throw new Error('Transaction type not found.');
// 	}

// 	const transactionAsset = codec.decodeJSON<object>(
// 		transactionTypeAsset.schema,
// 		Buffer.from(baseTransaction.asset, 'hex'),
// 	);

// 	return {
// 		...baseTransaction,
// 		id: hash(transactionBuffer).toString('hex'),
// 		asset: transactionAsset,
// 	};
// };

// const encodeTransactionFromJSON = (
// 	transaction: TransactionJSON,
// 	baseSchema: Schema,
// 	assetsSchemas: RegisteredSchema['transactionsAssets'],
// ): string => {
// 	const transactionTypeAsset = assetsSchemas.find(
// 		s => s.assetID === transaction.assetID && s.moduleID === transaction.moduleID,
// 	);

// 	if (!transactionTypeAsset) {
// 		throw new Error('Transaction type not found.');
// 	}

// 	const transactionAssetBuffer = codec.encode(
// 		transactionTypeAsset.schema,
// 		codec.fromJSON(transactionTypeAsset.schema, transaction.asset),
// 	);

// 	const transactionBuffer = codec.encode(
// 		baseSchema,
// 		codec.fromJSON(baseSchema, {
// 			...transaction,
// 			asset: transactionAssetBuffer,
// 		}),
// 	);

// 	return transactionBuffer.toString('hex');
// };

// const decodeAccountToJSON = <T = DefaultAccountJSON>(
// 	encodedAccount: Buffer,
// 	accountSchema: Schema,
// ): AccountJSON<T> => {
// 	const decodedAccount = codec.decodeJSON<AccountJSON<T>>(accountSchema, encodedAccount);

// 	return {
// 		...decodedAccount,
// 	};
// };

// const decodeRawBlock = (blockSchema: Schema, encodedBlock: Buffer): RawBlock =>
// 	codec.decode<RawBlock>(blockSchema, encodedBlock);

// const decodeBlockToJSON = (registeredSchema: RegisteredSchema, encodedBlock: Buffer): BlockJSON => {
// 	const { header, payload } = codec.decode<RawBlock>(registeredSchema.block, encodedBlock);

// 	const baseHeaderJSON = codec.decodeJSON<BaseBlockHeaderJSON>(
// 		registeredSchema.blockHeader,
// 		header,
// 	);
// 	const blockAssetJSON = codec.decodeJSON<BlockAssetJSON>(
// 		registeredSchema.blockHeadersAssets[baseHeaderJSON.version],
// 		Buffer.from(baseHeaderJSON.asset, 'hex'),
// 	);
// 	const payloadJSON = payload.map(transactionBuffer =>
// 		decodeTransactionToJSON(
// 			transactionBuffer,
// 			registeredSchema.transaction,
// 			registeredSchema.transactionsAssets,
// 		),
// 	);

// 	const blockId = hash(header);

// 	return {
// 		header: { ...baseHeaderJSON, asset: { ...blockAssetJSON }, id: blockId.toString('hex') },
// 		payload: payloadJSON,
// 	};
// };
