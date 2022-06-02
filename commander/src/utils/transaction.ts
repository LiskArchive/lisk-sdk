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
import { ModuleMetadata, RegisteredSchema, Transaction } from 'lisk-framework';

import { Schema } from '../types';
import { getDefaultPath } from './path';
import { isApplicationRunning } from './application';

export const getParamsSchema = (
	metadata: ModuleMetadata[],
	moduleID: number,
	commandID: number,
): Schema | undefined => {
	const moduleMeta = metadata.find(meta => meta.id === moduleID);
	if (!moduleMeta) {
		throw new Error(`ModuleID: ${moduleID} is not registered.`);
	}
	const commandMeta = moduleMeta.commands.find(meta => meta.id === commandID);
	if (!commandMeta) {
		throw new Error(`ModuleID: ${moduleID} CommandID: ${commandID} is not registered.`);
	}
	return commandMeta.params;
};

export const decodeTransaction = (
	schema: RegisteredSchema,
	metadata: ModuleMetadata[],
	transactionHexStr: string,
	apiClient?: liskApiClient.APIClient,
): Record<string, unknown> => {
	const transactionBytes = Buffer.from(transactionHexStr, 'hex');
	if (apiClient) {
		return apiClient.transaction.decode(transactionBytes);
	}
	const id = cryptography.hash(transactionBytes);
	const transaction = codec.decode<Transaction>(schema.transaction, transactionBytes);
	const paramsSchema = getParamsSchema(metadata, transaction.moduleID, transaction.commandID);
	const params = codec.decode<Record<string, unknown>>(paramsSchema as Schema, transaction.params);
	return {
		...transaction,
		params,
		id,
	};
};

export const encodeTransaction = (
	schema: RegisteredSchema,
	metadata: ModuleMetadata[],
	transaction: Record<string, unknown>,
	apiClient?: liskApiClient.APIClient,
): Buffer => {
	if (apiClient) {
		return apiClient.transaction.encode(transaction);
	}
	const paramsSchema = getParamsSchema(
		metadata,
		transaction.moduleID as number,
		transaction.commandID as number,
	);
	const paramsBytes = codec.encode(paramsSchema as Schema, transaction.params as object);
	const txBytes = codec.encode(schema.transaction, { ...transaction, params: paramsBytes });
	return txBytes;
};

export const transactionToJSON = (
	schema: RegisteredSchema,
	metadata: ModuleMetadata[],
	transaction: Record<string, unknown>,
	apiClient?: liskApiClient.APIClient,
): Record<string, unknown> => {
	if (apiClient) {
		return apiClient.transaction.toJSON(transaction);
	}
	const paramsSchema = getParamsSchema(
		metadata,
		transaction.moduleID as number,
		transaction.commandID as number,
	);
	const paramsJSON = codec.toJSON(paramsSchema as Schema, transaction.params as object);
	const { id, params, ...txWithoutParams } = transaction;
	const txJSON = codec.toJSON(schema.transaction, txWithoutParams);
	return {
		...txJSON,
		params: paramsJSON,
		id: Buffer.isBuffer(id) ? id.toString('hex') : undefined,
	};
};

export const getApiClient = async (
	appDataPath: string | undefined,
	name: string,
): Promise<liskApiClient.APIClient> => {
	const dataPath = appDataPath ?? getDefaultPath(name);

	if (!isApplicationRunning(dataPath)) {
		throw new Error(`Application at data path ${dataPath} is not running.`);
	}
	const client = await liskApiClient.createIPCClient(dataPath);
	return client;
};
