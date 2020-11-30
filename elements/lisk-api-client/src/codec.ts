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
import { hash } from '@liskhq/lisk-cryptography';
import { RegisteredSchemas } from './types';

export const getTransactionAssetSchema = (
	transaction: Record<string, unknown>,
	registeredSchema: RegisteredSchemas,
): Schema => {
	const txAssetSchema = registeredSchema.transactionsAssets.find(
		assetSchema =>
			assetSchema.moduleID === transaction.moduleID && assetSchema.assetID === transaction.assetID,
	);
	if (!txAssetSchema) {
		throw new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`ModuleID: ${transaction.moduleID} AssetID: ${transaction.assetID} is not registered.`,
		);
	}
	return txAssetSchema.schema;
};

export const decodeAccount = (
	encodedAccount: Buffer,
	registeredSchema: RegisteredSchemas,
): Record<string, unknown> => codec.decode(registeredSchema.account, encodedAccount);

export const decodeTransaction = (
	encodedTransaction: Buffer,
	registeredSchema: RegisteredSchemas,
): Record<string, unknown> => {
	const transaction = codec.decode<{
		[key: string]: unknown;
		asset: Buffer;
		moduleID: number;
		assetID: number;
	}>(registeredSchema.transaction, encodedTransaction);
	const assetSchema = getTransactionAssetSchema(transaction, registeredSchema);
	const asset = codec.decode(assetSchema, transaction.asset);
	const id = hash(encodedTransaction);
	return {
		...transaction,
		asset,
		id,
	};
};

export const encodeTransaction = (
	transaction: Record<string, unknown>,
	registeredSchema: RegisteredSchemas,
): Buffer => {
	const assetSchema = getTransactionAssetSchema(transaction, registeredSchema);
	const encodedAsset = codec.encode(assetSchema, transaction.asset as Record<string, unknown>);

	const decodedTransaction = codec.encode(registeredSchema.transaction, {
		...transaction,
		asset: encodedAsset,
	});

	return decodedTransaction;
};

export const decodeBlock = (
	encodedBlock: Buffer,
	registeredSchema: RegisteredSchemas,
): Record<string, unknown> => {
	const block = codec.decode<{ header: Buffer; payload: Buffer[] }>(
		registeredSchema.block,
		encodedBlock,
	);

	const header = codec.decode<{ [key: string]: unknown; version: number; asset: Buffer }>(
		registeredSchema.blockHeader,
		block.header,
	);
	const id = hash(block.header);
	const assetSchema = registeredSchema.blockHeadersAssets[header.version];
	if (!assetSchema) {
		throw new Error(`Block header asset version ${header.version} is not registered.`);
	}
	const asset = codec.decode(assetSchema, header.asset);
	const payload = [];
	for (const tx of block.payload) {
		payload.push(decodeTransaction(tx, registeredSchema));
	}

	return {
		header: {
			...header,
			asset,
			id,
		},
		payload,
	};
};

export const encodeBlock = (
	block: { header: Record<string, unknown>; payload: Record<string, unknown>[] },
	registeredSchema: RegisteredSchemas,
): Buffer => {
	const encodedPayload = block.payload.map(p => encodeTransaction(p, registeredSchema));
	const assetSchema = registeredSchema.blockHeadersAssets[block.header.version as number];
	if (!assetSchema) {
		throw new Error(
			`Block header asset version ${block.header.version as number} is not registered.`,
		);
	}
	const encodedBlockAsset = codec.encode(
		assetSchema,
		block.header.asset as Record<string, unknown>,
	);
	const encodedBlockHeader = codec.encode(registeredSchema.blockHeader, {
		...block.header,
		asset: encodedBlockAsset,
	});

	return codec.encode(registeredSchema.block, {
		header: encodedBlockHeader,
		payload: encodedPayload,
	});
};
