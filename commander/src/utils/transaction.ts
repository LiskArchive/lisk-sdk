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
import { TransactionJSON } from '@liskhq/lisk-chain';
import { ModuleMetadataJSON, RegisteredSchema } from 'lisk-framework';

import { Schema } from '../types';
import { getDefaultPath } from './path';
import { isApplicationRunning } from './application';

export const getParamsSchema = (
	metadata: ModuleMetadataJSON[],
	moduleID: string,
	commandID: string,
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
	metadata: ModuleMetadataJSON[],
	transactionHexStr: string,
) => {
	const transactionBytes = Buffer.from(transactionHexStr, 'hex');
	const id = cryptography.utils.hash(transactionBytes);
	const transaction = codec.decodeJSON<TransactionJSON>(schema.transaction, transactionBytes);
	const paramsSchema = getParamsSchema(metadata, transaction.moduleID, transaction.commandID);
	const params = codec.decodeJSON<Record<string, unknown>>(
		paramsSchema as Schema,
		Buffer.from(transaction.params, 'hex'),
	);
	return {
		...transaction,
		params,
		id: id.toString('hex'),
	};
};

export const encodeTransaction = (
	schema: RegisteredSchema,
	metadata: ModuleMetadataJSON[],
	transaction: Record<string, unknown>,
	apiClient?: liskApiClient.APIClient,
): Buffer => {
	if (apiClient) {
		return apiClient.transaction.encode(transaction);
	}
	const paramsSchema = getParamsSchema(
		metadata,
		(transaction.moduleID as Buffer).toString('hex'),
		(transaction.commandID as Buffer).toString('hex'),
	);
	const paramsBytes = codec.encode(paramsSchema as Schema, transaction.params as object);
	const txBytes = codec.encode(schema.transaction, { ...transaction, params: paramsBytes });
	return txBytes;
};

export const transactionToJSON = (
	schema: RegisteredSchema,
	metadata: ModuleMetadataJSON[],
	transaction: Record<string, unknown>,
	apiClient?: liskApiClient.APIClient,
): Record<string, unknown> => {
	if (apiClient) {
		return apiClient.transaction.toJSON(transaction);
	}
	const paramsSchema = getParamsSchema(
		metadata,
		(transaction.moduleID as Buffer).toString('hex'),
		(transaction.commandID as Buffer).toString('hex'),
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
