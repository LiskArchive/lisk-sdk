/*
 * Copyright © 2020 Lisk Foundation
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

import { codec, Schema } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import {
	Block,
	BlockAsset,
	BlockAssetJSON,
	BlockHeader,
	BlockHeaderJSON,
	BlockJSON,
	DecodedBlock,
	DecodedBlockAsset,
	DecodedBlockAssetJSON,
	DecodedBlockJSON,
	DecodedTransaction,
	DecodedTransactionJSON,
	ModuleMetadata,
	RegisteredSchemas,
	Transaction,
	TransactionJSON,
} from './types';

export const getTransactionParamsSchema = (
	transaction: { module: string; command: string },
	metadata: ModuleMetadata[],
): Schema => {
	const moduleMeta = metadata.find(meta => meta.name === transaction.module);
	if (!moduleMeta) {
		throw new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`Module: ${transaction.module} is not registered.`,
		);
	}
	const commandMeta = moduleMeta.commands.find(meta => meta.name === transaction.command);
	if (!commandMeta) {
		throw new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`Module: ${transaction.module} CommandID: ${transaction.command} is not registered.`,
		);
	}
	return commandMeta.params;
};

export const getAssetDataSchema = (
	blockVersion: number,
	asset: { module: string },
	metadata: ModuleMetadata[],
): Schema => {
	const moduleMeta = metadata.find(meta => meta.name === asset.module);
	if (!moduleMeta) {
		throw new Error(`Asset schema Module: ${asset.module} is not registered.`);
	}
	const assetMeta = moduleMeta.assets.find(meta => meta.version === blockVersion);
	if (!assetMeta) {
		throw new Error(
			`Asset schema for Module: ${asset.module} Version: ${blockVersion} is not registered.`,
		);
	}
	return assetMeta.data;
};

export const decodeTransactionParams = <T>(
	transaction: DecodedTransaction<T> | Transaction,
	metadata: ModuleMetadata[],
): DecodedTransaction<T> => {
	if (!Buffer.isBuffer(transaction.params)) {
		return transaction as DecodedTransaction<T>;
	}

	const paramsSchema = getTransactionParamsSchema(transaction, metadata);
	return {
		...transaction,
		params: codec.decode<T>(paramsSchema, transaction.params),
	};
};

export const decodeTransaction = <T = Record<string, unknown>>(
	encodedTransaction: Buffer,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedTransaction<T> => {
	const transaction = codec.decode<Transaction>(registeredSchema.transaction, encodedTransaction);
	const paramsSchema = getTransactionParamsSchema(transaction, metadata);
	const params = codec.decode<T>(paramsSchema, transaction.params);
	const id = utils.hash(encodedTransaction);
	return {
		...transaction,
		params,
		id,
	};
};

export const encodeTransaction = (
	transaction: DecodedTransaction | Transaction,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): Buffer => {
	let encodedParams;
	if (!Buffer.isBuffer(transaction.params)) {
		const paramsSchema = getTransactionParamsSchema(transaction, metadata);
		encodedParams = codec.encode(paramsSchema, transaction.params);
	} else {
		encodedParams = transaction.params;
	}

	const decodedTransaction = codec.encode(registeredSchema.transaction, {
		...transaction,
		params: encodedParams,
	});

	return decodedTransaction;
};

export const fromTransactionJSON = <T = Record<string, unknown>>(
	transaction: TransactionJSON | DecodedTransactionJSON,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedTransaction<T> => {
	const paramsSchema = getTransactionParamsSchema(transaction, metadata);
	const tx = codec.fromJSON<Transaction>(registeredSchema.transaction, {
		...transaction,
		params: '',
	});
	let params: T;
	if (typeof transaction.params === 'string') {
		params = codec.decode<T>(paramsSchema, Buffer.from(transaction.params, 'hex'));
	} else {
		params = codec.fromJSON<T>(paramsSchema, transaction.params);
	}

	return {
		...tx,
		id: transaction.id ? Buffer.from(transaction.id, 'hex') : Buffer.alloc(0),
		params,
	};
};

export const toTransactionJSON = <T = Record<string, unknown>>(
	transaction: DecodedTransaction<T> | Transaction,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedTransactionJSON<T> => {
	const paramsSchema = getTransactionParamsSchema(transaction, metadata);
	if (Buffer.isBuffer(transaction.params)) {
		return {
			...codec.toJSON(registeredSchema.transaction, transaction),
			params: codec.decodeJSON(paramsSchema, transaction.params),
			id: transaction.id.toString('hex'),
		};
	}
	return {
		...codec.toJSON(registeredSchema.transaction, {
			...transaction,
			params: Buffer.alloc(0),
		}),
		params: codec.toJSON(paramsSchema, transaction.params as Record<string, unknown>),
		id: transaction.id.toString('hex'),
	};
};

export const decodeAssets = (
	blockVersion: number,
	encodedAssets: Buffer[],
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedBlockAsset[] => {
	const assets = encodedAssets.map(asset =>
		codec.decode<BlockAsset>(registeredSchema.asset, asset),
	);
	const decodedAssets: DecodedBlockAsset[] = [];
	for (const asset of assets) {
		const assetSchema = getAssetDataSchema(blockVersion, { module: asset.module }, metadata);
		const decodedData = codec.decode<Record<string, unknown>>(assetSchema, asset.data);
		decodedAssets.push({
			...asset,
			data: decodedData,
		});
	}
	return decodedAssets;
};

export const encodeAssets = (
	blockVersion: number,
	assets: (DecodedBlockAsset | BlockAsset)[],
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): Buffer[] => {
	const result: Buffer[] = [];
	for (const asset of assets) {
		let encodedData;
		if (!Buffer.isBuffer(asset.data)) {
			const dataSchema = getAssetDataSchema(blockVersion, { module: asset.module }, metadata);
			encodedData = codec.encode(dataSchema, asset.data);
		} else {
			encodedData = asset.data;
		}
		const encodedAsset = codec.encode(registeredSchema.asset, {
			...asset,
			data: encodedData,
		});
		result.push(encodedAsset);
	}

	return result;
};

export const fromBlockAssetJSON = <T = Record<string, unknown>>(
	blockVersion: number,
	asset: BlockAssetJSON | DecodedBlockAssetJSON,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedBlockAsset<T> => {
	const dataSchema = getAssetDataSchema(blockVersion, asset, metadata);
	if (typeof asset.data === 'string') {
		return {
			...codec.fromJSON(registeredSchema.asset, asset),
			data: codec.decode<T>(dataSchema, Buffer.from(asset.data, 'hex')),
		};
	}
	return {
		...codec.fromJSON(registeredSchema.asset, { ...asset, data: '' }),
		data: codec.fromJSON<T>(dataSchema, asset.data),
	};
};

export const toBlockAssetJSON = <T = Record<string, unknown>>(
	blockVersion: number,
	asset: BlockAsset | DecodedBlockAsset,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedBlockAssetJSON<T> => {
	const dataSchema = getAssetDataSchema(blockVersion, { module: asset.module }, metadata);
	if (Buffer.isBuffer(asset.data)) {
		return {
			...codec.toJSON(registeredSchema.asset, asset),
			data: codec.decodeJSON<T>(dataSchema, asset.data),
		};
	}
	return {
		...codec.toJSON(registeredSchema.asset, { ...asset, data: Buffer.alloc(0) }),
		data: codec.toJSON<T>(dataSchema, asset.data),
	};
};

export const decodeBlock = (
	encodedBlock: Buffer,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedBlock => {
	const block = codec.decode<{ header: Buffer; assets: Buffer[]; transactions: Buffer[] }>(
		registeredSchema.block,
		encodedBlock,
	);

	const header = codec.decode<BlockHeader>(registeredSchema.header, block.header);
	const id = utils.hash(block.header);
	const transactions = [];
	for (const tx of block.transactions) {
		transactions.push(decodeTransaction(tx, registeredSchema, metadata));
	}
	const decodedAssets = decodeAssets(header.version, block.assets, registeredSchema, metadata);

	return {
		header: {
			...header,
			id,
		},
		assets: decodedAssets,
		transactions,
	};
};

export const encodeBlock = (
	block: {
		header: BlockHeader;
		transactions: (DecodedTransaction | Transaction)[];
		assets: (DecodedBlockAsset | BlockAsset)[];
	},
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): Buffer => {
	const encodedTransactions = block.transactions.map(p =>
		encodeTransaction(p, registeredSchema, metadata),
	);
	const encodedAssets = encodeAssets(
		block.header.version,
		block.assets,
		registeredSchema,
		metadata,
	);
	const encodedBlockHeader = codec.encode(registeredSchema.header, block.header);

	return codec.encode(registeredSchema.block, {
		header: encodedBlockHeader,
		transactions: encodedTransactions,
		assets: encodedAssets,
	});
};

export const fromBlockJSON = (
	block: BlockJSON | DecodedBlockJSON,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedBlock => {
	const header = codec.fromJSON<BlockHeader>(registeredSchema.header, block.header);
	const id = utils.hash(codec.encode(registeredSchema.header, header));
	const transactions = [];
	for (const transaction of block.transactions) {
		transactions.push(fromTransactionJSON(transaction, registeredSchema, metadata));
	}
	const assets = [];
	for (const asset of block.assets) {
		assets.push(fromBlockAssetJSON(header.version, asset, registeredSchema, metadata));
	}

	return {
		header: {
			...header,
			id,
		},
		transactions,
		assets,
	};
};

export const toBlockJSON = (
	block: DecodedBlock | Block,
	registeredSchema: RegisteredSchemas,
	metadata: ModuleMetadata[],
): DecodedBlockJSON => {
	const header = codec.toJSON<BlockHeaderJSON>(registeredSchema.header, block.header);
	const transactions = [];
	for (const transaction of block.transactions) {
		transactions.push(toTransactionJSON(transaction, registeredSchema, metadata));
	}
	const assets = [];
	for (const asset of block.assets) {
		assets.push(toBlockAssetJSON(header.version, asset, registeredSchema, metadata));
	}

	return {
		header: {
			...header,
			id: block.header.id.toString('hex'),
		},
		transactions,
		assets,
	};
};

export const decodeBlockJSON = (block: BlockJSON, metadata: ModuleMetadata[]): DecodedBlockJSON => {
	const transactions = [];
	for (const transaction of block.transactions) {
		const params = Buffer.from(transaction.params, 'hex');
		const paramsSchema = getTransactionParamsSchema(transaction, metadata);
		const paramsJSON = codec.decodeJSON<Record<string, unknown>>(paramsSchema, params);
		transactions.push({
			...transaction,
			params: paramsJSON,
		});
	}
	const assets = [];
	for (const asset of block.assets) {
		const dataSchema = getAssetDataSchema(block.header.version, asset, metadata);
		assets.push({
			...asset,
			data: codec.decodeJSON<Record<string, unknown>>(dataSchema, Buffer.from(asset.data, 'hex')),
		});
	}

	return {
		header: block.header,
		transactions,
		assets,
	};
};
