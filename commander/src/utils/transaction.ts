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
import * as liskApiClient from '@liskhq/lisk-api-client';
import * as cryptography from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { RegisteredSchema, Transaction } from 'lisk-framework';

import { Schema } from '../types';

export const getAssetSchema = (
	registeredSchema: RegisteredSchema,
	moduleID: number,
	assetID: number,
): Schema | undefined => {
	const transactionsAsset = registeredSchema.transactionsAssets.find(
		schema => schema.moduleID === moduleID && schema.assetID === assetID,
	);
	if (!transactionsAsset) {
		throw new Error(
			`Transaction moduleID:${moduleID} with assetID:${assetID} is not registered in the application.`,
		);
	}
	return transactionsAsset.schema;
};

export const decodeTransaction = (
	apiClient: liskApiClient.APIClient | undefined,
	schema: RegisteredSchema,
	transactionHexStr: string,
): Record<string, unknown> => {
	const transactionBytes = Buffer.from(transactionHexStr, 'hex');
	if (apiClient) {
		return apiClient.transaction.decode(transactionBytes);
	}
	const id = cryptography.hash(transactionBytes);
	const transaction = codec.decode<Transaction>(schema.transaction, transactionBytes);
	const assetSchema = getAssetSchema(schema, transaction.moduleID, transaction.assetID);
	const asset = codec.decode<Record<string, unknown>>(assetSchema as Schema, transaction.asset);
	return {
		...transaction,
		asset,
		id,
	};
};

export const encodeTransaction = (
	apiClient: liskApiClient.APIClient | undefined,
	schema: RegisteredSchema,
	transaction: Record<string, unknown>,
): Buffer => {
	if (apiClient) {
		return apiClient.transaction.encode(transaction);
	}
	const assetSchema = getAssetSchema(
		schema,
		transaction.moduleID as number,
		transaction.assetID as number,
	);
	const assetBytes = codec.encode(assetSchema as Schema, transaction.asset as object);
	const txBytes = codec.encode(schema.transaction, { ...transaction, asset: assetBytes });
	return txBytes;
};

export const transactionToJSON = (
	apiClient: liskApiClient.APIClient | undefined,
	schema: RegisteredSchema,
	transaction: Record<string, unknown>,
): Record<string, unknown> => {
	if (apiClient) {
		return apiClient.transaction.toJSON(transaction);
	}
	const assetSchema = getAssetSchema(
		schema,
		transaction.moduleID as number,
		transaction.assetID as number,
	);
	const assetJSON = codec.toJSON(assetSchema as Schema, transaction.asset as object);
	const { id, asset, ...txWithoutAsset } = transaction;
	const txJSON = codec.toJSON(schema.transaction, txWithoutAsset);
	return {
		...txJSON,
		asset: assetJSON,
		id: Buffer.isBuffer(id) ? id.toString('hex') : undefined,
	};
};
